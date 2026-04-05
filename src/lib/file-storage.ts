// src/lib/file-storage.ts
/**
 * Abstract file storage layer.
 *
 * In development: writes to public/uploads/ on local disk.
 * In production: swap to S3 or Vercel Blob by setting FILE_STORAGE_PROVIDER env var.
 *
 * All paths are relative to the storage root (e.g. "orders/abc123/cut-file.svg").
 */

import fs from "fs/promises";
import path from "path";

export interface StoredFile {
  /** Relative path within storage (e.g. "orders/abc123/cut-file.svg") */
  key: string;
  /** Public URL to access the file */
  url: string;
  /** File size in bytes */
  sizeBytes: number;
}

export interface FileStorageProvider {
  write(key: string, data: Buffer | string, contentType: string): Promise<StoredFile>;
  read(key: string): Promise<Buffer>;
  delete(key: string): Promise<void>;
  exists(key: string): Promise<boolean>;
  getUrl(key: string): string;
}

// ---------------------------------------------------------------------------
// Local disk provider (development)
// ---------------------------------------------------------------------------

class LocalFileStorage implements FileStorageProvider {
  private root: string;

  constructor() {
    this.root = path.join(process.cwd(), "public", "uploads");
  }

  async write(key: string, data: Buffer | string, _contentType: string): Promise<StoredFile> {
    const filePath = path.join(this.root, key);
    const dir = path.dirname(filePath);
    await fs.mkdir(dir, { recursive: true });

    const buffer = typeof data === "string" ? Buffer.from(data, "utf-8") : data;
    await fs.writeFile(filePath, buffer);

    return {
      key,
      url: this.getUrl(key),
      sizeBytes: buffer.length,
    };
  }

  async read(key: string): Promise<Buffer> {
    const filePath = path.join(this.root, key);
    return fs.readFile(filePath);
  }

  async delete(key: string): Promise<void> {
    const filePath = path.join(this.root, key);
    await fs.unlink(filePath).catch(() => {});
  }

  async exists(key: string): Promise<boolean> {
    const filePath = path.join(this.root, key);
    try {
      await fs.access(filePath);
      return true;
    } catch {
      return false;
    }
  }

  getUrl(key: string): string {
    return `/uploads/${key}`;
  }
}

// ---------------------------------------------------------------------------
// Factory
// ---------------------------------------------------------------------------

let _instance: FileStorageProvider | null = null;

export function getFileStorage(): FileStorageProvider {
  if (_instance) return _instance;

  const provider = process.env.FILE_STORAGE_PROVIDER ?? "local";

  switch (provider) {
    case "local":
      _instance = new LocalFileStorage();
      break;
    // Future: case "s3": _instance = new S3FileStorage(); break;
    // Future: case "vercel-blob": _instance = new VercelBlobStorage(); break;
    default:
      _instance = new LocalFileStorage();
  }

  return _instance;
}
