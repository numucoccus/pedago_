import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type {
  AnalysisRecord,
  AnalysisType,
  DocumentRecord,
  Workspace,
  UserProfile,
  StudentPortfolioData,
} from "@pedago/shared";
import { apiClient } from "@/lib/api/client";
import { useDemo } from "@/lib/store/demo-context";
import {
  DEMO_ANALYSES,
  DEMO_DOCUMENTS,
  DEMO_STUDENT_PORTFOLIO,
  DEMO_WORKSPACES,
  DEMO_USER,
  DEMO_RESEARCH_GAP_RESULT,
  DEMO_RESEARCH_EVOLUTION_RESULT,
  DEMO_RESEARCH_QUESTION_RESULT,
  DEMO_RESEARCH_DECISION_RESULT,
  DEMO_TEACHING_PULSE_RESULT,
  DEMO_QUERY_CLUSTERING_RESULT,
  DEMO_EXAM_MISCONCEPTION_RESULT,
  DEMO_LOR_DOSSIER_RESULT,
  DEMO_CURRICULUM_ALIGNMENT_RESULT,
} from "@/lib/constants/demo-data";

// Workspaces
export function useWorkspaces() {
  const { isDemoMode } = useDemo();
  return useQuery<Workspace[]>({
    queryKey: ["workspaces", { isDemoMode }],
    queryFn: async () => {
      if (isDemoMode) {
        return DEMO_WORKSPACES;
      }
      const res = await apiClient<Workspace[]>("/workspaces");
      return res.data;
    },
  });
}

// User Profile
export function useUserProfile() {
  const { isDemoMode } = useDemo();
  return useQuery<UserProfile>({
    queryKey: ["me", { isDemoMode }],
    queryFn: async () => {
      if (isDemoMode) {
        return DEMO_USER;
      }
      const res = await apiClient<UserProfile>("/me");
      return res.data;
    },
  });
}

// Documents
export function useDocuments(workspaceId?: string) {
  const { isDemoMode, activeWorkspace } = useDemo();
  const wsId = workspaceId || activeWorkspace.id;

  return useQuery<DocumentRecord[]>({
    queryKey: ["documents", wsId, { isDemoMode }],
    queryFn: async () => {
      if (isDemoMode) {
        return DEMO_DOCUMENTS.filter((d) => !wsId || d.workspaceId === wsId);
      }
      const res = await apiClient<DocumentRecord[]>("/documents", {
        params: { workspaceId: wsId },
      });
      return res.data;
    },
  });
}

// Analyses list
export function useAnalyses(workspaceId?: string, type?: AnalysisType) {
  const { isDemoMode, activeWorkspace } = useDemo();
  const wsId = workspaceId || activeWorkspace.id;

  return useQuery<AnalysisRecord[]>({
    queryKey: ["analyses", wsId, type, { isDemoMode }],
    queryFn: async () => {
      if (isDemoMode) {
        let list = DEMO_ANALYSES.filter((a) => !wsId || a.workspaceId === wsId);
        if (type) list = list.filter((a) => a.type === type);
        return list;
      }
      const res = await apiClient<AnalysisRecord[]>("/analyses", {
        params: { workspaceId: wsId, type },
      });
      return res.data;
    },
  });
}

// Single analysis with adaptive polling
export function useAnalysis(analysisId: string) {
  const { isDemoMode } = useDemo();

  return useQuery<AnalysisRecord | null>({
    queryKey: ["analysis", analysisId, { isDemoMode }],
    queryFn: async () => {
      if (isDemoMode) {
        const found = DEMO_ANALYSES.find((a) => a.id === analysisId);
        return found || null;
      }
      const res = await apiClient<AnalysisRecord>(`/analyses/${analysisId}`);
      return res.data;
    },
    refetchInterval: (query) => {
      const data = query.state.data;
      if (!data) return false;
      const isTerminal = ["completed", "failed", "cancelled"].includes(data.status);
      return isTerminal ? false : 3000;
    },
  });
}

