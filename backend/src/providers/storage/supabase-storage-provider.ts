import type { ServiceSupabaseClient } from "../../config/supabase.js";
import { AppError } from "../../utils/errors.js";
import type { SignedDownload, SignedUpload, StorageProvider, StoredObjectInfo } from "./storage-provider.js";

/** Supabase Storage implementation. Buckets must be private; this class never exposes public URLs. */
export class SupabaseStorageProvider implements StorageProvider {
  constructor(private readonly client: ServiceSupabaseClient) {}

  async createSignedUpload(
    bucket: string,
    path: string,
    options: { expiresInSeconds: number; contentType: string },
  ): Promise<SignedUpload> {
    const { data, error } = await this.client.storage.from(bucket).createSignedUploadUrl(path, { upsert: false });
    if (error || !data) {
      throw AppError.providerUnavailable("Could not create signed upload", error);
    }
    return {
      url: data.signedUrl,
      token: data.token,
      expiresAt: new Date(Date.now() + options.expiresInSeconds * 1000).toISOString(),
    };
  }

  async head(bucket: string, path: string): Promise<StoredObjectInfo | null> {
    const folder = path.split("/").slice(0, -1).join("/");
    const name = path.split("/").at(-1) ?? path;
    const { data, error } = await this.client.storage.from(bucket).list(folder, { search: name, limit: 100 });
    if (error) throw AppError.providerUnavailable("Could not inspect storage object", error);
    const match = (data ?? []).find((entry) => entry.name === name);
    if (!match) return null;
    const metadata = (match.metadata ?? {}) as { size?: number; mimetype?: string; contentLength?: number };
    return {
      size: metadata.size ?? metadata.contentLength ?? 0,
      contentType: metadata.mimetype ?? null,
      lastModified: match.updated_at ?? match.created_at ?? null,
    };
  }

  async download(bucket: string, path: string): Promise<Buffer> {
    const { data, error } = await this.client.storage.from(bucket).download(path);
    if (error || !data) throw AppError.providerUnavailable("Could not download storage object", error);
    return Buffer.from(await data.arrayBuffer());
  }

  async upload(bucket: string, path: string, body: Buffer, contentType: string): Promise<void> {
    const { error } = await this.client.storage.from(bucket).upload(path, body, { contentType, upsert: true });
    if (error) throw AppError.providerUnavailable("Could not upload storage object", error);
  }

  async createSignedDownload(bucket: string, path: string, expiresInSeconds: number): Promise<SignedDownload> {
    const { data, error } = await this.client.storage.from(bucket).createSignedUrl(path, expiresInSeconds);
    if (error || !data) throw AppError.providerUnavailable("Could not create signed download", error);
    return { url: data.signedUrl, expiresAt: new Date(Date.now() + expiresInSeconds * 1000).toISOString() };
  }

  async remove(bucket: string, path: string): Promise<void> {
    const { error } = await this.client.storage.from(bucket).remove([path]);
    if (error) throw AppError.providerUnavailable("Could not remove storage object", error);
  }
}
