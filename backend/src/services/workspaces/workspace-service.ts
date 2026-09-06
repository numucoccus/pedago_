import type {
  AddWorkspaceMemberInput,
  CreateWorkspaceInput,
  CurrentUser,
  UpdateWorkspaceInput,
  WorkspaceMemberSummary,
  WorkspaceRole,
  WorkspaceSummary,
} from "@pedago/shared";
import type { WorkspaceRow } from "@pedago/shared/database";
import type { WorkspaceRepository } from "../../repositories/workspace-repository.js";
import { AppError } from "../../utils/errors.js";
import { slugify } from "../../utils/text.js";
import type { AuditContext, AuditService } from "../audit/audit-service.js";

export const MANAGER_ROLES: WorkspaceRole[] = ["owner", "admin"];
export const CONTRIBUTOR_ROLES: WorkspaceRole[] = ["owner", "admin", "faculty"];
export const ALL_ROLES: WorkspaceRole[] = ["owner", "admin", "faculty", "reviewer"];

export interface WorkspaceAccess {
  workspace: WorkspaceRow;
  role: WorkspaceRole;
}

/** Central authorization: every protected resource resolves through this service. */
export class AccessService {
  constructor(private readonly workspaces: WorkspaceRepository) {}

  async requireMembership(userId: string, workspaceId: string, allowedRoles: WorkspaceRole[] = ALL_ROLES): Promise<WorkspaceAccess> {
    const workspace = await this.workspaces.getWorkspace(workspaceId);
    if (!workspace) {
      throw AppError.notFound("Workspace");
    }
    const membership = await this.workspaces.getMembership(workspaceId, userId);
    if (!membership) {
      throw AppError.forbidden("You are not a member of this workspace");
    }
    const organizationMembership = await this.workspaces.getOrganizationMembership(workspace.organization_id, userId);
    if (!organizationMembership) {
      throw AppError.forbidden("You are not a member of this organization");
    }
    if (!allowedRoles.includes(membership.role)) {
      throw AppError.forbidden(`This action requires one of the roles: ${allowedRoles.join(", ")}`);
    }
    return { workspace, role: membership.role };
  }
}

export class WorkspaceService {
  constructor(
    private readonly workspaces: WorkspaceRepository,
    private readonly access: AccessService,
    private readonly audit: AuditService,
  ) {}

  async currentUser(userId: string, email: string | null): Promise<CurrentUser> {
    const profile = await this.workspaces.getProfile(userId);
    const memberships = await this.workspaces.listMembershipsForUser(userId);
    return {
      id: userId,
      email,
      displayName: profile?.display_name ?? null,
      institution: profile?.institution ?? null,
      department: profile?.department ?? null,
      designation: profile?.designation ?? null,
      workspaces: memberships.map((m) => toWorkspaceSummary(m.workspace, m.role)),
    };
  }

  async list(userId: string): Promise<WorkspaceSummary[]> {
    const memberships = await this.workspaces.listMembershipsForUser(userId);
    return memberships.map((m) => toWorkspaceSummary(m.workspace, m.role));
  }

  async create(userId: string, input: CreateWorkspaceInput, audit: Omit<AuditContext, "organizationId" | "workspaceId">): Promise<WorkspaceSummary> {
    let organizationId = input.organizationId;
    if (organizationId) {
      const membership = await this.workspaces.getOrganizationMembership(organizationId, userId);
      if (!membership || !MANAGER_ROLES.includes(membership.role)) {
        throw AppError.forbidden("Only organization owners or admins can create workspaces");
      }
    } else {
      const name = input.organizationName ?? `${input.name} Organization`;
      const organization = await this.workspaces.createOrganization({
        name,
        slug: `${slugify(name)}-${Date.now().toString(36)}`,
        createdBy: userId,
      });
      await this.workspaces.addOrganizationMember(organization.id, userId, "owner");
      organizationId = organization.id;
    }
    const workspace = await this.workspaces.createWorkspace({
      organizationId,
      name: input.name,
      slug: input.slug,
      description: input.description ?? null,
      settings: input.settings ?? {},
      createdBy: userId,
    });
    await this.workspaces.addMember(workspace.id, userId, "owner");
    await this.audit.record(
      { ...audit, organizationId, workspaceId: workspace.id },
      "workspace.created",
      { type: "workspace", id: workspace.id },
      { slug: workspace.slug },
    );
    return toWorkspaceSummary(workspace, "owner");
  }

