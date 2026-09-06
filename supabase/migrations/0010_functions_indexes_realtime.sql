-- Vector similarity search function (workspace-filtered)
CREATE OR REPLACE FUNCTION public.match_document_chunks(
  p_workspace_id uuid,
  p_query_embedding vector,
  p_match_count integer DEFAULT 10,
  p_document_ids uuid[] DEFAULT NULL
)
RETURNS TABLE (
  id uuid,
  document_id uuid,
  chunk_index integer,
  content text,
  similarity numeric,
  metadata jsonb
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Verify workspace membership for authenticated users
  IF auth.role() = 'authenticated' THEN
    IF NOT public.is_workspace_member(p_workspace_id) THEN
      RETURN;
    END IF;
  END IF;

  RETURN QUERY
  SELECT
    dc.id,
    dc.document_id,
    dc.chunk_index,
    dc.content,
    (1 - (dc.embedding <=> p_query_embedding))::numeric AS similarity,
    dc.metadata
  FROM public.document_chunks dc
  WHERE dc.workspace_id = p_workspace_id
    AND (p_document_ids IS NULL OR dc.document_id = ANY(p_document_ids))
    AND dc.embedding IS NOT NULL
  ORDER BY dc.embedding <=> p_query_embedding
  LIMIT p_match_count;
END;
$$;

-- Safe analysis status transition function
CREATE OR REPLACE FUNCTION public.transition_analysis_status(
  p_analysis_id uuid,
  p_new_status analysis_status
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_current_status analysis_status;
  v_allowed_transition boolean;
BEGIN
  SELECT status INTO v_current_status
  FROM public.analyses
  WHERE id = p_analysis_id;

  IF v_current_status IS NULL THEN
    RETURN false;
  END IF;

  -- Define valid transitions
  v_allowed_transition := (
    (v_current_status = 'draft' AND p_new_status IN ('queued', 'cancelled')) OR
    (v_current_status = 'queued' AND p_new_status IN ('extracting', 'cancelled')) OR
    (v_current_status = 'extracting' AND p_new_status IN ('indexing', 'failed', 'cancelled')) OR
    (v_current_status = 'indexing' AND p_new_status IN ('analyzing', 'failed', 'cancelled')) OR
    (v_current_status = 'analyzing' AND p_new_status IN ('completed', 'failed')) OR
    (v_current_status = 'completed' AND p_new_status IN ('draft')) OR
    (v_current_status = 'failed' AND p_new_status IN ('queued', 'draft'))
  );

  IF v_allowed_transition THEN
    UPDATE public.analyses
    SET status = p_new_status, updated_at = now()
    WHERE id = p_analysis_id;
    RETURN true;
  ELSE
    RETURN false;
  END IF;
END;
$$;

-- Claim idempotent analysis job
CREATE OR REPLACE FUNCTION public.claim_analysis_job(
  p_workspace_id uuid,
  p_idempotency_key text,
  p_analysis_type analysis_type,
  p_module module_key
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_analysis_id uuid;
BEGIN
  -- Try to find existing analysis with this idempotency key
  SELECT id INTO v_analysis_id
  FROM public.analyses
  WHERE workspace_id = p_workspace_id
    AND idempotency_key = p_idempotency_key
    AND type = p_analysis_type
    AND module = p_module
  FOR UPDATE SKIP LOCKED
  LIMIT 1;

  IF v_analysis_id IS NOT NULL THEN
    RETURN v_analysis_id;
  END IF;

  -- Create new analysis
  INSERT INTO public.analyses (
    workspace_id,
    organization_id,
    created_by,
    type,
    module,
    title,
    status,
    idempotency_key
  )
  SELECT
    p_workspace_id,
    w.organization_id,
    auth.uid(),
    p_analysis_type,
    p_module,
    p_analysis_type::text,
    'queued'::analysis_status,
    p_idempotency_key
  FROM public.workspaces w
  WHERE w.id = p_workspace_id
  RETURNING id INTO v_analysis_id;

  RETURN v_analysis_id;
END;
$$;

-- Validate scoring model weights sum to 100
CREATE OR REPLACE FUNCTION public.validate_scoring_weights(p_weights jsonb)
RETURNS boolean
LANGUAGE plpgsql
AS $$
DECLARE
  v_total numeric := 0;
  v_key text;
BEGIN
  FOR v_key IN SELECT jsonb_object_keys(p_weights)
  LOOP
    v_total := v_total + (p_weights->v_key)::numeric;
  END LOOP;

  RETURN v_total = 100;
END;
$$;

-- Add check constraint for scoring models
ALTER TABLE public.scoring_models
ADD CONSTRAINT valid_weights CHECK (public.validate_scoring_weights(weights));

-- Enable Realtime for specific tables
ALTER PUBLICATION supabase_realtime ADD TABLE public.analyses;
ALTER PUBLICATION supabase_realtime ADD TABLE public.analysis_events;
ALTER PUBLICATION supabase_realtime ADD TABLE public.artifacts;

-- Create comprehensive indexes on all foreign keys used in joins
CREATE INDEX idx_course_topics_course_fk ON public.course_topics(course_id);
CREATE INDEX idx_documents_course_fk ON public.documents(course_id);
CREATE INDEX idx_document_extractions_document_fk ON public.document_extractions(document_id);
CREATE INDEX idx_document_chunks_document_fk ON public.document_chunks(document_id);
CREATE INDEX idx_document_chunks_extraction_fk ON public.document_chunks(extraction_id);

CREATE INDEX idx_analyses_last_event ON public.analyses(id, completed_at DESC NULLS LAST);
CREATE INDEX idx_analysis_documents_document_fk ON public.analysis_documents(document_id);
CREATE INDEX idx_findings_analysis_fk ON public.findings(analysis_id);
CREATE INDEX idx_evidence_items_analysis_fk ON public.evidence_items(analysis_id);
CREATE INDEX idx_evidence_items_chunk_fk ON public.evidence_items(document_chunk_id);
CREATE INDEX idx_evidence_items_research_fk ON public.evidence_items(research_work_id);
CREATE INDEX idx_finding_evidence_evidence_fk ON public.finding_evidence(evidence_item_id);
CREATE INDEX idx_artifacts_analysis_fk ON public.artifacts(analysis_id);
CREATE INDEX idx_artifact_versions_artifact_fk ON public.artifact_versions(artifact_id);

CREATE INDEX idx_research_queries_analysis_fk ON public.research_queries(analysis_id);
CREATE INDEX idx_analysis_research_work_fk ON public.analysis_research_works(research_work_id);
CREATE INDEX idx_research_trend_analysis_fk ON public.research_trend_points(analysis_id);
CREATE INDEX idx_research_decision_analysis_fk ON public.research_decision_options(analysis_id);

CREATE INDEX idx_feedback_course_fk ON public.feedback_entries(course_id);
CREATE INDEX idx_feedback_document_fk ON public.feedback_entries(document_id);
CREATE INDEX idx_feedback_topic_fk ON public.feedback_entries(topic_id);
CREATE INDEX idx_query_message_course_fk ON public.query_messages(course_id);
CREATE INDEX idx_query_message_document_fk ON public.query_messages(document_id);
CREATE INDEX idx_query_cluster_analysis_fk ON public.query_clusters(analysis_id);
CREATE INDEX idx_query_cluster_topic_fk ON public.query_clusters(course_topic_id);
CREATE INDEX idx_query_member_message_fk ON public.query_cluster_members(query_message_id);
CREATE INDEX idx_exam_course_fk ON public.exams(course_id);
CREATE INDEX idx_exam_question_exam_fk ON public.exam_questions(exam_id);
CREATE INDEX idx_exam_question_topic_fk ON public.exam_questions(course_topic_id);
CREATE INDEX idx_student_response_question_fk ON public.student_responses(exam_question_id);
CREATE INDEX idx_misconception_analysis_fk ON public.misconception_clusters(analysis_id);
CREATE INDEX idx_misconception_question_fk ON public.misconception_clusters(exam_question_id);
CREATE INDEX idx_misconception_topic_fk ON public.misconception_clusters(course_topic_id);

CREATE INDEX idx_achievement_student_fk ON public.achievements(student_id);
CREATE INDEX idx_achievement_document_fk ON public.achievements(document_id);
CREATE INDEX idx_achievement_verifier_fk ON public.achievements(verified_by);
CREATE INDEX idx_activity_student_fk ON public.student_activity_metrics(student_id);
CREATE INDEX idx_activity_document_fk ON public.student_activity_metrics(source_document_id);
CREATE INDEX idx_score_student_fk ON public.student_scores(student_id);
CREATE INDEX idx_score_analysis_fk ON public.student_scores(analysis_id);
CREATE INDEX idx_score_model_fk ON public.student_scores(scoring_model_id);
CREATE INDEX idx_signal_student_fk ON public.student_risk_signals(student_id);
CREATE INDEX idx_signal_analysis_fk ON public.student_risk_signals(analysis_id);
CREATE INDEX idx_signal_reviewer_fk ON public.student_risk_signals(reviewed_by);
CREATE INDEX idx_lor_student_fk ON public.lor_requests(student_id);
CREATE INDEX idx_lor_program_fk ON public.lor_requests(target_program_id);
CREATE INDEX idx_lor_analysis_fk ON public.lor_requests(analysis_id);

CREATE INDEX idx_industry_observation_source_fk ON public.industry_skill_observations(source_id);
CREATE INDEX idx_industry_observation_document_fk ON public.industry_skill_observations(dataset_document_id);
CREATE INDEX idx_skill_mapping_topic_fk ON public.curriculum_skill_mappings(course_topic_id);
CREATE INDEX idx_skill_mapping_analysis_fk ON public.curriculum_skill_mappings(analysis_id);
CREATE INDEX idx_curriculum_rec_analysis_fk ON public.curriculum_recommendations(analysis_id);

-- Check constraint indexes
CREATE INDEX idx_analyses_approval_when_needed ON public.analyses(approved_by) 
  WHERE approved_at IS NOT NULL;

CREATE INDEX idx_achievements_verification ON public.achievements(verified_by) 
  WHERE verified_at IS NOT NULL;

CREATE INDEX idx_student_responses_marks ON public.student_responses(awarded_marks) 
  WHERE awarded_marks IS NOT NULL;

CREATE INDEX idx_retention_dates ON public.documents(retention_until);
CREATE INDEX idx_consent_status ON public.consent_records(status);
CREATE INDEX idx_retention_jobs_schedule ON public.retention_jobs(scheduled_for);
