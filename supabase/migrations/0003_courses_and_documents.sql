-- Courses table
CREATE TABLE public.courses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL,
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  created_by uuid NOT NULL REFERENCES auth.users(id),
  code text NOT NULL,
  title text NOT NULL,
  term text,
  academic_year text,
  description text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE
);

ALTER TABLE public.courses ENABLE ROW LEVEL SECURITY;

-- Course topics table (hierarchical)
CREATE TABLE public.course_topics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL,
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  created_by uuid NOT NULL REFERENCES auth.users(id),
  course_id uuid NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  parent_topic_id uuid REFERENCES public.course_topics(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  sequence_number integer,
  learning_outcomes text[],
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE
);

ALTER TABLE public.course_topics ENABLE ROW LEVEL SECURITY;

-- Documents table
CREATE TABLE public.documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL,
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  created_by uuid NOT NULL REFERENCES auth.users(id),
  course_id uuid REFERENCES public.courses(id) ON DELETE SET NULL,
  kind document_kind NOT NULL,
  title text NOT NULL,
  original_filename text,
  mime_type text,
  byte_size integer,
  storage_bucket text,
  storage_path text,
  status document_status NOT NULL DEFAULT 'pending_upload',
  content_hash text,
  language text,
  extraction_error_code text,
  retention_until timestamptz,
  contains_personal_data boolean DEFAULT false,
  deleted_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE,
  UNIQUE (workspace_id, content_hash, kind) WHERE deleted_at IS NULL
);

ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;

-- Document extractions table
CREATE TABLE public.document_extractions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL,
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  created_by uuid NOT NULL REFERENCES auth.users(id),
  document_id uuid NOT NULL REFERENCES public.documents(id) ON DELETE CASCADE,
  extractor text NOT NULL,
  extractor_version text,
  text_content text,
  metadata jsonb,
  started_at timestamptz,
  completed_at timestamptz,
  error_code text,
  error_message_safe text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE
);

ALTER TABLE public.document_extractions ENABLE ROW LEVEL SECURITY;

-- Document chunks table (for vector search)
CREATE TABLE public.document_chunks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL,
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  created_by uuid NOT NULL REFERENCES auth.users(id),
  document_id uuid NOT NULL REFERENCES public.documents(id) ON DELETE CASCADE,
  extraction_id uuid NOT NULL REFERENCES public.document_extractions(id) ON DELETE CASCADE,
  chunk_index integer NOT NULL,
  content text NOT NULL,
  token_count integer,
  locator jsonb,
  metadata jsonb,
  embedding vector(1536),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE,
  UNIQUE (document_id, extraction_id, chunk_index)
);

ALTER TABLE public.document_chunks ENABLE ROW LEVEL SECURITY;

-- Create triggers for updated_at
CREATE TRIGGER courses_updated_at
  BEFORE UPDATE ON public.courses
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER course_topics_updated_at
  BEFORE UPDATE ON public.course_topics
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER documents_updated_at
  BEFORE UPDATE ON public.documents
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER document_extractions_updated_at
  BEFORE UPDATE ON public.document_extractions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER document_chunks_updated_at
  BEFORE UPDATE ON public.document_chunks
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Indexes
CREATE INDEX idx_courses_workspace_id ON public.courses(workspace_id);
CREATE INDEX idx_courses_organization_id ON public.courses(organization_id);
CREATE INDEX idx_course_topics_course_id ON public.course_topics(course_id);
CREATE INDEX idx_course_topics_workspace_id ON public.course_topics(workspace_id);
CREATE INDEX idx_course_topics_parent_id ON public.course_topics(parent_topic_id);
CREATE INDEX idx_documents_workspace_id ON public.documents(workspace_id);
CREATE INDEX idx_documents_course_id ON public.documents(course_id);
CREATE INDEX idx_documents_status ON public.documents(status);
CREATE INDEX idx_documents_kind ON public.documents(kind);
CREATE INDEX idx_documents_workspace_status_kind ON public.documents(workspace_id, status, kind);
CREATE INDEX idx_document_extractions_document_id ON public.document_extractions(document_id);
CREATE INDEX idx_document_extractions_workspace_id ON public.document_extractions(workspace_id);
CREATE INDEX idx_document_chunks_document_id ON public.document_chunks(document_id);
CREATE INDEX idx_document_chunks_extraction_id ON public.document_chunks(extraction_id);
CREATE INDEX idx_document_chunks_workspace_id ON public.document_chunks(workspace_id);
-- Vector index for similarity search
CREATE INDEX idx_document_chunks_embedding ON public.document_chunks 
  USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);
