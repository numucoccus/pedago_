-- Analyses table
CREATE TABLE public.analyses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL,
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  created_by uuid NOT NULL REFERENCES auth.users(id),
  type analysis_type NOT NULL,
  module module_key NOT NULL,
  title text NOT NULL,
  status analysis_status NOT NULL DEFAULT 'draft',
  input jsonb,
  settings jsonb,
  progress smallint NOT NULL DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),
  current_step text,
  attempt_count integer NOT NULL DEFAULT 0,
  idempotency_key text,
  prompt_version text,
  model_provider text,
  model_name text,
  started_at timestamptz,
  completed_at timestamptz,
  failure_code text,
  failure_message_safe text,
  approved_at timestamptz,
  approved_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE,
  UNIQUE (workspace_id, created_by, idempotency_key),
  CHECK (
    (type = 'research_gap' AND module = 'research') OR
    (type = 'research_evolution' AND module = 'research') OR
    (type = 'research_question' AND module = 'research') OR
    (type = 'research_decision' AND module = 'research') OR
    (type = 'teaching_pulse' AND module = 'teaching') OR
    (type = 'query_clustering' AND module = 'teaching') OR
    (type = 'exam_misconception' AND module = 'assessment') OR
    (type = 'student_portfolio' AND module = 'student') OR
    (type = 'lor_dossier' AND module = 'student') OR
    (type = 'curriculum_alignment' AND module = 'curriculum')
  )
);

ALTER TABLE public.analyses ENABLE ROW LEVEL SECURITY;

-- Analysis documents association
CREATE TABLE public.analysis_documents (
  analysis_id uuid NOT NULL REFERENCES public.analyses(id) ON DELETE CASCADE,
  document_id uuid NOT NULL REFERENCES public.documents(id) ON DELETE CASCADE,
  purpose text,
  PRIMARY KEY (analysis_id, document_id)
);

ALTER TABLE public.analysis_documents ENABLE ROW LEVEL SECURITY;

-- Analysis events for progress tracking and realtime updates
CREATE TABLE public.analysis_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL,
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  analysis_id uuid NOT NULL REFERENCES public.analyses(id) ON DELETE CASCADE,
  status analysis_status NOT NULL,
  progress smallint NOT NULL CHECK (progress >= 0 AND progress <= 100),
  message text,
  metadata jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE
);

ALTER TABLE public.analysis_events ENABLE ROW LEVEL SECURITY;

-- Findings from analyses
CREATE TABLE public.findings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL,
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  created_by uuid NOT NULL REFERENCES auth.users(id),
  analysis_id uuid NOT NULL REFERENCES public.analyses(id) ON DELETE CASCADE,
  title text NOT NULL,
  summary text,
  confidence confidence_level,
  limitations text[],
  requires_human_review boolean DEFAULT false,
  category text,
  metrics jsonb,
  sort_order integer,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE
);

ALTER TABLE public.findings ENABLE ROW LEVEL SECURITY;

-- Evidence items supporting findings
CREATE TABLE public.evidence_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL,
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  created_by uuid NOT NULL REFERENCES auth.users(id),
  analysis_id uuid NOT NULL REFERENCES public.analyses(id) ON DELETE CASCADE,
  source_type evidence_source_type NOT NULL,
  document_chunk_id uuid REFERENCES public.document_chunks(id) ON DELETE SET NULL,
  research_work_id uuid,
  external_source_url text,
  title text,
  locator jsonb,
  excerpt text,
  published_year integer,
  metadata jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE,
  CHECK (
    (source_type = 'document_chunk' AND document_chunk_id IS NOT NULL) OR
    (source_type = 'research_work' AND research_work_id IS NOT NULL) OR
    (source_type = 'external_dataset' AND external_source_url IS NOT NULL) OR
    (source_type = 'calculated_metric')
  )
);

ALTER TABLE public.evidence_items ENABLE ROW LEVEL SECURITY;

