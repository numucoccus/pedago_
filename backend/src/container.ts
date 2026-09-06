import type { Env } from "./config/env.js";
import { createLogger, type AppLogger } from "./config/logger.js";
import { createServiceClient } from "./config/supabase.js";
import {
  analysisController,
  artifactController,
  documentController,
  sourceController,
  studentController,
  systemController,
  workspaceController,
  type Controllers,
} from "./controllers/index.js";
import { InlineJobDispatcher, type JobDispatcher } from "./jobs/dispatcher.js";
import { createInngestClient, createInngestHandler, InngestJobDispatcher } from "./jobs/inngest.js";
import { JobRunner } from "./jobs/job-runner.js";
import type { AIProvider } from "./providers/ai/ai-provider.js";
import type { BaseAIProvider } from "./providers/ai/base-ai-provider.js";
import { FakeAIProvider } from "./providers/ai/fake-ai-provider.js";
import { OpenAICompatibleProvider } from "./providers/ai/openai-compatible-provider.js";
import { SupabaseTokenVerifier, type TokenVerifier } from "./providers/auth/token-verifier.js";
import { ExtractorRouter } from "./providers/document-processing/extractor-router.js";
import { IndustryDemandProvider } from "./providers/industry/industry-demand-provider.js";
import { ArxivAdapter, CrossrefAdapter, OpenAlexAdapter, SemanticScholarAdapter } from "./providers/research/adapters.js";
import { ResearchAggregator } from "./providers/research/research-aggregator.js";
import type { ResearchSourceAdapter } from "./providers/research/research-source.js";
import { MemoryStorageProvider } from "./providers/storage/memory-storage-provider.js";
import type { StorageProvider } from "./providers/storage/storage-provider.js";
import { SupabaseStorageProvider } from "./providers/storage/supabase-storage-provider.js";
import { AnalysisRepository } from "./repositories/analysis-repository.js";
import type { DataStore } from "./repositories/data-store.js";
import { DocumentRepository } from "./repositories/document-repository.js";
import { MemoryDataStore } from "./repositories/memory-data-store.js";
import { AuditRepository, IdempotencyRepository, IndustryRepository, ResearchRepository, TeachingRepository } from "./repositories/misc-repositories.js";
import { StudentRepository } from "./repositories/student-repository.js";
import { SupabaseDataStore } from "./repositories/supabase-data-store.js";
import { WorkspaceRepository } from "./repositories/workspace-repository.js";
import { AnalysisOrchestrator } from "./services/analysis/analysis-orchestrator.js";
import { AnalysisService } from "./services/analysis/analysis-service.js";
import { AnalysisRegistry } from "./services/analysis/registry.js";
import type { HandlerDeps } from "./services/analysis/types.js";
import { ArtifactService } from "./services/artifacts/artifact-service.js";
import { ExamMisconceptionHandler } from "./services/assessment/exam-misconception-handler.js";
import { AuditService } from "./services/audit/audit-service.js";
import { CurriculumAlignmentHandler } from "./services/curriculum/curriculum-alignment-handler.js";
import { DocumentProcessingService } from "./services/documents/document-processing-service.js";
import { DocumentService } from "./services/documents/document-service.js";
import { ResearchDecisionHandler } from "./services/research/research-decision-handler.js";
import { ResearchEvolutionHandler } from "./services/research/research-evolution-handler.js";
import { ResearchGapHandler } from "./services/research/research-gap-handler.js";
import { ResearchQuestionHandler } from "./services/research/research-question-handler.js";
import { RetrievalService } from "./services/retrieval/retrieval-service.js";
import { LorDossierHandler } from "./services/students/lor-dossier-handler.js";
import { StudentPortfolioHandler } from "./services/students/student-portfolio-handler.js";
import { StudentService } from "./services/students/student-service.js";
import { QueryClusteringHandler } from "./services/teaching/query-clustering-handler.js";
import { TeachingPulseHandler } from "./services/teaching/teaching-pulse-handler.js";
import { AccessService, WorkspaceService } from "./services/workspaces/workspace-service.js";

