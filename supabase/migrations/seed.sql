-- Seed data for Pedago AI demo environment
-- This data is intentionally synthetic and for testing purposes

-- Insert demo organization
INSERT INTO public.organizations (id, name, slug, created_by)
VALUES (
  'f47ac10b-58cc-4372-a567-0e02b2c3d479'::uuid,
  'Demo University',
  'demo-university',
  '00000000-0000-0000-0000-000000000001'::uuid
)
ON CONFLICT (id) DO NOTHING;

-- Insert demo workspace
INSERT INTO public.workspaces (
  id,
  organization_id,
  name,
  slug,
  description,
  settings,
  created_by
)
VALUES (
  'd47ac10b-58cc-4372-a567-0e02b2c3d480'::uuid,
  'f47ac10b-58cc-4372-a567-0e02b2c3d479'::uuid,
  'Computer Science Demo',
  'cs-demo',
  'Demo workspace for testing Pedago AI functionality',
  '{"is_demo": true, "demo_label": "Demo Workspace"}'::jsonb,
  '00000000-0000-0000-0000-000000000001'::uuid
)
ON CONFLICT (id) DO NOTHING;

-- Insert demo course
INSERT INTO public.courses (
  id,
  organization_id,
  workspace_id,
  created_by,
  code,
  title,
  term,
  academic_year,
  description
)
VALUES (
  'e47ac10b-58cc-4372-a567-0e02b2c3d481'::uuid,
  'f47ac10b-58cc-4372-a567-0e02b2c3d479'::uuid,
  'd47ac10b-58cc-4372-a567-0e02b2c3d480'::uuid,
  '00000000-0000-0000-0000-000000000001'::uuid,
  'CS101',
  'Introduction to Computer Science',
  'Spring 2024',
  '2023-2024',
  'Foundational course covering basic computer science concepts'
)
ON CONFLICT DO NOTHING;

-- Insert course topics
INSERT INTO public.course_topics (
  id,
  organization_id,
  workspace_id,
  created_by,
  course_id,
  title,
  description,
  sequence_number,
  learning_outcomes
)
VALUES
  (
    'a47ac10b-58cc-4372-a567-0e02b2c3d482'::uuid,
    'f47ac10b-58cc-4372-a567-0e02b2c3d479'::uuid,
    'd47ac10b-58cc-4372-a567-0e02b2c3d480'::uuid,
    '00000000-0000-0000-0000-000000000001'::uuid,
    'e47ac10b-58cc-4372-a567-0e02b2c3d481'::uuid,
    'Data Structures',
    'Fundamental data structures and their implementations',
    1,
    ARRAY['Understand arrays, linked lists, stacks', 'Implement basic data structures', 'Compare time/space complexity']
  ),
  (
    'b47ac10b-58cc-4372-a567-0e02b2c3d483'::uuid,
    'f47ac10b-58cc-4372-a567-0e02b2c3d479'::uuid,
    'd47ac10b-58cc-4372-a567-0e02b2c3d480'::uuid,
    '00000000-0000-0000-0000-000000000001'::uuid,
    'e47ac10b-58cc-4372-a567-0e02b2c3d481'::uuid,
    'Algorithms',
    'Algorithm design and analysis',
    2,
    ARRAY['Design efficient algorithms', 'Analyze complexity', 'Apply sorting and searching algorithms']
  )
ON CONFLICT DO NOTHING;

-- Insert demo documents
INSERT INTO public.documents (
  id,
  organization_id,
  workspace_id,
  created_by,
  course_id,
  kind,
  title,
  original_filename,
  mime_type,
  byte_size,
  storage_bucket,
  storage_path,
  status,
  content_hash,
  language,
  contains_personal_data
)
VALUES
  (
    'c47ac10b-58cc-4372-a567-0e02b2c3d484'::uuid,
    'f47ac10b-58cc-4372-a567-0e02b2c3d479'::uuid,
    'd47ac10b-58cc-4372-a567-0e02b2c3d480'::uuid,
    '00000000-0000-0000-0000-000000000001'::uuid,
    'e47ac10b-58cc-4372-a567-0e02b2c3d481'::uuid,
    'syllabus',
    'CS101 Syllabus',
    'CS101-Syllabus-Spring2024.pdf',
    'application/pdf',
    125000,
    'academic-documents',
    'f47ac10b-58cc-4372-a567-0e02b2c3d479/d47ac10b-58cc-4372-a567-0e02b2c3d480/c47ac10b-58cc-4372-a567-0e02b2c3d484/CS101-Syllabus-Spring2024.pdf',
    'ready',
    'sha256_demo_hash_1',
    'en',
    false
  ),
  (
    'd47ac10b-58cc-4372-a567-0e02b2c3d485'::uuid,
    'f47ac10b-58cc-4372-a567-0e02b2c3d479'::uuid,
    'd47ac10b-58cc-4372-a567-0e02b2c3d480'::uuid,
    '00000000-0000-0000-0000-000000000001'::uuid,
    'e47ac10b-58cc-4372-a567-0e02b2c3d481'::uuid,
    'lecture_slide',
    'Week 1: Introduction',
    'Lecture-Week1.pdf',
    'application/pdf',
    95000,
    'academic-documents',
    'f47ac10b-58cc-4372-a567-0e02b2c3d479/d47ac10b-58cc-4372-a567-0e02b2c3d480/d47ac10b-58cc-4372-a567-0e02b2c3d485/Lecture-Week1.pdf',
    'ready',
    'sha256_demo_hash_2',
    'en',
    false
  )
