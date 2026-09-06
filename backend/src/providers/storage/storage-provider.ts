export interface StoredObjectInfo {
  size: number;
  contentType: string | null;
  lastModified: string | null;
}

export interface SignedUpload {
  url: string;
  token: string | null;
  expiresAt: string;
}

export interface SignedDownload {
  url: string;
  expiresAt: string;
}

/** Private object storage port. All buckets are private; only signed URLs are ever returned. */
export interface StorageProvider {
  createSignedUpload(
    bucket: string,
    path: string,
    options: { expiresInSeconds: number; contentType: string },
  ): Promise<SignedUpload>;
  head(bucket: string, path: string): Promise<StoredObjectInfo | null>;
  download(bucket: string, path: string): Promise<Buffer>;
  upload(bucket: string, path: string, body: Buffer, contentType: string): Promise<void>;
  createSignedDownload(bucket: string, path: string, expiresInSeconds: number): Promise<SignedDownload>;
  remove(bucket: string, path: string): Promise<void>;
}