export interface ContainerOverrides {
  logger?: AppLogger;
  dataStore?: DataStore;
  storage?: StorageProvider;
  ai?: AIProvider;
  tokenVerifier?: TokenVerifier;
  researchAdapters?: ResearchSourceAdapter[];
  jobDispatcher?: JobDispatcher;
  inlineJobMode?: "deferred" | "background";
}

export interface Container {
  env: Env;
  logger: AppLogger;
  dataStore: DataStore;
  storage: StorageProvider;
  ai: AIProvider;
  tokenVerifier: TokenVerifier;
  jobs: JobDispatcher;
  inlineJobs: InlineJobDispatcher | null;
  inngestHandler: ReturnType<typeof createInngestHandler> | null;
  repositories: {
    workspaces: WorkspaceRepository;
    documents: DocumentRepository;
    analyses: AnalysisRepository;
    students: StudentRepository;
    audit: AuditRepository;
    idempotency: IdempotencyRepository;
    research: ResearchRepository;
    industry: IndustryRepository;
    teaching: TeachingRepository;
  };
  services: {
    access: AccessService;
    audit: AuditService;
    workspaces: WorkspaceService;
    documents: DocumentService;
    processing: DocumentProcessingService;
    analyses: AnalysisService;
    artifacts: ArtifactService;
    students: StudentService;
    orchestrator: AnalysisOrchestrator;
    retrieval: RetrievalService;
  };
  registry: AnalysisRegistry;
  researchSources: ResearchAggregator;
  industryDemand: IndustryDemandProvider;
  controllers: Controllers;
  startedAt: string;
}

export const APP_VERSION = "0.1.0";