ON CONFLICT DO NOTHING;

-- Insert demo students
INSERT INTO public.students (
  id,
  organization_id,
  workspace_id,
  created_by,
  external_student_id,
  display_name,
  email,
  program,
  cohort,
  cgpa,
  consent_status
)
VALUES
  (
    'e47ac10b-58cc-4372-a567-0e02b2c3d486'::uuid,
    'f47ac10b-58cc-4372-a567-0e02b2c3d479'::uuid,
    'd47ac10b-58cc-4372-a567-0e02b2c3d480'::uuid,
    '00000000-0000-0000-0000-000000000001'::uuid,
    'STU001',
    'Alex Demo Student',
    'alex.demo@university.edu',
    'Computer Science',
    '2023',
    3.8,
    'granted'
  ),
  (
    'f47ac10b-58cc-4372-a567-0e02b2c3d487'::uuid,
    'f47ac10b-58cc-4372-a567-0e02b2c3d479'::uuid,
    'd47ac10b-58cc-4372-a567-0e02b2c3d480'::uuid,
    '00000000-0000-0000-0000-000000000001'::uuid,
    'STU002',
    'Jordan Demo Student',
    'jordan.demo@university.edu',
    'Computer Science',
    '2023',
    3.2,
    'granted'
  )
ON CONFLICT DO NOTHING;

-- Insert demo achievements
INSERT INTO public.achievements (
  id,
  organization_id,
  workspace_id,
  created_by,
  student_id,
  title,
  issuer,
  achievement_date,
  category,
  level,
  description,
  verification_status
)
VALUES
  (
    'a47ac10b-58cc-4372-a567-0e02b2c3d488'::uuid,
    'f47ac10b-58cc-4372-a567-0e02b2c3d479'::uuid,
    'd47ac10b-58cc-4372-a567-0e02b2c3d480'::uuid,
    '00000000-0000-0000-0000-000000000001'::uuid,
    'e47ac10b-58cc-4372-a567-0e02b2c3d486'::uuid,
    'Dean\'s List',
    'Demo University',
    '2024-01-15',
    'academic_honor',
    'high',
    'Achieved Dean\'s List status for Spring 2024',
    'extracted'
  )
ON CONFLICT DO NOTHING;

-- Insert demo exam
INSERT INTO public.exams (
  id,
  organization_id,
  workspace_id,
  created_by,
  course_id,
  title,
  exam_date,
  total_marks
)
VALUES (
  'b47ac10b-58cc-4372-a567-0e02b2c3d489'::uuid,
  'f47ac10b-58cc-4372-a567-0e02b2c3d479'::uuid,
  'd47ac10b-58cc-4372-a567-0e02b2c3d480'::uuid,
  '00000000-0000-0000-0000-000000000001'::uuid,
  'e47ac10b-58cc-4372-a567-0e02b2c3d481'::uuid,
  'Midterm Exam',
  '2024-03-15',
  100
)
ON CONFLICT DO NOTHING;

-- Insert demo exam questions
INSERT INTO public.exam_questions (
  id,
  organization_id,
  workspace_id,
  created_by,
  exam_id,
  question_number,
  prompt,
  maximum_marks,
  course_topic_id,
  rubric
)
VALUES
  (
    'c47ac10b-58cc-4372-a567-0e02b2c3d48a'::uuid,
    'f47ac10b-58cc-4372-a567-0e02b2c3d479'::uuid,
    'd47ac10b-58cc-4372-a567-0e02b2c3d480'::uuid,
    '00000000-0000-0000-0000-000000000001'::uuid,
    'b47ac10b-58cc-4372-a567-0e02b2c3d489'::uuid,
    1,
    'Explain the difference between a linked list and an array.',
    20,
    'a47ac10b-58cc-4372-a567-0e02b2c3d482'::uuid,
    '{"accuracy": 10, "clarity": 10}'::jsonb
  ),
  (
    'd47ac10b-58cc-4372-a567-0e02b2c3d48b'::uuid,
    'f47ac10b-58cc-4372-a567-0e02b2c3d479'::uuid,
    'd47ac10b-58cc-4372-a567-0e02b2c3d480'::uuid,
    '00000000-0000-0000-0000-000000000001'::uuid,
    'b47ac10b-58cc-4372-a567-0e02b2c3d489'::uuid,
    2,
    'Write pseudocode for binary search.',
    30,
    'b47ac10b-58cc-4372-a567-0e02b2c3d483'::uuid,
    '{"correctness": 20, "efficiency": 10}'::jsonb
  )