  async get(userId: string, workspaceId: string): Promise<WorkspaceSummary> {
    const { workspace, role } = await this.access.requireMembership(userId, workspaceId);
    return toWorkspaceSummary(workspace, role);
  }

  async update(userId: string, workspaceId: string, input: UpdateWorkspaceInput, audit: Omit<AuditContext, "organizationId" | "workspaceId">): Promise<WorkspaceSummary> {
    const { workspace, role } = await this.access.requireMembership(userId, workspaceId, MANAGER_ROLES);
    const settings = input.settings ? { ...(workspace.settings as Record<string, unknown>), ...input.settings } : undefined;
    const updated = await this.workspaces.updateWorkspace(workspaceId, {
      ...(input.name !== undefined ? { name: input.name } : {}),
      ...(input.description !== undefined ? { description: input.description } : {}),
      ...(settings ? { settings: settings as WorkspaceRow["settings"] } : {}),
    });
    await this.audit.record(
      { ...audit, organizationId: workspace.organization_id, workspaceId },
      "workspace.updated",
      { type: "workspace", id: workspaceId },
      { fields: Object.keys(input) },
    );
    return toWorkspaceSummary(updated ?? workspace, role);
  }

  async listMembers(userId: string, workspaceId: string): Promise<WorkspaceMemberSummary[]> {
    await this.access.requireMembership(userId, workspaceId);
    const members = await this.workspaces.listMembers(workspaceId);
    return members.map(toMemberSummary);
  }

  async addMember(userId: string, workspaceId: string, input: AddWorkspaceMemberInput, audit: Omit<AuditContext, "organizationId" | "workspaceId">): Promise<WorkspaceMemberSummary> {
    const { workspace, role } = await this.access.requireMembership(userId, workspaceId, MANAGER_ROLES);
    if (input.role === "owner" && role !== "owner") {
      throw AppError.forbidden("Only an owner can grant the owner role");
    }
    const existing = await this.workspaces.getMembership(workspaceId, input.userId);
    if (existing) {
      throw AppError.conflict("User is already a member of this workspace");
    }
    const orgMembership = await this.workspaces.getOrganizationMembership(workspace.organization_id, input.userId);
    if (!orgMembership) {
      await this.workspaces.addOrganizationMember(workspace.organization_id, input.userId, input.role === "owner" ? "admin" : input.role);
    }
    const member = await this.workspaces.addMember(workspaceId, input.userId, input.role);
    await this.audit.record(
      { ...audit, organizationId: workspace.organization_id, workspaceId },
      "workspace.member_added",
      { type: "workspace_member", id: member.id },
      { role: input.role, userId: input.userId },
    );
    return toMemberSummary(member);
  }

  async removeMember(userId: string, workspaceId: string, memberId: string, audit: Omit<AuditContext, "organizationId" | "workspaceId">): Promise<void> {
    const { workspace, role } = await this.access.requireMembership(userId, workspaceId, MANAGER_ROLES);
    const member = await this.workspaces.getMemberById(workspaceId, memberId);
    if (!member) throw AppError.notFound("Workspace member");
    if (member.role === "owner" && role !== "owner") {
      throw AppError.forbidden("Only an owner can remove another owner");
    }
    if (member.role === "owner") {
      const owners = (await this.workspaces.listMembers(workspaceId)).filter((m) => m.role === "owner");
      if (owners.length <= 1) throw AppError.conflict("A workspace must keep at least one owner");
    }
    await this.workspaces.removeMember(workspaceId, memberId);
    await this.audit.record(
      { ...audit, organizationId: workspace.organization_id, workspaceId },
      "workspace.member_removed",
      { type: "workspace_member", id: memberId },
      { removedUserId: member.user_id },
    );
  }
}

export function toWorkspaceSummary(workspace: WorkspaceRow, role: WorkspaceRole): WorkspaceSummary {
  return {
    id: workspace.id,
    organizationId: workspace.organization_id,
    name: workspace.name,
    slug: workspace.slug,
    description: workspace.description,
    settings: (workspace.settings as Record<string, unknown>) ?? {},
    role,
    createdAt: workspace.created_at,
    updatedAt: workspace.updated_at,
  };
}

function toMemberSummary(member: { id: string; workspace_id: string; user_id: string; role: WorkspaceRole; created_at: string }): WorkspaceMemberSummary {
  return { id: member.id, workspaceId: member.workspace_id, userId: member.user_id, role: member.role, createdAt: member.created_at };
}
