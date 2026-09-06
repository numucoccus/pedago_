export * from './database.types.js';

export interface ApiSuccess<T> {
  data: T;
  meta?: Record<string, unknown>;
  requestId: string;
}

export interface ApiError {
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
  requestId: string;
}

export interface EvidenceReference {
  id: string;
  documentId?: string;
  sourceUrl?: string;
  title: string;
  locator?: string;
  excerpt: string;
  publishedYear?: number;
}

export interface Finding {
  id: string;
  title: string;
  summary: string;
  confidence: 'low' | 'medium' | 'high';
  evidence: EvidenceReference[];
  limitations: string[];
  requiresHumanReview: boolean;
}

export interface AnalysisCreateInput {
  workspaceId: string;
  type: import('./database.types.js').AnalysisType;
  title: string;
  documentIds?: string[];
  input?: Record<string, unknown>;
  settings?: Record<string, unknown>;
}