ON CONFLICT DO NOTHING;

-- Insert demo student responses
INSERT INTO public.student_responses (
  id,
  organization_id,
  workspace_id,
  created_by,
  exam_question_id,
  student_id,
  response_text,
  awarded_marks,
  feedback
)
VALUES
  (
    'e47ac10b-58cc-4372-a567-0e02b2c3d48c'::uuid,
    'f47ac10b-58cc-4372-a567-0e02b2c3d479'::uuid,
    'd47ac10b-58cc-4372-a567-0e02b2c3d480'::uuid,
    '00000000-0000-0000-0000-000000000001'::uuid,
    'c47ac10b-58cc-4372-a567-0e02b2c3d48a'::uuid,
    'e47ac10b-58cc-4372-a567-0e02b2c3d486'::uuid,
    'A linked list uses nodes with pointers, while arrays use contiguous memory. Linked lists are better for insertion/deletion but slower for access.',
    18,
    'Excellent understanding. Minor point: mention cache locality.'
  )
ON CONFLICT DO NOTHING;

-- Insert demo scoring model
INSERT INTO public.scoring_models (
  id,
  organization_id,
  workspace_id,
  created_by,
  name,
  version,
  weights,
  is_active
)
VALUES (
  'f47ac10b-58cc-4372-a567-0e02b2c3d48d'::uuid,
  'f47ac10b-58cc-4372-a567-0e02b2c3d479'::uuid,
  'd47ac10b-58cc-4372-a567-0e02b2c3d480'::uuid,
  '00000000-0000-0000-0000-000000000001'::uuid,
  'Holistic Performance',
  1,
  '{"exam_performance": 40, "assignments": 30, "participation": 20, "achievement": 10}'::jsonb,
  true
)
ON CONFLICT DO NOTHING;

-- Insert demo student score
INSERT INTO public.student_scores (
  id,
  organization_id,
  workspace_id,
  created_by,
  student_id,
  analysis_id,
  scoring_model_id,
  total_score,
  component_scores,
  calculated_at
)
SELECT
  'a47ac10b-58cc-4372-a567-0e02b2c3d48e'::uuid,
  'f47ac10b-58cc-4372-a567-0e02b2c3d479'::uuid,
  'd47ac10b-58cc-4372-a567-0e02b2c3d480'::uuid,
  '00000000-0000-0000-0000-000000000001'::uuid,
  'e47ac10b-58cc-4372-a567-0e02b2c3d486'::uuid,
  id,
  'f47ac10b-58cc-4372-a567-0e02b2c3d48d'::uuid,
  88.5,
  '{"exam_performance": 90, "assignments": 92, "participation": 85, "achievement": 95}'::jsonb,
  now()
FROM public.analyses
WHERE workspace_id = 'd47ac10b-58cc-4372-a567-0e02b2c3d480'::uuid
AND status = 'completed'
LIMIT 1
ON CONFLICT DO NOTHING;

-- Insert demo feedback
INSERT INTO public.feedback_entries (
  id,
  organization_id,
  workspace_id,
  created_by,
  course_id,
  source_kind,
  content,
  is_anonymized,
  occurred_at,
  topic_id,
  sentiment_label,
  confusion_score
)
VALUES
  (
    'b47ac10b-58cc-4372-a567-0e02b2c3d48f'::uuid,
    'f47ac10b-58cc-4372-a567-0e02b2c3d479'::uuid,
    'd47ac10b-58cc-4372-a567-0e02b2c3d480'::uuid,
    '00000000-0000-0000-0000-000000000001'::uuid,
    'e47ac10b-58cc-4372-a567-0e02b2c3d481'::uuid,
    'direct_student_feedback',
    'I found the data structures lecture very helpful.',
    true,
    now(),
    'a47ac10b-58cc-4372-a567-0e02b2c3d482'::uuid,
    'positive',
    1.0
  )
ON CONFLICT DO NOTHING;

-- Insert demo consent records
INSERT INTO public.consent_records (
  id,
  organization_id,
  workspace_id,
  created_by,
  student_id,
  purpose,
  status,
  granted_at
)
VALUES (
  'c47ac10b-58cc-4372-a567-0e02b2c3d490'::uuid,
  'f47ac10b-58cc-4372-a567-0e02b2c3d479'::uuid,
  'd47ac10b-58cc-4372-a567-0e02b2c3d480'::uuid,
  '00000000-0000-0000-0000-000000000001'::uuid,
  'e47ac10b-58cc-4372-a567-0e02b2c3d486'::uuid,
  'Academic analytics and performance improvement',
  'granted',
  now()
)
ON CONFLICT DO NOTHING;
