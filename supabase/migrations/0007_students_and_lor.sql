-- Students table
CREATE TABLE public.students (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL,
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  created_by uuid NOT NULL REFERENCES auth.users(id),
  external_student_id text NOT NULL,
  display_name text,
  email citext,
  program text,
  cohort text,
  cgpa numeric(3,2),
  consent_status text,
  retention_until timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE,
  UNIQUE (workspace_id, external_student_id)
);

ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;

-- Achievements/certificates/credentials
CREATE TABLE public.achievements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL,
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  created_by uuid NOT NULL REFERENCES auth.users(id),
  student_id uuid NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  document_id uuid REFERENCES public.documents(id) ON DELETE SET NULL,
  title text NOT NULL,
  issuer text,
  achievement_date date,
  category text,
  level text,
  description text,
  verification_status verification_status DEFAULT 'extracted',
  verification_url text,
  verified_at timestamptz,
  verified_by uuid REFERENCES auth.users(id),
  extracted_fields jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE,
  CHECK (
    (verification_status != 'issuer_verified' AND verification_status != 'faculty_verified') 
    OR verified_by IS NOT NULL
  )
);

ALTER TABLE public.achievements ENABLE ROW LEVEL SECURITY;

-- Student activity metrics
CREATE TABLE public.student_activity_metrics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL,
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  created_by uuid NOT NULL REFERENCES auth.users(id),
  student_id uuid NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  period_start date,
  period_end date,
  metric text NOT NULL,
  value numeric,
  source_document_id uuid REFERENCES public.documents(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE
);

ALTER TABLE public.student_activity_metrics ENABLE ROW LEVEL SECURITY;

-- Scoring models
CREATE TABLE public.scoring_models (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL,
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  created_by uuid NOT NULL REFERENCES auth.users(id),
  name text NOT NULL,
  version integer NOT NULL DEFAULT 1,
  weights jsonb NOT NULL,
  is_active boolean DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE
);

ALTER TABLE public.scoring_models ENABLE ROW LEVEL SECURITY;

-- Student scores calculated by a scoring model
CREATE TABLE public.student_scores (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL,
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  created_by uuid NOT NULL REFERENCES auth.users(id),
  student_id uuid NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  analysis_id uuid NOT NULL REFERENCES public.analyses(id) ON DELETE CASCADE,
  scoring_model_id uuid NOT NULL REFERENCES public.scoring_models(id) ON DELETE RESTRICT,
  total_score numeric NOT NULL CHECK (total_score >= 0),
  component_scores jsonb,
  calculated_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE
);

ALTER TABLE public.student_scores ENABLE ROW LEVEL SECURITY;

-- Student risk signals
CREATE TABLE public.student_risk_signals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL,
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  created_by uuid NOT NULL REFERENCES auth.users(id),
  student_id uuid NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  analysis_id uuid NOT NULL REFERENCES public.analyses(id) ON DELETE CASCADE,
  signal_type text NOT NULL,
  severity text NOT NULL,
  description text,
  evidence jsonb,
  requires_human_review boolean DEFAULT true,
  reviewed_at timestamptz,
  reviewed_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE
);

ALTER TABLE public.student_risk_signals ENABLE ROW LEVEL SECURITY;

-- Target programs for Letter of Recommendation
CREATE TABLE public.target_programs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL,
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  created_by uuid NOT NULL REFERENCES auth.users(id),
  name text NOT NULL,
  institution text,
  program_type text,
  requirements jsonb,
  source_url text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE
);

ALTER TABLE public.target_programs ENABLE ROW LEVEL SECURITY;

-- Letter of Recommendation requests
CREATE TABLE public.lor_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL,
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  created_by uuid NOT NULL REFERENCES auth.users(id),
  student_id uuid NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  target_program_id uuid REFERENCES public.target_programs(id) ON DELETE SET NULL,
  analysis_id uuid NOT NULL REFERENCES public.analyses(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'draft',
  deadline timestamptz,
  faculty_notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE
);

ALTER TABLE public.lor_requests ENABLE ROW LEVEL SECURITY;

-- Create triggers for updated_at
CREATE TRIGGER students_updated_at
  BEFORE UPDATE ON public.students
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER achievements_updated_at
  BEFORE UPDATE ON public.achievements
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER student_activity_metrics_updated_at
  BEFORE UPDATE ON public.student_activity_metrics
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER scoring_models_updated_at
  BEFORE UPDATE ON public.scoring_models
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER student_scores_updated_at
  BEFORE UPDATE ON public.student_scores
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER student_risk_signals_updated_at
  BEFORE UPDATE ON public.student_risk_signals
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER target_programs_updated_at
  BEFORE UPDATE ON public.target_programs
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER lor_requests_updated_at
  BEFORE UPDATE ON public.lor_requests
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Indexes
CREATE INDEX idx_students_workspace_id ON public.students(workspace_id);
CREATE INDEX idx_students_external_id ON public.students(external_student_id);
CREATE INDEX idx_achievements_student_id ON public.achievements(student_id);
CREATE INDEX idx_achievements_workspace_id ON public.achievements(workspace_id);
CREATE INDEX idx_achievements_status ON public.achievements(verification_status);
CREATE INDEX idx_student_activity_metrics_student_id ON public.student_activity_metrics(student_id);
CREATE INDEX idx_student_activity_metrics_workspace_id ON public.student_activity_metrics(workspace_id);
CREATE INDEX idx_student_activity_metrics_period ON public.student_activity_metrics(period_start, period_end);
CREATE INDEX idx_scoring_models_workspace_id ON public.scoring_models(workspace_id);
CREATE INDEX idx_scoring_models_active ON public.scoring_models(is_active);
CREATE INDEX idx_student_scores_student_id ON public.student_scores(student_id);
CREATE INDEX idx_student_scores_analysis_id ON public.student_scores(analysis_id);
CREATE INDEX idx_student_scores_workspace_id ON public.student_scores(workspace_id);
CREATE INDEX idx_student_risk_signals_student_id ON public.student_risk_signals(student_id);
CREATE INDEX idx_student_risk_signals_analysis_id ON public.student_risk_signals(analysis_id);
CREATE INDEX idx_student_risk_signals_workspace_id ON public.student_risk_signals(workspace_id);
CREATE INDEX idx_target_programs_workspace_id ON public.target_programs(workspace_id);
CREATE INDEX idx_lor_requests_student_id ON public.lor_requests(student_id);
CREATE INDEX idx_lor_requests_analysis_id ON public.lor_requests(analysis_id);
CREATE INDEX idx_lor_requests_workspace_id ON public.lor_requests(workspace_id);
