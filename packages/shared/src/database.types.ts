export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type UserRole = 'system_admin' | 'faculty' | 'student' | 'reviewer';
export type WorkspaceRole = 'owner' | 'admin' | 'faculty' | 'reviewer';
export type ModuleKey = 'research' | 'teaching' | 'assessment' | 'student' | 'curriculum';

export type AnalysisType =
  | 'research_gap'
  | 'research_evolution'
  | 'research_question'
  | 'research_decision'
  | 'teaching_pulse'
  | 'query_clustering'
  | 'exam_misconception'
  | 'student_portfolio'
  | 'lor_dossier'
  | 'curriculum_alignment';

export type AnalysisStatus =
  | 'draft'
  | 'queued'
  | 'extracting'
  | 'indexing'
  | 'analyzing'
  | 'completed'
  | 'failed'
  | 'cancelled';

export type FindingConfidence = 'low' | 'medium' | 'high';
export type VerificationStatus = 'extracted' | 'student_submitted' | 'issuer_verified' | 'faculty_verified' | 'unverified';
export type DocumentProcessingStatus = 'pending' | 'extracting' | 'indexed' | 'failed';
export type VerdictType = 'supported' | 'partially_supported' | 'not_supported' | 'insufficient_evidence';

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          email: string;
          full_name: string | null;
          avatar_url: string | null;
          role: UserRole;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          email: string;
          full_name?: string | null;
          avatar_url?: string | null;
          role?: UserRole;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          email?: string;
          full_name?: string | null;
          avatar_url?: string | null;
          role?: UserRole;
          created_at?: string;
          updated_at?: string;
        };
      };
      organizations: {
        Row: {
          id: string;
          name: string;
          slug: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          slug: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          slug?: string;
          created_at?: string;
          updated_at?: string;
        };
      };
      organization_members: {
        Row: {
          id: string;
          organization_id: string;
          user_id: string;
          role: UserRole;
          created_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          user_id: string;
          role?: UserRole;
          created_at?: string;
        };
        Update: {
          id?: string;
          organization_id?: string;
          user_id?: string;
          role?: UserRole;
          created_at?: string;
        };
      };
      workspaces: {
        Row: {
          id: string;
          organization_id: string;
          name: string;
          slug: string;
          description: string | null;
          settings: Json;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          name: string;
          slug: string;
          description?: string | null;
          settings?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          organization_id?: string;
          name?: string;
          slug?: string;
          description?: string | null;
          settings?: Json;
          created_at?: string;
          updated_at?: string;
        };
      };
      workspace_members: {
        Row: {
          id: string;
          workspace_id: string;
          user_id: string;
          role: WorkspaceRole;
          created_at: string;
        };
        Insert: {
          id?: string;
          workspace_id: string;
          user_id: string;
          role?: WorkspaceRole;
          created_at?: string;
        };
        Update: {
          id?: string;
          workspace_id?: string;
          user_id?: string;
          role?: WorkspaceRole;
          created_at?: string;
        };
      };
      courses: {
        Row: {
          id: string;
          workspace_id: string;
          code: string;
          title: string;
          description: string | null;
          term: string | null;
          academic_year: string | null;
          learning_outcomes: Json;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          workspace_id: string;
          code: string;
          title: string;
          description?: string | null;
          term?: string | null;
          academic_year?: string | null;
          learning_outcomes?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          workspace_id?: string;
          code?: string;
          title?: string;
          description?: string | null;
          term?: string | null;
          academic_year?: string | null;
          learning_outcomes?: Json;
          created_at?: string;
          updated_at?: string;
        };
      };
      documents: {
        Row: {
          id: string;
          workspace_id: string;
          uploaded_by: string;
          title: string;
          file_path: string;
          file_name: string;
          mime_type: string;
          size_bytes: number;
          content_hash: string | null;
          purpose: string | null;
          status: DocumentProcessingStatus;
          metadata: Json;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          workspace_id: string;
          uploaded_by: string;
          title: string;
          file_path: string;
          file_name: string;
          mime_type: string;
          size_bytes: number;
          content_hash?: string | null;
          purpose?: string | null;
          status?: DocumentProcessingStatus;
          metadata?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          workspace_id?: string;
          uploaded_by?: string;
          title?: string;
          file_path?: string;
          file_name?: string;
          mime_type?: string;
          size_bytes?: number;
          content_hash?: string | null;
          purpose?: string | null;
          status?: DocumentProcessingStatus;
          metadata?: Json;
          created_at?: string;
          updated_at?: string;
        };
      };
      document_chunks: {
        Row: {
          id: string;
          document_id: string;
          workspace_id: string;
          chunk_index: number;
          content: string;
          locator: string | null;
          page_number: number | null;
          metadata: Json;
          embedding: number[] | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          document_id: string;
          workspace_id: string;
          chunk_index: number;
          content: string;
          locator?: string | null;
          page_number?: number | null;
          metadata?: Json;
          embedding?: number[] | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          document_id?: string;
          workspace_id?: string;
          chunk_index?: number;
          content?: string;
          locator?: string | null;
          page_number?: number | null;
          metadata?: Json;
          embedding?: number[] | null;
          created_at?: string;
        };
      };
      analyses: {
        Row: {
          id: string;
          workspace_id: string;
          created_by: string;
          module: ModuleKey;
          type: AnalysisType;
          title: string;
          status: AnalysisStatus;
          progress_percent: number;
          error_message: string | null;
          error_code: string | null;
          input: Json;
          settings: Json;
          results: Json;
          approved_at: string | null;
          approved_by: string | null;
          idempotency_key: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          workspace_id: string;
          created_by: string;
          module: ModuleKey;
          type: AnalysisType;
          title: string;
          status?: AnalysisStatus;
          progress_percent?: number;
          error_message?: string | null;
          error_code?: string | null;
          input?: Json;
          settings?: Json;
          results?: Json;
          approved_at?: string | null;
          approved_by?: string | null;
          idempotency_key?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          workspace_id?: string;
          created_by?: string;
          module?: ModuleKey;
          type?: AnalysisType;
          title?: string;
          status?: AnalysisStatus;
          progress_percent?: number;
          error_message?: string | null;
          error_code?: string | null;
          input?: Json;
          settings?: Json;
          results?: Json;
          approved_at?: string | null;
          approved_by?: string | null;
          idempotency_key?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      findings: {
        Row: {
          id: string;
          analysis_id: string;
          workspace_id: string;
          title: string;
          summary: string;
          confidence: FindingConfidence;
          limitations: string[];
          requires_human_review: boolean;
          metadata: Json;
          created_at: string;
        };
        Insert: {
          id?: string;
          analysis_id: string;
          workspace_id: string;
          title: string;
          summary: string;
          confidence?: FindingConfidence;
          limitations?: string[];
          requires_human_review?: boolean;
          metadata?: Json;
          created_at?: string;
        };
        Update: {
          id?: string;
          analysis_id?: string;
          workspace_id?: string;
          title?: string;
          summary?: string;
          confidence?: FindingConfidence;
          limitations?: string[];
          requires_human_review?: boolean;
          metadata?: Json;
          created_at?: string;
        };
      };
      evidence_items: {
        Row: {
          id: string;
          finding_id: string | null;
          analysis_id: string;
          workspace_id: string;
          document_id: string | null;
          chunk_id: string | null;
          source_url: string | null;
          title: string;
          locator: string | null;
          excerpt: string;
          published_year: number | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          finding_id?: string | null;
          analysis_id: string;
          workspace_id: string;
          document_id?: string | null;
          chunk_id?: string | null;
          source_url?: string | null;
          title: string;
          locator?: string | null;
          excerpt: string;
          published_year?: number | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          finding_id?: string | null;
          analysis_id?: string;
          workspace_id?: string;
          document_id?: string | null;
          chunk_id?: string | null;
          source_url?: string | null;
          title?: string;
          locator?: string | null;
          excerpt?: string;
          published_year?: number | null;
          created_at?: string;
        };
      };
      students: {
        Row: {
          id: string;
          workspace_id: string;
          student_number: string;
          first_name: string;
          last_name: string;
          email: string;
          program: string | null;
          enrollment_year: number | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          workspace_id: string;
          student_number: string;
          first_name: string;
          last_name: string;
          email: string;
          program?: string | null;
          enrollment_year?: number | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          workspace_id?: string;
          student_number?: string;
          first_name?: string;
          last_name?: string;
          email?: string;
          program?: string | null;
          enrollment_year?: number | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      artifacts: {
        Row: {
          id: string;
          analysis_id: string;
          workspace_id: string;
          created_by: string;
          type: string;
          title: string;
          content: Json;
          version: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          analysis_id: string;
          workspace_id: string;
          created_by: string;
          type: string;
          title: string;
          content: Json;
          version?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          analysis_id?: string;
          workspace_id?: string;
          created_by?: string;
          type?: string;
          title?: string;
          content?: Json;
          version?: number;
          created_at?: string;
          updated_at?: string;
        };
      };
      audit_events: {
        Row: {
          id: string;
          workspace_id: string;
          user_id: string | null;
          action: string;
          resource_type: string;
          resource_id: string | null;
          details: Json;
          ip_address: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          workspace_id: string;
          user_id?: string | null;
          action: string;
          resource_type: string;
          resource_id?: string | null;
          details?: Json;
          ip_address?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          workspace_id?: string;
          user_id?: string | null;
          action?: string;
          resource_type?: string;
          resource_id?: string | null;
          details?: Json;
          ip_address?: string | null;
          created_at?: string;
        };
      };
    };
    Functions: {
      is_organization_member: {
        Args: { org_id: string; user_id: string };
        Returns: boolean;
      };
      is_workspace_member: {
        Args: { ws_id: string; user_id: string };
        Returns: boolean;
      };
      match_document_chunks: {
        Args: {
          p_workspace_id: string;
          query_embedding: number[];
          match_count: number;
        };
        Returns: {
          id: string;
          document_id: string;
          content: string;
          locator: string;
          similarity: number;
        }[];
      };
    };
    Enums: {
      user_role: UserRole;
      workspace_role: WorkspaceRole;
      module_key: ModuleKey;
      analysis_type: AnalysisType;
      analysis_status: AnalysisStatus;
      finding_confidence: FindingConfidence;
      verification_status: VerificationStatus;
      document_processing_status: DocumentProcessingStatus;
      verdict_type: VerdictType;
    };
  };
}
