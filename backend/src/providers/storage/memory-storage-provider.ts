import { AppError } from "../../utils/errors.js";
import { newId } from "../../utils/ids.js";
import type { SignedDownload, SignedUpload, StorageProvider, StoredObjectInfo } from "./storage-provider.js";

interface StoredObject {
  body: Buffer;
  contentType: string;
  lastModified: string;
}

/** In-memory storage used by tests and local development. */
export class MemoryStorageProvider implements StorageProvider {
  private readonly objects = new Map<string, StoredObject>();

  private key(bucket: string, path: string): string {
    return `${bucket}/${path}`;
  }

  async createSignedUpload(
    bucket: string,
    path: string,
    options: { expiresInSeconds: number },
  ): Promise<SignedUpload> {
    const expiresAt = new Date(Date.now() + options.expiresInSeconds * 1000).toISOString();
    return { url: `memory://${bucket}/${path}?token=${newId()}`, token: newId(), expiresAt };
  }

  async head(bucket: string, path: string): Promise<StoredObjectInfo | null> {
    const object = this.objects.get(this.key(bucket, path));
    if (!object) return null;
    return { size: object.body.byteLength, contentType: object.contentType, lastModified: object.lastModified };
  }

  async download(bucket: string, path: string): Promise<Buffer> {
    const object = this.objects.get(this.key(bucket, path));
    if (!object) throw AppError.notFound("Storage object");
    return object.body;
  }

  async upload(bucket: string, path: string, body: Buffer, contentType: string): Promise<void> {
    this.objects.set(this.key(bucket, path), { body, contentType, lastModified: new Date().toISOString() });
  }

  async createSignedDownload(bucket: string, path: string, expiresInSeconds: number): Promise<SignedDownload> {
    if (!this.objects.has(this.key(bucket, path))) throw AppError.notFound("Storage object");
    return {
      url: `memory://${bucket}/${path}?download=${newId()}`,
      expiresAt: new Date(Date.now() + expiresInSeconds * 1000).toISOString(),
    };
  }

  async remove(bucket: string, path: string): Promise<void> {
    this.objects.delete(this.key(bucket, path));
  }
}