export function buildContainer(env: Env, overrides: ContainerOverrides = {}): Container {
  const logger = overrides.logger ?? createLogger(env);
  const supabase = env.DATA_STORE === "supabase" && (!overrides.dataStore || !overrides.storage) ? createServiceClient(env) : null;
  const dataStore = overrides.dataStore ?? (supabase ? new SupabaseDataStore(supabase) : new MemoryDataStore());
  const storage = overrides.storage ?? (supabase ? new SupabaseStorageProvider(supabase) : new MemoryStorageProvider());
  const ai = overrides.ai ?? createAIProvider(env, logger);
  const tokenVerifier = overrides.tokenVerifier ?? new SupabaseTokenVerifier(env);

  const repositories = {
    workspaces: new WorkspaceRepository(dataStore),
    documents: new DocumentRepository(dataStore),
    analyses: new AnalysisRepository(dataStore),
    students: new StudentRepository(dataStore),
    audit: new AuditRepository(dataStore),
    idempotency: new IdempotencyRepository(dataStore),
    research: new ResearchRepository(dataStore),
    industry: new IndustryRepository(dataStore),
    teaching: new TeachingRepository(dataStore),
  };

  const researchSources = new ResearchAggregator(overrides.researchAdapters ?? createResearchAdapters(env), logger);
  const industryDemand = new IndustryDemandProvider(repositories.documents, repositories.industry);
  const audit = new AuditService(repositories.audit, logger);
  const access = new AccessService(repositories.workspaces);
  const retrieval = new RetrievalService(dataStore, ai);
  const router = new ExtractorRouter(ai);
  const processing = new DocumentProcessingService(repositories.documents, repositories.workspaces, storage, router, ai, audit, logger);

  const handlerDeps: HandlerDeps = {
    ai,
    retrieval,
    documents: repositories.documents,
    analyses: repositories.analyses,
    research: repositories.research,
    researchSources,
    students: repositories.students,
    teaching: repositories.teaching,
    industry: repositories.industry,
    industryDemand,
    logger,
  };
  const registry = new AnalysisRegistry()
    .register(new ResearchGapHandler())
    .register(new ResearchEvolutionHandler())
    .register(new ResearchQuestionHandler())
    .register(new ResearchDecisionHandler())
    .register(new TeachingPulseHandler())
    .register(new QueryClusteringHandler())
    .register(new ExamMisconceptionHandler())
    .register(new StudentPortfolioHandler())
    .register(new LorDossierHandler())
    .register(new CurriculumAlignmentHandler());
  registry.assertComplete();

  const orchestrator = new AnalysisOrchestrator(registry, repositories.analyses, repositories.documents, repositories.workspaces, processing, handlerDeps, audit, logger);

  // Job dispatch: Inngest when configured, otherwise in-process execution.
  let jobs: JobDispatcher;
  let inlineJobs: InlineJobDispatcher | null = null;
  let inngestHandler: ReturnType<typeof createInngestHandler> | null = null;
  const runner = new JobRunner(processing, orchestrator, () => jobs, logger);
  if (overrides.jobDispatcher) {
    jobs = overrides.jobDispatcher;
    if (jobs instanceof InlineJobDispatcher) {
      jobs.bind(runner);
      inlineJobs = jobs;
    }
  } else if (env.JOB_DISPATCHER === "inngest") {
    const client = createInngestClient(env);
    jobs = new InngestJobDispatcher(client);
    inngestHandler = createInngestHandler(client, runner);
  } else {
    inlineJobs = new InlineJobDispatcher(overrides.inlineJobMode ?? (env.NODE_ENV === "test" ? "deferred" : "background"), (error) => logger.error({ err: error }, "Inline job failed"));
    inlineJobs.bind(runner);
    jobs = inlineJobs;
  }

  const workspaces = new WorkspaceService(repositories.workspaces, access, audit);
  const documents = new DocumentService(repositories.documents, storage, access, audit, jobs, env);
  const analyses = new AnalysisService(repositories.analyses, repositories.documents, repositories.idempotency, registry, access, audit, jobs);
  const artifacts = new ArtifactService(repositories.analyses, repositories.idempotency, storage, access, audit, env);
  const students = new StudentService(repositories.students, repositories.documents, access, audit);
  const startedAt = new Date().toISOString();

  const controllers: Controllers = {
    system: systemController(workspaces, { version: APP_VERSION, startedAt, dataStore: env.DATA_STORE, aiProvider: env.AI_PROVIDER }),
    workspaces: workspaceController(workspaces),
    documents: documentController(documents),
    analyses: analysisController(analyses),
    artifacts: artifactController(artifacts),
    students: studentController(students),
    sources: sourceController(researchSources, industryDemand),
  };

  return {
    env,
    logger,
    dataStore,
    storage,
    ai,
    tokenVerifier,
    jobs,
    inlineJobs,
    inngestHandler,
    repositories,
    services: { access, audit, workspaces, documents, processing, analyses, artifacts, students, orchestrator, retrieval },
    registry,
    researchSources,
    industryDemand,
    controllers,
    startedAt,
  };
}

function createAIProvider(env: Env, logger: AppLogger): AIProvider {
  let provider: BaseAIProvider;
  if (env.AI_PROVIDER === "openai_compatible") {
    provider = OpenAICompatibleProvider.fromEnv(env, { logger });
  } else {
    provider = new FakeAIProvider(env.AI_EMBEDDING_DIMENSION, { maxRetries: env.AI_MAX_RETRIES, timeoutMs: env.AI_TIMEOUT_MS, logger });
  }
  // Privacy-safe prompt/model tracing (ids, counts, tokens, latency) for Langfuse-style observability.
  provider.onTrace((trace) => {
    logger.info({ aiTrace: trace }, "ai.call");
  });
  return provider;
}

function createResearchAdapters(env: Env): ResearchSourceAdapter[] {
  const all: ResearchSourceAdapter[] = [
    new OpenAlexAdapter({ timeoutMs: env.RESEARCH_TIMEOUT_MS, mailto: env.OPENALEX_MAILTO }),
    new SemanticScholarAdapter({ timeoutMs: env.RESEARCH_TIMEOUT_MS, apiKey: env.SEMANTIC_SCHOLAR_API_KEY }),
    new CrossrefAdapter({ timeoutMs: env.RESEARCH_TIMEOUT_MS, mailto: env.CROSSREF_MAILTO }),
    new ArxivAdapter({ timeoutMs: env.RESEARCH_TIMEOUT_MS }),
  ];
  return all.filter((adapter) => env.RESEARCH_SOURCES.includes(adapter.key));
}
