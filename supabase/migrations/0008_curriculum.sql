-- Industry sources (job market data)
CREATE TABLE public.industry_sources (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid,
  workspace_id uuid REFERENCES public.workspaces(id) ON DELETE CASCADE,
  created_by uuid NOT NULL REFERENCES auth.users(id),
  name text NOT NULL,
  source_type text NOT NULL,
  source_url text,
  terms_url text,
  retrieved_at timestamptz,
  metadata jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE
);

ALTER TABLE public.industry_sources ENABLE ROW LEVEL SECURITY;

-- Industry skill observations from job market datasets
CREATE TABLE public.industry_skill_observations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL,
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  created_by uuid NOT NULL REFERENCES auth.users(id),
  source_id uuid NOT NULL REFERENCES public.industry_sources(id) ON DELETE CASCADE,
  dataset_document_id uuid REFERENCES public.documents(id) ON DELETE SET NULL,
  sector text,
  skill text NOT NULL,
  normalized_skill text,
  frequency integer,
  sample_size integer,
  observed_at timestamptz,
  metadata jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE
);

ALTER TABLE public.industry_skill_observations ENABLE ROW LEVEL SECURITY;

-- Curriculum skill mappings (teaching/curriculum alignment analysis)
CREATE TABLE public.curriculum_skill_mappings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL,
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  created_by uuid NOT NULL REFERENCES auth.users(id),
  analysis_id uuid NOT NULL REFERENCES public.analyses(id) ON DELETE CASCADE,
  course_topic_id uuid REFERENCES public.course_topics(id) ON DELETE SET NULL,
  skill text NOT NULL,
  classification curriculum_classification NOT NULL,
  coverage_score numeric(3,2) CHECK (coverage_score IS NULL OR (coverage_score >= 0 AND coverage_score <= 1)),
  demand_score numeric(3,2) CHECK (demand_score IS NULL OR (demand_score >= 0 AND demand_score <= 1)),
  evidence_count integer DEFAULT 0,
  rationale text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE
);

ALTER TABLE public.curriculum_skill_mappings ENABLE ROW LEVEL SECURITY;

-- Curriculum recommendations derived from analysis
CREATE TABLE public.curriculum_recommendations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL,
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  created_by uuid NOT NULL REFERENCES auth.users(id),
  analysis_id uuid NOT NULL REFERENCES public.analyses(id) ON DELETE CASCADE,
  priority integer,
  title text NOT NULL,
  rationale text,
  estimated_hours numeric,
  placement text,
  recommendation_type text,
  content jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE
);

ALTER TABLE public.curriculum_recommendations ENABLE ROW LEVEL SECURITY;

-- Create triggers for updated_at
CREATE TRIGGER industry_sources_updated_at
  BEFORE UPDATE ON public.industry_sources
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER industry_skill_observations_updated_at
  BEFORE UPDATE ON public.industry_skill_observations
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER curriculum_skill_mappings_updated_at
  BEFORE UPDATE ON public.curriculum_skill_mappings
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER curriculum_recommendations_updated_at
  BEFORE UPDATE ON public.curriculum_recommendations
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Indexes
CREATE INDEX idx_industry_sources_workspace_id ON public.industry_sources(workspace_id);
CREATE INDEX idx_industry_skill_observations_source_id ON public.industry_skill_observations(source_id);
CREATE INDEX idx_industry_skill_observations_workspace_id ON public.industry_skill_observations(workspace_id);
CREATE INDEX idx_industry_skill_observations_skill ON public.industry_skill_observations(normalized_skill);
CREATE INDEX idx_curriculum_skill_mappings_analysis_id ON public.curriculum_skill_mappings(analysis_id);
CREATE INDEX idx_curriculum_skill_mappings_workspace_id ON public.curriculum_skill_mappings(workspace_id);
CREATE INDEX idx_curriculum_skill_mappings_topic_id ON public.curriculum_skill_mappings(course_topic_id);
CREATE INDEX idx_curriculum_skill_mappings_classification ON public.curriculum_skill_mappings(classification);
CREATE INDEX idx_curriculum_recommendations_analysis_id ON public.curriculum_recommendations(analysis_id);
CREATE INDEX idx_curriculum_recommendations_workspace_id ON public.curriculum_recommendations(workspace_id);