-- Finding-evidence relationship
CREATE TABLE public.finding_evidence (
  finding_id uuid NOT NULL REFERENCES public.findings(id) ON DELETE CASCADE,
  evidence_item_id uuid NOT NULL REFERENCES public.evidence_items(id) ON DELETE CASCADE,
  relation evidence_relation NOT NULL,
  PRIMARY KEY (finding_id, evidence_item_id)
);

ALTER TABLE public.finding_evidence ENABLE ROW LEVEL SECURITY;

-- Artifacts generated from analyses
CREATE TABLE public.artifacts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL,
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  created_by uuid NOT NULL REFERENCES auth.users(id),
  analysis_id uuid NOT NULL REFERENCES public.analyses(id) ON DELETE CASCADE,
  type artifact_type NOT NULL,
  status artifact_status NOT NULL DEFAULT 'draft',
  title text NOT NULL,
  content jsonb,
  content_text text,
  version integer NOT NULL DEFAULT 1,
  approved_at timestamptz,
  approved_by uuid REFERENCES auth.users(id),
  exported_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE
);

ALTER TABLE public.artifacts ENABLE ROW LEVEL SECURITY;

-- Artifact version history
CREATE TABLE public.artifact_versions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL,
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  artifact_id uuid NOT NULL REFERENCES public.artifacts(id) ON DELETE CASCADE,
  version integer NOT NULL,
  content jsonb,
  content_text text,
  edited_by uuid NOT NULL REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE,
  UNIQUE (artifact_id, version)
);

ALTER TABLE public.artifact_versions ENABLE ROW LEVEL SECURITY;

-- Create triggers for updated_at
CREATE TRIGGER analyses_updated_at
  BEFORE UPDATE ON public.analyses
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER findings_updated_at
  BEFORE UPDATE ON public.findings
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER evidence_items_updated_at
  BEFORE UPDATE ON public.evidence_items
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER artifacts_updated_at
  BEFORE UPDATE ON public.artifacts
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Indexes
CREATE INDEX idx_analyses_workspace_id ON public.analyses(workspace_id);
CREATE INDEX idx_analyses_status ON public.analyses(status);
CREATE INDEX idx_analyses_type ON public.analyses(type);
CREATE INDEX idx_analyses_created_at ON public.analyses(created_at);
CREATE INDEX idx_analyses_workspace_status_type_created ON public.analyses(workspace_id, status, type, created_at);
CREATE INDEX idx_analysis_documents_analysis_id ON public.analysis_documents(analysis_id);
CREATE INDEX idx_analysis_documents_document_id ON public.analysis_documents(document_id);
CREATE INDEX idx_analysis_events_analysis_id ON public.analysis_events(analysis_id);
CREATE INDEX idx_analysis_events_created_at ON public.analysis_events(created_at);
CREATE INDEX idx_analysis_events_workspace_analysis_created ON public.analysis_events(workspace_id, analysis_id, created_at);
CREATE INDEX idx_findings_analysis_id ON public.findings(analysis_id);
CREATE INDEX idx_findings_workspace_id ON public.findings(workspace_id);
CREATE INDEX idx_evidence_items_analysis_id ON public.evidence_items(analysis_id);
CREATE INDEX idx_evidence_items_document_chunk_id ON public.evidence_items(document_chunk_id);
CREATE INDEX idx_evidence_items_workspace_id ON public.evidence_items(workspace_id);
CREATE INDEX idx_finding_evidence_finding_id ON public.finding_evidence(finding_id);
CREATE INDEX idx_finding_evidence_evidence_item_id ON public.finding_evidence(evidence_item_id);
CREATE INDEX idx_artifacts_analysis_id ON public.artifacts(analysis_id);
CREATE INDEX idx_artifacts_workspace_id ON public.artifacts(workspace_id);
CREATE INDEX idx_artifact_versions_artifact_id ON public.artifact_versions(artifact_id);
CREATE INDEX idx_artifact_versions_workspace_id ON public.artifact_versions(workspace_id);
