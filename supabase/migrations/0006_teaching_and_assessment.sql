-- Feedback entries table
CREATE TABLE public.feedback_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL,
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  created_by uuid NOT NULL REFERENCES auth.users(id),
  course_id uuid NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  document_id uuid REFERENCES public.documents(id) ON DELETE SET NULL,
  source_kind feedback_source_kind NOT NULL,
  content text NOT NULL,
  is_anonymized boolean DEFAULT false,
  occurred_at timestamptz,
  topic_id uuid REFERENCES public.course_topics(id) ON DELETE SET NULL,
  sentiment_label text,
  confusion_score numeric(2,1) CHECK (confusion_score IS NULL OR (confusion_score >= 0 AND confusion_score <= 5)),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE,
  CHECK (source_kind != 'direct_student_feedback' OR source_kind NOT IN (
    SELECT source_kind FROM public.feedback_entries WHERE source_kind = 'ai_hypothesis'
  ))
);

ALTER TABLE public.feedback_entries ENABLE ROW LEVEL SECURITY;

-- Query messages from students
CREATE TABLE public.query_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL,
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  created_by uuid NOT NULL REFERENCES auth.users(id),
  course_id uuid NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  document_id uuid REFERENCES public.documents(id) ON DELETE SET NULL,
  external_message_id text,
  anonymized_content text NOT NULL,
  intent_kind text,
  occurred_at timestamptz,
  embedding vector(1536),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE
);

ALTER TABLE public.query_messages ENABLE ROW LEVEL SECURITY;

-- Query cluster centroids
CREATE TABLE public.query_clusters (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL,
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  created_by uuid NOT NULL REFERENCES auth.users(id),
  analysis_id uuid NOT NULL REFERENCES public.analyses(id) ON DELETE CASCADE,
  label text NOT NULL,
  description text,
  intent_kind text,
  message_count integer NOT NULL DEFAULT 0,
  course_topic_id uuid REFERENCES public.course_topics(id) ON DELETE SET NULL,
  centroid vector(1536),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE
);

ALTER TABLE public.query_clusters ENABLE ROW LEVEL SECURITY;

-- Query cluster membership
CREATE TABLE public.query_cluster_members (
  cluster_id uuid NOT NULL REFERENCES public.query_clusters(id) ON DELETE CASCADE,
  query_message_id uuid NOT NULL REFERENCES public.query_messages(id) ON DELETE CASCADE,
  similarity numeric(3,2),
  PRIMARY KEY (cluster_id, query_message_id)
);

ALTER TABLE public.query_cluster_members ENABLE ROW LEVEL SECURITY;

-- Exams
CREATE TABLE public.exams (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL,
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  created_by uuid NOT NULL REFERENCES auth.users(id),
  course_id uuid NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  title text NOT NULL,
  exam_date date,
  total_marks integer,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE
);

ALTER TABLE public.exams ENABLE ROW LEVEL SECURITY;

-- Exam questions
CREATE TABLE public.exam_questions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL,
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  created_by uuid NOT NULL REFERENCES auth.users(id),
  exam_id uuid NOT NULL REFERENCES public.exams(id) ON DELETE CASCADE,
  question_number integer NOT NULL,
  prompt text NOT NULL,
  maximum_marks integer,
  course_topic_id uuid REFERENCES public.course_topics(id) ON DELETE SET NULL,
  rubric jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE
);

ALTER TABLE public.exam_questions ENABLE ROW LEVEL SECURITY;

-- Student responses to exam questions
CREATE TABLE public.student_responses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL,
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  created_by uuid NOT NULL REFERENCES auth.users(id),
  exam_question_id uuid NOT NULL REFERENCES public.exam_questions(id) ON DELETE CASCADE,
  student_id uuid,
  anonymous_subject_key text,
  response_text text NOT NULL,
  awarded_marks numeric,
  feedback text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE,
  CHECK ((student_id IS NOT NULL AND anonymous_subject_key IS NULL) OR 
         (student_id IS NULL AND anonymous_subject_key IS NOT NULL))
);

ALTER TABLE public.student_responses ENABLE ROW LEVEL SECURITY;

-- Misconception clusters from exam analysis
CREATE TABLE public.misconception_clusters (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL,
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  created_by uuid NOT NULL REFERENCES auth.users(id),
  analysis_id uuid NOT NULL REFERENCES public.analyses(id) ON DELETE CASCADE,
  exam_question_id uuid NOT NULL REFERENCES public.exam_questions(id) ON DELETE CASCADE,
  label text NOT NULL,
  description text,
  response_count integer,
  error_rate numeric(5,2) CHECK (error_rate IS NULL OR (error_rate >= 0 AND error_rate <= 100)),
  root_cause_hypothesis text,
  confidence confidence_level,
  course_topic_id uuid REFERENCES public.course_topics(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE
);

ALTER TABLE public.misconception_clusters ENABLE ROW LEVEL SECURITY;

-- Create triggers for updated_at
CREATE TRIGGER feedback_entries_updated_at
  BEFORE UPDATE ON public.feedback_entries
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER query_messages_updated_at
  BEFORE UPDATE ON public.query_messages
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER query_clusters_updated_at
  BEFORE UPDATE ON public.query_clusters
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER exams_updated_at
  BEFORE UPDATE ON public.exams
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER exam_questions_updated_at
  BEFORE UPDATE ON public.exam_questions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER student_responses_updated_at
  BEFORE UPDATE ON public.student_responses
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER misconception_clusters_updated_at
  BEFORE UPDATE ON public.misconception_clusters
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Indexes
CREATE INDEX idx_feedback_entries_course_id ON public.feedback_entries(course_id);
CREATE INDEX idx_feedback_entries_workspace_id ON public.feedback_entries(workspace_id);
CREATE INDEX idx_feedback_entries_document_id ON public.feedback_entries(document_id);
CREATE INDEX idx_feedback_entries_topic_id ON public.feedback_entries(topic_id);
CREATE INDEX idx_query_messages_course_id ON public.query_messages(course_id);
CREATE INDEX idx_query_messages_workspace_id ON public.query_messages(workspace_id);
CREATE INDEX idx_query_messages_external_id ON public.query_messages(external_message_id);
CREATE INDEX idx_query_clusters_analysis_id ON public.query_clusters(analysis_id);
CREATE INDEX idx_query_clusters_workspace_id ON public.query_clusters(workspace_id);
CREATE INDEX idx_query_cluster_members_cluster_id ON public.query_cluster_members(cluster_id);
CREATE INDEX idx_query_cluster_members_message_id ON public.query_cluster_members(query_message_id);
CREATE INDEX idx_exams_course_id ON public.exams(course_id);
CREATE INDEX idx_exams_workspace_id ON public.exams(workspace_id);
CREATE INDEX idx_exam_questions_exam_id ON public.exam_questions(exam_id);
CREATE INDEX idx_exam_questions_workspace_id ON public.exam_questions(workspace_id);
CREATE INDEX idx_exam_questions_topic_id ON public.exam_questions(course_topic_id);
CREATE INDEX idx_student_responses_exam_question_id ON public.student_responses(exam_question_id);
CREATE INDEX idx_student_responses_workspace_id ON public.student_responses(workspace_id);
CREATE INDEX idx_student_responses_student_id ON public.student_responses(student_id);
CREATE INDEX idx_misconception_clusters_analysis_id ON public.misconception_clusters(analysis_id);
CREATE INDEX idx_misconception_clusters_exam_question_id ON public.misconception_clusters(exam_question_id);
CREATE INDEX idx_misconception_clusters_workspace_id ON public.misconception_clusters(workspace_id);