// Create Analysis Mutation
export function useCreateAnalysis() {
  const queryClient = useQueryClient();
  const { isDemoMode, activeWorkspace } = useDemo();

  return useMutation({
    mutationFn: async (payload: {
      type: AnalysisType;
      title: string;
      documentIds?: string[];
      input: Record<string, unknown>;
      settings?: Record<string, unknown>;
    }) => {
      if (isDemoMode) {
        // Return appropriate demo fixture according to type
        let resultData: Record<string, unknown> = {};
        if (payload.type === "research_gap") resultData = DEMO_RESEARCH_GAP_RESULT as unknown as Record<string, unknown>;
        else if (payload.type === "research_evolution") resultData = DEMO_RESEARCH_EVOLUTION_RESULT as unknown as Record<string, unknown>;
        else if (payload.type === "research_question") resultData = DEMO_RESEARCH_QUESTION_RESULT as unknown as Record<string, unknown>;
        else if (payload.type === "research_decision") resultData = DEMO_RESEARCH_DECISION_RESULT as unknown as Record<string, unknown>;
        else if (payload.type === "teaching_pulse") resultData = DEMO_TEACHING_PULSE_RESULT as unknown as Record<string, unknown>;
        else if (payload.type === "query_clustering") resultData = DEMO_QUERY_CLUSTERING_RESULT as unknown as Record<string, unknown>;
        else if (payload.type === "exam_misconception") resultData = DEMO_EXAM_MISCONCEPTION_RESULT as unknown as Record<string, unknown>;
        else if (payload.type === "lor_dossier") resultData = DEMO_LOR_DOSSIER_RESULT as unknown as Record<string, unknown>;
        else if (payload.type === "curriculum_alignment") resultData = DEMO_CURRICULUM_ALIGNMENT_RESULT as unknown as Record<string, unknown>;
        else if (payload.type === "student_portfolio") resultData = DEMO_STUDENT_PORTFOLIO as unknown as Record<string, unknown>;

        const newRecord: AnalysisRecord = {
          id: `ana_${Date.now()}`,
          workspaceId: activeWorkspace.id,
          type: payload.type,
          title: payload.title,
          status: "completed",
          progressPercent: 100,
          currentStep: "Analysis verified & completed",
          documentIds: payload.documentIds || [],
          input: payload.input,
          settings: payload.settings,
          resultData,
          findings: (resultData as { findings?: any[] }).findings || [],
          limitations: (resultData as { limitations?: string[] }).limitations || [],
          humanReviewApproved: false,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };

        DEMO_ANALYSES.unshift(newRecord);
        return newRecord;
      }

      const res = await apiClient<AnalysisRecord>("/analyses", {
        method: "POST",
        body: {
          workspaceId: activeWorkspace.id,
          ...payload,
        },
      });
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["analyses"] });
    },
  });
}

// Student Portfolio
export function useStudent(studentId: string) {
  const { isDemoMode } = useDemo();

  return useQuery<StudentPortfolioData>({
    queryKey: ["student", studentId, { isDemoMode }],
    queryFn: async () => {
      if (isDemoMode) {
        return DEMO_STUDENT_PORTFOLIO;
      }
      const res = await apiClient<StudentPortfolioData>(`/students/${studentId}`);
      return res.data;
    },
  });
}

// Approve Analysis Review
export function useApproveAnalysis() {
  const queryClient = useQueryClient();
  const { isDemoMode } = useDemo();

  return useMutation({
    mutationFn: async ({
      analysisId,
      notes,
    }: {
      analysisId: string;
      notes?: string;
    }) => {
      if (isDemoMode) {
        const item = DEMO_ANALYSES.find((a) => a.id === analysisId);
        if (item) {
          item.humanReviewApproved = true;
          item.humanReviewNotes = notes;
        }
        return item;
      }
      const res = await apiClient<AnalysisRecord>(`/analyses/${analysisId}/approve`, {
        method: "POST",
        body: { notes },
      });
      return res.data;
    },
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ["analysis", vars.analysisId] });
      queryClient.invalidateQueries({ queryKey: ["analyses"] });
    },
  });
}
