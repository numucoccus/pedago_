import type {
  AchievementSummary,
  CreateAchievementInput,
  CreateStudentInput,
  StudentSummary,
  UpdateAchievementVerificationInput,
  UpdateStudentInput,
} from "@pedago/shared";
import type { AchievementRow, Json, StudentRow } from "@pedago/shared/database";
import type { DocumentRepository } from "../../repositories/document-repository.js";
import type { StudentRepository } from "../../repositories/student-repository.js";
import { AppError } from "../../utils/errors.js";
import type { AuditContext, AuditService } from "../audit/audit-service.js";
import { CONTRIBUTOR_ROLES, type AccessService } from "../workspaces/workspace-service.js";

type RequestAudit = Pick<AuditContext, "actorId" | "requestId">;

export class StudentService {
  constructor(
    private readonly students: StudentRepository,
    private readonly documents: DocumentRepository,
    private readonly access: AccessService,
    private readonly audit: AuditService,
  ) {}

  async list(userId: string, workspaceId: string, options: { limit: number; offset: number; cohort?: string; program?: string }) {
    await this.access.requireMembership(userId, workspaceId);
    const [rows, total] = await Promise.all([this.students.list(workspaceId, options), this.students.count(workspaceId)]);
    return { items: rows.map(toStudentSummary), total };
  }

  async create(userId: string, input: CreateStudentInput, audit: RequestAudit): Promise<StudentSummary> {
    const { workspace } = await this.access.requireMembership(userId, input.workspaceId, CONTRIBUTOR_ROLES);
    const student = await this.students.create({
      organization_id: workspace.organization_id,
      workspace_id: workspace.id,
      created_by: userId,
      external_student_id: input.externalStudentId,
      display_name: input.displayName,
      email: input.email ?? null,
      program: input.program ?? null,
      cohort: input.cohort ?? null,
      cgpa: input.cgpa ?? null,
      consent_status: input.consentStatus,
      retention_until: input.retentionUntil ?? null,
      deleted_at: null,
    });
    await this.audit.record(
      { ...audit, organizationId: workspace.organization_id, workspaceId: workspace.id },
      "student.created",
      { type: "student", id: student.id },
      { consentStatus: input.consentStatus },
    );
    return toStudentSummary(student);
  }

  async get(userId: string, studentId: string, audit: RequestAudit): Promise<StudentSummary> {
    const student = await this.load(userId, studentId);
    await this.audit.record(
      { ...audit, organizationId: student.organization_id, workspaceId: student.workspace_id },
      "student.accessed",
      { type: "student", id: studentId },
    );
    return toStudentSummary(student);
  }

  async update(userId: string, studentId: string, input: UpdateStudentInput, audit: RequestAudit): Promise<StudentSummary> {
    const student = await this.load(userId, studentId, CONTRIBUTOR_ROLES);
    const updated = await this.students.update(studentId, {
      ...(input.displayName !== undefined ? { display_name: input.displayName } : {}),
      ...(input.email !== undefined ? { email: input.email } : {}),
      ...(input.program !== undefined ? { program: input.program } : {}),
      ...(input.cohort !== undefined ? { cohort: input.cohort } : {}),
      ...(input.cgpa !== undefined ? { cgpa: input.cgpa } : {}),
      ...(input.consentStatus !== undefined ? { consent_status: input.consentStatus } : {}),
      ...(input.retentionUntil !== undefined ? { retention_until: input.retentionUntil } : {}),
    });
    await this.audit.record(
      { ...audit, organizationId: student.organization_id, workspaceId: student.workspace_id },
      "student.updated",
      { type: "student", id: studentId },
      { fields: Object.keys(input) },
    );
    return toStudentSummary(updated ?? student);
  }

  async listAchievements(userId: string, studentId: string): Promise<AchievementSummary[]> {
    await this.load(userId, studentId);
    return (await this.students.listAchievements(studentId)).map(toAchievementSummary);
  }

