import type { WorkspaceRole } from "@pedago/shared";
import type {
  OrganizationMemberRow,
  OrganizationRow,
  ProfileRow,
  WorkspaceMemberRow,
  WorkspaceRow,
} from "@pedago/shared/database";
import { eq, inList, type DataStore } from "./data-store.js";

export interface WorkspaceMembership {
  workspace: WorkspaceRow;
  role: WorkspaceRole;
}

export class WorkspaceRepository {
  constructor(private readonly store: DataStore) {}

  getProfile(userId: string): Promise<ProfileRow | null> {
    return this.store.findOne("profiles", { filters: [eq("id", userId)] });
  }

  async upsertProfile(userId: string, values: Partial<Omit<ProfileRow, "id">>): Promise<ProfileRow> {
    const existing = await this.getProfile(userId);
    if (existing) {
      const [row] = await this.store.update("profiles", [eq("id", userId)], values);
      return row ?? existing;
    }
    return this.store.insert("profiles", {
      id: userId,
      display_name: values.display_name ?? null,
      avatar_url: values.avatar_url ?? null,
      institution: values.institution ?? null,
      department: values.department ?? null,
      designation: values.designation ?? null,
    });
  }

  getOrganization(id: string): Promise<OrganizationRow | null> {
    return this.store.findOne("organizations", { filters: [eq("id", id)] });
  }

  createOrganization(values: { name: string; slug: string; createdBy: string }): Promise<OrganizationRow> {
    return this.store.insert("organizations", { name: values.name, slug: values.slug, created_by: values.createdBy });
  }

  getOrganizationMembership(organizationId: string, userId: string): Promise<OrganizationMemberRow | null> {
    return this.store.findOne("organization_members", {
      filters: [eq("organization_id", organizationId), eq("user_id", userId)],
    });
  }

  addOrganizationMember(organizationId: string, userId: string, role: WorkspaceRole): Promise<OrganizationMemberRow> {
    return this.store.insert("organization_members", { organization_id: organizationId, user_id: userId, role });
  }

  getWorkspace(id: string): Promise<WorkspaceRow | null> {
    return this.store.findOne("workspaces", { filters: [eq("id", id)] });
  }

  createWorkspace(values: {
    organizationId: string;
    name: string;
    slug: string;
    description?: string | null;
    settings?: Record<string, unknown>;
    createdBy: string;
  }): Promise<WorkspaceRow> {
    return this.store.insert("workspaces", {
      organization_id: values.organizationId,
      name: values.name,
      slug: values.slug,
      description: values.description ?? null,
      settings: (values.settings ?? {}) as WorkspaceRow["settings"],
      created_by: values.createdBy,
    });
  }

  async updateWorkspace(id: string, patch: Partial<Pick<WorkspaceRow, "name" | "description" | "settings">>): Promise<WorkspaceRow | null> {
    const [row] = await this.store.update("workspaces", [eq("id", id)], patch);
    return row ?? null;
  }

  getMembership(workspaceId: string, userId: string): Promise<WorkspaceMemberRow | null> {
    return this.store.findOne("workspace_members", { filters: [eq("workspace_id", workspaceId), eq("user_id", userId)] });
  }

  getMemberById(workspaceId: string, memberId: string): Promise<WorkspaceMemberRow | null> {
    return this.store.findOne("workspace_members", { filters: [eq("workspace_id", workspaceId), eq("id", memberId)] });
  }

  listMembers(workspaceId: string): Promise<WorkspaceMemberRow[]> {
    return this.store.findMany("workspace_members", {
      filters: [eq("workspace_id", workspaceId)],
      orderBy: [{ column: "created_at" }],
    });
  }

  addMember(workspaceId: string, userId: string, role: WorkspaceRole): Promise<WorkspaceMemberRow> {
    return this.store.insert("workspace_members", { workspace_id: workspaceId, user_id: userId, role });
  }

  async removeMember(workspaceId: string, memberId: string): Promise<boolean> {
    return (await this.store.delete("workspace_members", [eq("workspace_id", workspaceId), eq("id", memberId)])) > 0;
  }

  async listMembershipsForUser(userId: string): Promise<WorkspaceMembership[]> {
    const memberships = await this.store.findMany("workspace_members", { filters: [eq("user_id", userId)] });
    if (memberships.length === 0) return [];
    const workspaces = await this.store.findMany("workspaces", {
      filters: [inList("id", memberships.map((m) => m.workspace_id))],
      orderBy: [{ column: "created_at" }],
    });
    return workspaces.map((workspace) => ({
      workspace,
      role: memberships.find((m) => m.workspace_id === workspace.id)!.role,
    }));
  }
}
