-- Audit events table for compliance and accountability
CREATE TABLE public.audit_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE RESTRICT,
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE RESTRICT,
  actor_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  action text NOT NULL,
  entity_type text NOT NULL,
  entity_id uuid,
  request_id text,
  metadata jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.audit_events ENABLE ROW LEVEL SECURITY;

-- Consent records for FERPA/GDPR compliance
CREATE TABLE public.consent_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL,
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  created_by uuid NOT NULL REFERENCES auth.users(id),
  student_id uuid NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  purpose text NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  granted_at timestamptz,
  withdrawn_at timestamptz,
  metadata jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE
);

ALTER TABLE public.consent_records ENABLE ROW LEVEL SECURITY;

-- Retention and deletion jobs
CREATE TABLE public.retention_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL,
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  entity_type text NOT NULL,
  entity_id uuid NOT NULL,
  scheduled_for timestamptz NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  completed_at timestamptz,
  failure_code text,
  created_at timestamptz NOT NULL DEFAULT now(),
  FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE
);

ALTER TABLE public.retention_jobs ENABLE ROW LEVEL SECURITY;

-- Create triggers for updated_at
CREATE TRIGGER consent_records_updated_at
  BEFORE UPDATE ON public.consent_records
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Audit and compliance indexes
CREATE INDEX idx_audit_events_organization_id ON public.audit_events(organization_id);
CREATE INDEX idx_audit_events_workspace_id ON public.audit_events(workspace_id);
CREATE INDEX idx_audit_events_actor_id ON public.audit_events(actor_id);
CREATE INDEX idx_audit_events_created_at ON public.audit_events(created_at);
CREATE INDEX idx_audit_events_entity ON public.audit_events(entity_type, entity_id);
CREATE INDEX idx_audit_events_workspace_created ON public.audit_events(workspace_id, created_at);
CREATE INDEX idx_audit_events_actor_created ON public.audit_events(actor_id, created_at);

CREATE INDEX idx_consent_records_student_id ON public.consent_records(student_id);
CREATE INDEX idx_consent_records_workspace_id ON public.consent_records(workspace_id);
CREATE INDEX idx_consent_records_status ON public.consent_records(status);

CREATE INDEX idx_retention_jobs_scheduled ON public.retention_jobs(scheduled_for);
CREATE INDEX idx_retention_jobs_status ON public.retention_jobs(status);
CREATE INDEX idx_retention_jobs_entity ON public.retention_jobs(entity_type, entity_id);
CREATE INDEX idx_retention_jobs_workspace_scheduled ON public.retention_jobs(workspace_id, scheduled_for);

-- Row-Level Security for Audit Events
CREATE POLICY "Audit events are immutable and org-scoped"
ON public.audit_events FOR SELECT
USING (
  auth.role() = 'service_role'
  OR EXISTS(
    SELECT 1 FROM public.organization_members
    WHERE organization_id = audit_events.organization_id
      AND user_id = auth.uid()
      AND role IN ('owner'::workspace_role, 'admin'::workspace_role)
  )
);

-- Row-Level Security for Consent Records
CREATE POLICY "Users can view consent records in their workspace"
ON public.consent_records FOR SELECT
USING (
  auth.role() = 'service_role'
  OR public.is_workspace_member(workspace_id)
);

-- Row-Level Security for Retention Jobs
CREATE POLICY "Users can view retention jobs in their workspace"
ON public.retention_jobs FOR SELECT
USING (
  auth.role() = 'service_role'
  OR public.is_workspace_member(workspace_id)
);

