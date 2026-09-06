-- Research queries table
CREATE TABLE public.research_queries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL,
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  created_by uuid NOT NULL REFERENCES auth.users(id),
  analysis_id uuid NOT NULL REFERENCES public.analyses(id) ON DELETE CASCADE,
  query_text text NOT NULL,
  source text,
  filters jsonb,
  executed_at timestamptz,
  result_count integer,
  error_code text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE
);

ALTER TABLE public.research_queries ENABLE ROW LEVEL SECURITY;

-- Research works table (global deduplication by DOI and external_id)
CREATE TABLE public.research_works (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source text NOT NULL,
  external_id text,
  doi text,
  title text NOT NULL,
  abstract text,
  authors jsonb,
  publication_year integer,
  venue text,
  citation_count integer,
  source_url text,
  retrieved_at timestamptz,
  metadata jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (source, external_id)
);

ALTER TABLE public.research_works ENABLE ROW LEVEL SECURITY;

-- Partial unique index for non-null DOIs
CREATE UNIQUE INDEX idx_research_works_doi_unique 
  ON public.research_works(doi) 
  WHERE doi IS NOT NULL;

-- Analysis-research works association
CREATE TABLE public.analysis_research_works (
  analysis_id uuid NOT NULL REFERENCES public.analyses(id) ON DELETE CASCADE,
  research_work_id uuid NOT NULL REFERENCES public.research_works(id) ON DELETE CASCADE,
  relevance_score numeric(3,2),
  relationship research_relationship,
  PRIMARY KEY (analysis_id, research_work_id)
);

ALTER TABLE public.analysis_research_works ENABLE ROW LEVEL SECURITY;

-- Research trend data points
CREATE TABLE public.research_trend_points (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL,
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  created_by uuid NOT NULL REFERENCES auth.users(id),
  analysis_id uuid NOT NULL REFERENCES public.analyses(id) ON DELETE CASCADE,
  year integer,
  dimension text,
  label text,
  value numeric,
  sample_size integer,
  metadata jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE
);

ALTER TABLE public.research_trend_points ENABLE ROW LEVEL SECURITY;

-- Research decision options
CREATE TABLE public.research_decision_options (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL,
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  created_by uuid NOT NULL REFERENCES auth.users(id),
  analysis_id uuid NOT NULL REFERENCES public.analyses(id) ON DELETE CASCADE,
  label text NOT NULL,
  description text,
  criteria_scores jsonb,
  weighted_score numeric,
  rank integer,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE
);

ALTER TABLE public.research_decision_options ENABLE ROW LEVEL SECURITY;

-- Create triggers for updated_at
CREATE TRIGGER research_queries_updated_at
  BEFORE UPDATE ON public.research_queries
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER research_works_updated_at
  BEFORE UPDATE ON public.research_works
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER research_trend_points_updated_at
  BEFORE UPDATE ON public.research_trend_points
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER research_decision_options_updated_at
  BEFORE UPDATE ON public.research_decision_options
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Indexes
CREATE INDEX idx_research_queries_analysis_id ON public.research_queries(analysis_id);
CREATE INDEX idx_research_queries_workspace_id ON public.research_queries(workspace_id);
CREATE INDEX idx_research_works_doi ON public.research_works(doi);
CREATE INDEX idx_research_works_external_id ON public.research_works(source, external_id);
CREATE INDEX idx_analysis_research_works_analysis_id ON public.analysis_research_works(analysis_id);
CREATE INDEX idx_analysis_research_works_research_work_id ON public.analysis_research_works(research_work_id);
CREATE INDEX idx_research_trend_points_analysis_id ON public.research_trend_points(analysis_id);
CREATE INDEX idx_research_trend_points_workspace_id ON public.research_trend_points(workspace_id);
CREATE INDEX idx_research_trend_points_year ON public.research_trend_points(year);
CREATE INDEX idx_research_decision_options_analysis_id ON public.research_decision_options(analysis_id);
CREATE INDEX idx_research_decision_options_workspace_id ON public.research_decision_options(workspace_id);
