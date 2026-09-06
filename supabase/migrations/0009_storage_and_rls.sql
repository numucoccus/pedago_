-- Create private storage buckets
INSERT INTO storage.buckets (id, name, owner, public)
VALUES
  ('academic-documents', 'academic-documents', auth.uid(), false),
  ('student-evidence', 'student-evidence', auth.uid(), false),
  ('audio-notes', 'audio-notes', auth.uid(), false),
  ('generated-exports', 'generated-exports', auth.uid(), false)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for academic-documents bucket
CREATE POLICY "Users can upload academic documents to their workspace"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'academic-documents'
  AND auth.role() = 'authenticated'
  AND (storage.foldername(name))[1]::uuid IN (
    SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Users can read academic documents in their workspace"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'academic-documents'
  AND auth.role() = 'authenticated'
  AND (storage.foldername(name))[1]::uuid IN (
    SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Users can update academic documents in their workspace"
ON storage.objects FOR UPDATE
WITH CHECK (
  bucket_id = 'academic-documents'
  AND auth.role() = 'authenticated'
  AND (storage.foldername(name))[1]::uuid IN (
    SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Users can delete academic documents in their workspace"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'academic-documents'
  AND auth.role() = 'authenticated'
  AND (storage.foldername(name))[1]::uuid IN (
    SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()
  )
);

-- Storage policies for student-evidence bucket
CREATE POLICY "Users can upload student evidence to their workspace"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'student-evidence'
  AND auth.role() = 'authenticated'
  AND (storage.foldername(name))[1]::uuid IN (
    SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Users can read student evidence in their workspace"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'student-evidence'
  AND auth.role() = 'authenticated'
  AND (storage.foldername(name))[1]::uuid IN (
    SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Users can update student evidence in their workspace"
ON storage.objects FOR UPDATE
WITH CHECK (
  bucket_id = 'student-evidence'
  AND auth.role() = 'authenticated'
  AND (storage.foldername(name))[1]::uuid IN (
    SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Users can delete student evidence in their workspace"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'student-evidence'
  AND auth.role() = 'authenticated'
  AND (storage.foldername(name))[1]::uuid IN (
    SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()
  )
);

-- Storage policies for audio-notes bucket
CREATE POLICY "Users can upload audio notes to their workspace"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'audio-notes'
  AND auth.role() = 'authenticated'
  AND (storage.foldername(name))[1]::uuid IN (
    SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Users can read audio notes in their workspace"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'audio-notes'
  AND auth.role() = 'authenticated'
  AND (storage.foldername(name))[1]::uuid IN (
    SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Users can update audio notes in their workspace"
ON storage.objects FOR UPDATE
WITH CHECK (
  bucket_id = 'audio-notes'
  AND auth.role() = 'authenticated'
  AND (storage.foldername(name))[1]::uuid IN (
    SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Users can delete audio notes in their workspace"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'audio-notes'
  AND auth.role() = 'authenticated'
  AND (storage.foldername(name))[1]::uuid IN (
    SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()
  )
);

-- Storage policies for generated-exports bucket
CREATE POLICY "Users can upload exports to their workspace"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'generated-exports'
  AND auth.role() = 'authenticated'
  AND (storage.foldername(name))[1]::uuid IN (
    SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Users can read exports from their workspace"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'generated-exports'
  AND auth.role() = 'authenticated'
  AND (storage.foldername(name))[1]::uuid IN (
    SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Users can delete their exports"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'generated-exports'
  AND auth.role() = 'authenticated'
  AND (storage.foldername(name))[1]::uuid IN (
    SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()
  )
);

-- Row-Level Security Policies for Profiles
CREATE POLICY "Users can view their own profile"
ON public.profiles FOR SELECT
USING (id = auth.uid() OR auth.role() = 'service_role');

CREATE POLICY "Users can update their own profile"
ON public.profiles FOR UPDATE
USING (id = auth.uid())
WITH CHECK (id = auth.uid());

-- Row-Level Security for Organizations
CREATE POLICY "Users can view organizations they are members of"
ON public.organizations FOR SELECT
USING (
  auth.role() = 'service_role'
  OR EXISTS(
    SELECT 1 FROM public.organization_members
    WHERE organization_id = organizations.id
      AND user_id = auth.uid()
  )
);

-- Row-Level Security for Organization Members
CREATE POLICY "Users can view members of their organizations"
ON public.organization_members FOR SELECT
USING (
  auth.role() = 'service_role'
  OR EXISTS(
    SELECT 1 FROM public.organization_members om
    WHERE om.organization_id = organization_members.organization_id
      AND om.user_id = auth.uid()
  )
);

CREATE POLICY "Only org owners/admins can insert members"
ON public.organization_members FOR INSERT
WITH CHECK (
  auth.role() = 'service_role'
  OR public.has_workspace_role(
    (SELECT id FROM workspaces WHERE organization_id = organization_members.organization_id LIMIT 1),
    ARRAY['owner'::workspace_role, 'admin'::workspace_role]
  )
);

-- Row-Level Security for Workspaces
CREATE POLICY "Users can view workspaces they are members of"
ON public.workspaces FOR SELECT
USING (
  auth.role() = 'service_role'
  OR EXISTS(
    SELECT 1 FROM public.workspace_members
    WHERE workspace_id = workspaces.id
      AND user_id = auth.uid()
  )
);

CREATE POLICY "Admins can insert workspaces"
ON public.workspaces FOR INSERT
WITH CHECK (
  auth.role() = 'service_role'
  OR public.is_organization_member(organization_id)
);

-- Row-Level Security for Workspace Members
CREATE POLICY "Users can view workspace members"
ON public.workspace_members FOR SELECT
USING (
  auth.role() = 'service_role'
  OR EXISTS(
    SELECT 1 FROM public.workspace_members wm
    WHERE wm.workspace_id = workspace_members.workspace_id
      AND wm.user_id = auth.uid()
  )
);

-- Generic tenant-based RLS for all workspace-scoped tables
CREATE POLICY "Users can view workspace data"
ON public.courses FOR SELECT
USING (
  auth.role() = 'service_role'
  OR public.is_workspace_member(workspace_id)
);

CREATE POLICY "Users can view workspace data"
ON public.course_topics FOR SELECT
USING (
  auth.role() = 'service_role'
  OR public.is_workspace_member(workspace_id)
);

CREATE POLICY "Users can view workspace data"
ON public.documents FOR SELECT
USING (
  auth.role() = 'service_role'
  OR public.is_workspace_member(workspace_id)
);

CREATE POLICY "Users can view workspace data"
ON public.document_extractions FOR SELECT
USING (
  auth.role() = 'service_role'
  OR public.is_workspace_member(workspace_id)
);

CREATE POLICY "Users can view workspace data"
ON public.document_chunks FOR SELECT
USING (
  auth.role() = 'service_role'
  OR public.is_workspace_member(workspace_id)
);

CREATE POLICY "Users can view workspace data"
ON public.analyses FOR SELECT
USING (
  auth.role() = 'service_role'
  OR public.is_workspace_member(workspace_id)
);

CREATE POLICY "Users can view workspace data"
ON public.analysis_documents FOR SELECT
USING (
  auth.role() = 'service_role'
  OR EXISTS(
    SELECT 1 FROM public.analyses
    WHERE analyses.id = analysis_documents.analysis_id
      AND public.is_workspace_member(analyses.workspace_id)
  )
);

CREATE POLICY "Users can view workspace data"
ON public.analysis_events FOR SELECT
USING (
  auth.role() = 'service_role'
  OR public.is_workspace_member(workspace_id)
);

CREATE POLICY "Users can view workspace data"
ON public.findings FOR SELECT
USING (
  auth.role() = 'service_role'
  OR public.is_workspace_member(workspace_id)
);

CREATE POLICY "Users can view workspace data"
ON public.evidence_items FOR SELECT
USING (
  auth.role() = 'service_role'
  OR public.is_workspace_member(workspace_id)
);

CREATE POLICY "Users can view workspace data"
ON public.finding_evidence FOR SELECT
USING (
  auth.role() = 'service_role'
  OR EXISTS(
    SELECT 1 FROM public.findings
    WHERE findings.id = finding_evidence.finding_id
      AND public.is_workspace_member(findings.workspace_id)
  )
);

CREATE POLICY "Users can view workspace data"
ON public.artifacts FOR SELECT
USING (
  auth.role() = 'service_role'
  OR public.is_workspace_member(workspace_id)
);

CREATE POLICY "Users can view workspace data"
ON public.artifact_versions FOR SELECT
USING (
  auth.role() = 'service_role'
  OR public.is_workspace_member(workspace_id)
);

CREATE POLICY "Users can view workspace data"
ON public.research_queries FOR SELECT
USING (
  auth.role() = 'service_role'
  OR public.is_workspace_member(workspace_id)
);

CREATE POLICY "Users can view workspace data"
ON public.analysis_research_works FOR SELECT
USING (
  auth.role() = 'service_role'
  OR EXISTS(
    SELECT 1 FROM public.analyses
    WHERE analyses.id = analysis_research_works.analysis_id
      AND public.is_workspace_member(analyses.workspace_id)
  )
);

CREATE POLICY "Users can view workspace data"
ON public.research_trend_points FOR SELECT
USING (
  auth.role() = 'service_role'
  OR public.is_workspace_member(workspace_id)
);

CREATE POLICY "Users can view workspace data"
ON public.research_decision_options FOR SELECT
USING (
  auth.role() = 'service_role'
  OR public.is_workspace_member(workspace_id)
);

CREATE POLICY "Users can view workspace data"
ON public.feedback_entries FOR SELECT
USING (
  auth.role() = 'service_role'
  OR public.is_workspace_member(workspace_id)
);

CREATE POLICY "Users can view workspace data"
ON public.query_messages FOR SELECT
USING (
  auth.role() = 'service_role'
  OR public.is_workspace_member(workspace_id)
);

CREATE POLICY "Users can view workspace data"
ON public.query_clusters FOR SELECT
USING (
  auth.role() = 'service_role'
  OR public.is_workspace_member(workspace_id)
);

CREATE POLICY "Users can view workspace data"
ON public.query_cluster_members FOR SELECT
USING (
  auth.role() = 'service_role'
  OR EXISTS(
    SELECT 1 FROM public.query_clusters
    WHERE query_clusters.id = query_cluster_members.cluster_id
      AND public.is_workspace_member(query_clusters.workspace_id)
  )
);

CREATE POLICY "Users can view workspace data"
ON public.exams FOR SELECT
USING (
  auth.role() = 'service_role'
  OR public.is_workspace_member(workspace_id)
);

CREATE POLICY "Users can view workspace data"
ON public.exam_questions FOR SELECT
USING (
  auth.role() = 'service_role'
  OR public.is_workspace_member(workspace_id)
);

CREATE POLICY "Users can view workspace data"
ON public.student_responses FOR SELECT
USING (
  auth.role() = 'service_role'
  OR public.is_workspace_member(workspace_id)
);

CREATE POLICY "Users can view workspace data"
ON public.misconception_clusters FOR SELECT
USING (
  auth.role() = 'service_role'
  OR public.is_workspace_member(workspace_id)
);

CREATE POLICY "Users can view workspace data"
ON public.students FOR SELECT
USING (
  auth.role() = 'service_role'
  OR public.is_workspace_member(workspace_id)
);

CREATE POLICY "Users can view workspace data"
ON public.achievements FOR SELECT
USING (
  auth.role() = 'service_role'
  OR public.is_workspace_member(workspace_id)
);

CREATE POLICY "Users can view workspace data"
ON public.student_activity_metrics FOR SELECT
USING (
  auth.role() = 'service_role'
  OR public.is_workspace_member(workspace_id)
);

CREATE POLICY "Users can view workspace data"
ON public.scoring_models FOR SELECT
USING (
  auth.role() = 'service_role'
  OR public.is_workspace_member(workspace_id)
);

CREATE POLICY "Users can view workspace data"
ON public.student_scores FOR SELECT
USING (
  auth.role() = 'service_role'
  OR public.is_workspace_member(workspace_id)
);

CREATE POLICY "Users can view workspace data"
ON public.student_risk_signals FOR SELECT
USING (
  auth.role() = 'service_role'
  OR public.is_workspace_member(workspace_id)
);

CREATE POLICY "Users can view workspace data"
ON public.target_programs FOR SELECT
USING (
  auth.role() = 'service_role'
  OR public.is_workspace_member(workspace_id)
);

CREATE POLICY "Users can view workspace data"
ON public.lor_requests FOR SELECT
USING (
  auth.role() = 'service_role'
  OR public.is_workspace_member(workspace_id)
);

CREATE POLICY "Users can view workspace data"
ON public.industry_sources FOR SELECT
USING (
  auth.role() = 'service_role'
  OR workspace_id IS NULL
  OR public.is_workspace_member(workspace_id)
);

CREATE POLICY "Users can view workspace data"
ON public.industry_skill_observations FOR SELECT
USING (
  auth.role() = 'service_role'
  OR public.is_workspace_member(workspace_id)
);

CREATE POLICY "Users can view workspace data"
ON public.curriculum_skill_mappings FOR SELECT
USING (
  auth.role() = 'service_role'
  OR public.is_workspace_member(workspace_id)
);

CREATE POLICY "Users can view workspace data"
ON public.curriculum_recommendations FOR SELECT
USING (
  auth.role() = 'service_role'
  OR public.is_workspace_member(workspace_id)
);