  async createAchievement(userId: string, studentId: string, input: CreateAchievementInput, audit: RequestAudit): Promise<AchievementSummary> {
    const student = await this.load(userId, studentId, CONTRIBUTOR_ROLES);
    if (input.documentId) {
      const document = await this.documents.getById(input.documentId);
      if (!document || document.workspace_id !== student.workspace_id || document.status === "deleted") {
        throw AppError.validation("Supporting document must belong to the same workspace");
      }
    }
    const achievement = await this.students.createAchievement({
      organization_id: student.organization_id,
      workspace_id: student.workspace_id,
      created_by: userId,
      student_id: studentId,
      document_id: input.documentId ?? null,
      title: input.title,
      issuer: input.issuer ?? null,
      achievement_date: input.achievementDate ?? null,
      category: input.category,
      level: input.level,
      description: input.description ?? null,
      // Manually created achievements can only start as submitted/unverified; verification is a separate action.
      verification_status: input.verificationStatus,
      verification_url: input.verificationUrl ?? null,
      extracted_fields: input.extractedFields as Json,
    });
    await this.audit.record(
      { ...audit, organizationId: student.organization_id, workspaceId: student.workspace_id },
      "achievement.created",
      { type: "achievement", id: achievement.id },
      { category: input.category, verificationStatus: input.verificationStatus },
    );
    return toAchievementSummary(achievement);
  }

  async updateVerification(userId: string, achievementId: string, input: UpdateAchievementVerificationInput, audit: RequestAudit): Promise<AchievementSummary> {
    const achievement = await this.students.getAchievement(achievementId);
    if (!achievement) throw AppError.notFound("Achievement");
    await this.access.requireMembership(userId, achievement.workspace_id, CONTRIBUTOR_ROLES);
    if (input.verificationStatus === "issuer_verified" && !(input.verificationUrl ?? achievement.verification_url)) {
      throw AppError.validation("issuer_verified requires a verification URL from the issuer");
    }
    const verified = input.verificationStatus === "issuer_verified" || input.verificationStatus === "faculty_verified";
    const updated = await this.students.updateAchievement(achievementId, {
      verification_status: input.verificationStatus,
      ...(input.verificationUrl !== undefined ? { verification_url: input.verificationUrl } : {}),
      verified_at: verified ? new Date().toISOString() : null,
      verified_by: verified ? userId : null,
    });
    await this.audit.record(
      { ...audit, organizationId: achievement.organization_id, workspaceId: achievement.workspace_id },
      "achievement.verification_updated",
      { type: "achievement", id: achievementId },
      { from: achievement.verification_status, to: input.verificationStatus, hasNote: Boolean(input.note) },
    );
    return toAchievementSummary(updated ?? achievement);
  }

  private async load(userId: string, studentId: string, roles?: Parameters<AccessService["requireMembership"]>[2]): Promise<StudentRow> {
    const student = await this.students.getById(studentId);
    if (!student) throw AppError.notFound("Student");
    await this.access.requireMembership(userId, student.workspace_id, roles);
    return student;
  }
}

export function toStudentSummary(row: StudentRow): StudentSummary {
  return {
    id: row.id,
    workspaceId: row.workspace_id,
    externalStudentId: row.external_student_id,
    displayName: row.display_name,
    email: row.email,
    program: row.program,
    cohort: row.cohort,
    cgpa: row.cgpa,
    consentStatus: row.consent_status,
    retentionUntil: row.retention_until,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function toAchievementSummary(row: AchievementRow): AchievementSummary {
  return {
    id: row.id,
    studentId: row.student_id,
    workspaceId: row.workspace_id,
    documentId: row.document_id,
    title: row.title,
    issuer: row.issuer,
    achievementDate: row.achievement_date,
    category: row.category,
    level: row.level,
    description: row.description,
    verificationStatus: row.verification_status,
    verificationUrl: row.verification_url,
    verifiedAt: row.verified_at,
    verifiedBy: row.verified_by,
    extractedFields: (row.extracted_fields as Record<string, unknown>) ?? {},
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}