-- Function to record audit events
CREATE OR REPLACE FUNCTION public.audit_log(
  p_organization_id uuid,
  p_workspace_id uuid,
  p_action text,
  p_entity_type text,
  p_entity_id uuid DEFAULT NULL,
  p_request_id text DEFAULT NULL,
  p_metadata jsonb DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_audit_id uuid;
BEGIN
  INSERT INTO public.audit_events (
    organization_id,
    workspace_id,
    actor_id,
    action,
    entity_type,
    entity_id,
    request_id,
    metadata
  )
  VALUES (
    p_organization_id,
    p_workspace_id,
    auth.uid(),
    p_action,
    p_entity_type,
    p_entity_id,
    p_request_id,
    p_metadata
  )
  RETURNING id INTO v_audit_id;

  RETURN v_audit_id;
END;
$$;

-- Function to schedule document retention
CREATE OR REPLACE FUNCTION public.schedule_document_retention(
  p_document_id uuid,
  p_retention_days integer DEFAULT 30
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_org_id uuid;
  v_workspace_id uuid;
BEGIN
  SELECT organization_id, workspace_id
  INTO v_org_id, v_workspace_id
  FROM public.documents
  WHERE id = p_document_id;

  IF v_org_id IS NULL THEN
    RETURN;
  END IF;

  INSERT INTO public.retention_jobs (
    organization_id,
    workspace_id,
    entity_type,
    entity_id,
    scheduled_for
  )
  VALUES (
    v_org_id,
    v_workspace_id,
    'document',
    p_document_id,
    now() + (p_retention_days || ' days')::interval
  )
  ON CONFLICT DO NOTHING;

  UPDATE public.documents
  SET retention_until = now() + (p_retention_days || ' days')::interval
  WHERE id = p_document_id;
END;
$$;

-- Constraint to prevent medical diagnoses in risk signals
CREATE OR REPLACE FUNCTION public.validate_risk_signal_description()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  -- Simple check - can be enhanced with more sophisticated NLP/pattern matching
  IF NEW.description ILIKE '%diagnosis%'
    OR NEW.description ILIKE '%disease%'
    OR NEW.description ILIKE '%condition%'
    OR NEW.description ILIKE '%disorder%' THEN
    RAISE EXCEPTION 'Medical diagnoses cannot be stored in risk signals';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER check_risk_signal_description
  BEFORE INSERT OR UPDATE ON public.student_risk_signals
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_risk_signal_description();

-- Constraint to ensure unique constraint for active documents by hash
CREATE OR REPLACE FUNCTION public.validate_document_uniqueness()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  v_count integer;
BEGIN
  IF NEW.deleted_at IS NULL AND NEW.content_hash IS NOT NULL THEN
    SELECT COUNT(*) INTO v_count
    FROM public.documents
    WHERE workspace_id = NEW.workspace_id
      AND content_hash = NEW.content_hash
      AND kind = NEW.kind
      AND deleted_at IS NULL
      AND id != NEW.id;
    
    IF v_count > 0 THEN
      RAISE EXCEPTION 'Document with same content hash and kind already exists in workspace';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER check_document_uniqueness
  BEFORE INSERT OR UPDATE ON public.documents
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_document_uniqueness();

-- Views for common audit queries
CREATE OR REPLACE VIEW public.recent_workspace_activity AS
SELECT
  ae.workspace_id,
  ae.actor_id,
  ae.action,
  ae.entity_type,
  ae.created_at,
  p.display_name as actor_name
FROM public.audit_events ae
LEFT JOIN public.profiles p ON ae.actor_id = p.id
WHERE ae.created_at > now() - interval '7 days'
ORDER BY ae.created_at DESC;

CREATE OR REPLACE VIEW public.pending_retention_tasks AS
SELECT
  rj.id,
  rj.workspace_id,
  rj.entity_type,
  rj.entity_id,
  rj.scheduled_for,
  rj.status
FROM public.retention_jobs rj
WHERE rj.status = 'pending'
  AND rj.scheduled_for <= now()
ORDER BY rj.scheduled_for;

-- Row-Level Security for views
GRANT SELECT ON public.recent_workspace_activity TO authenticated;
GRANT SELECT ON public.pending_retention_tasks TO authenticated;
