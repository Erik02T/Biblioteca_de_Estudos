import {
  CopyObjectCommand,
  DeleteObjectCommand,
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { BadRequestException } from '@nestjs/common';
import { AttachmentType } from '@prisma/client';
import type { Readable } from 'node:stream';

export interface StorageUploadOptions {
  bucket: string;
  key: string;
  body: Buffer | Readable;
  contentLength?: number;
  contentType: string;
  contentDisposition?: string;
}

export interface StorageSignedUrlOptions {
  bucket: string;
  key: string;
  expiresIn?: number;
}

export interface StorageDeleteOptions {
  bucket: string;
  key: string;
}

@Injectable()
export class StorageService {
  private client: S3Client | null = null;
  private bucket: string | null = null;
  private publicUrl: string | null = null;
  private signedUrlsEnabled: boolean = true;
  private defaultUrlExpiresIn: number = 3600;

  constructor() {
    this.initialize();
  }

  private initialize() {
    const bucket = process.env.STORAGE_BUCKET;
    const accessKeyId = process.env.STORAGE_ACCESS_KEY_ID;
    const secretAccessKey = process.env.STORAGE_SECRET_ACCESS_KEY;

    if (!bucket || !accessKeyId || !secretAccessKey) {
      return;
    }

    this.bucket = bucket;
    this.publicUrl = this.buildPublicUrl();
    this.signedUrlsEnabled = process.env.STORAGE_SIGNED_URLS !== 'false';
    this.defaultUrlExpiresIn = Number(
      process.env.STORAGE_URL_EXPIRES_IN ?? 3600,
    );

    this.client = new S3Client({
      region: process.env.STORAGE_REGION ?? 'auto',
      endpoint: process.env.STORAGE_ENDPOINT,
      forcePathStyle: process.env.STORAGE_FORCE_PATH_STYLE === 'true',
      credentials: { accessKeyId, secretAccessKey },
    });
  }

  private buildPublicUrl(): string | null {
    const publicUrl = process.env.STORAGE_PUBLIC_URL?.replace(/\/$/, '');
    if (publicUrl) return publicUrl;

    const endpoint = process.env.STORAGE_ENDPOINT?.replace(/\/$/, '');
    const bucket = this.bucket;
    if (endpoint && bucket) {
      return `${endpoint}/${bucket}`;
    }
    return null;
  }

  resolveStorageKeyFromUrl(url?: string | null): string | null {
    if (!url) return null;
    if (!this.publicUrl) return null;

    const cleanUrl = url.split('?')[0];
    if (!cleanUrl.startsWith(`${this.publicUrl}/`)) return null;

    return decodeURIComponent(cleanUrl.slice(`${this.publicUrl}/`.length));
  }

  buildPublicUrlFromKey(key: string): string {
    if (!this.publicUrl) {
      throw new InternalServerErrorException(
        'Storage public URL não configurada.',
      );
    }
    return `${this.publicUrl}/${key.split('/').map(encodeURIComponent).join('/')}`;
  }

  requireOwnedAttachmentKey(
    url: string,
    userId: string,
    areaId: string,
  ): string {
    const key = this.resolveStorageKeyFromUrl(url);
    if (
      !key ||
      (!key.startsWith(`${userId}/${areaId}/`) &&
        !key.startsWith(`uploads/${userId}/${areaId}/`)) ||
      key.split('/').some((part) => part === '..' || part === '.')
    ) {
      throw new BadRequestException(
        'O arquivo não pertence à página solicitada.',
      );
    }
    return key;
  }

  async upload(options: StorageUploadOptions): Promise<void> {
    if (!this.client || !this.bucket) {
      throw new InternalServerErrorException(
        'Storage não configurado. Defina STORAGE_BUCKET, STORAGE_PUBLIC_URL, STORAGE_ACCESS_KEY_ID e STORAGE_SECRET_ACCESS_KEY.',
      );
    }

    try {
      await this.client.send(
        new PutObjectCommand({
          Bucket: this.bucket,
          Key: options.key,
          Body: options.body,
          ContentLength: options.contentLength,
          ContentType: options.contentType,
          ContentDisposition: options.contentDisposition,
        }),
      );
    } catch {
      throw new InternalServerErrorException(
        'Não foi possível salvar o arquivo no storage.',
      );
    }
  }

  async signUrl(options: StorageSignedUrlOptions): Promise<string> {
    if (!this.client || !this.bucket) {
      throw new InternalServerErrorException('Storage não configurado.');
    }

    const expiresIn =
      options.expiresIn && options.expiresIn > 0
        ? options.expiresIn
        : this.defaultUrlExpiresIn;

    try {
      return await getSignedUrl(
        this.client,
        new GetObjectCommand({
          Bucket: options.bucket,
          Key: options.key,
        }),
        { expiresIn },
      );
    } catch {
      throw new InternalServerErrorException(
        'Não foi possível gerar URL assinada.',
      );
    }
  }

  async delete(options: StorageDeleteOptions): Promise<void> {
    if (!this.client || !this.bucket) {
      throw new InternalServerErrorException('Storage não configurado.');
    }

    try {
      await this.client.send(
        new DeleteObjectCommand({
          Bucket: options.bucket,
          Key: options.key,
        }),
      );
    } catch {
      throw new InternalServerErrorException(
        'Não foi possível remover o arquivo do storage.',
      );
    }
  }

  async deleteByUrl(url?: string | null): Promise<void> {
    if (!url) return;

    const key = this.resolveStorageKeyFromUrl(url);
    if (!key || !this.bucket) return;
    if (key.startsWith('revisions/') || key.startsWith('templates/')) {
      throw new InternalServerErrorException(
        'Objetos de versões não podem ser excluídos por anexos.',
      );
    }

    await this.delete({ bucket: this.bucket, key });
  }

  async readObject(key: string, maxBytes = 100 * 1024 * 1024): Promise<Buffer> {
    if (!this.client || !this.bucket)
      throw new InternalServerErrorException('Storage não configurado.');
    try {
      const object = await this.client.send(
        new GetObjectCommand({ Bucket: this.bucket, Key: key }),
      );
      if (!object.Body || (object.ContentLength ?? 0) > maxBytes)
        throw new Error('Objeto ausente ou acima do limite.');
      const chunks: Buffer[] = [];
      let size = 0;
      for await (const chunk of object.Body as Readable) {
        const bytes = Buffer.isBuffer(chunk)
          ? chunk
          : Buffer.from(chunk as Uint8Array);
        size += bytes.length;
        if (size > maxBytes) {
          (object.Body as Readable).destroy();
          throw new Error('Limite excedido.');
        }
        chunks.push(bytes);
      }
      return Buffer.concat(chunks);
    } catch {
      throw new InternalServerErrorException(
        'Não foi possível ler o arquivo: ausente, indisponível ou acima do limite.',
      );
    }
  }

  async copyObject(sourceUrl: string, destinationKey: string): Promise<string> {
    if (!this.client || !this.bucket || !this.publicUrl) {
      throw new InternalServerErrorException('Storage não configurado.');
    }

    const sourceKey = this.resolveStorageKeyFromUrl(sourceUrl);
    if (!sourceKey) {
      throw new InternalServerErrorException(
        'Não foi possível resolver a chave do arquivo de origem.',
      );
    }

    try {
      await this.client.send(
        new CopyObjectCommand({
          Bucket: this.bucket,
          CopySource: `${this.bucket}/${sourceKey}`,
          Key: destinationKey,
        }),
      );
    } catch {
      throw new InternalServerErrorException(
        'Não foi possível copiar o arquivo no storage.',
      );
    }

    return this.buildPublicUrlFromKey(destinationKey);
  }

  isConfigured(): boolean {
    return this.client !== null && this.bucket !== null;
  }

  getBucket(): string {
    if (!this.bucket) {
      throw new InternalServerErrorException('Storage bucket não configurado.');
    }
    return this.bucket;
  }

  getPublicUrl(): string | null {
    return this.publicUrl;
  }

  shouldSignUrl(tipo?: AttachmentType): boolean {
    if (!tipo) return false;
    if (tipo === AttachmentType.LINK) return false;
    return this.signedUrlsEnabled;
  }

  async signAttachmentUrl<T extends { tipo?: AttachmentType; url?: string }>(
    attachment: T,
  ): Promise<T> {
    if (!attachment || !attachment.url || !attachment.tipo) {
      return attachment;
    }

    if (!this.shouldSignUrl(attachment.tipo)) {
      return attachment;
    }

    const key = this.resolveStorageKeyFromUrl(attachment.url);
    if (!key || !this.bucket || !this.client) {
      return attachment;
    }

    try {
      const signedUrl = await this.signUrl({
        bucket: this.bucket,
        key,
      });
      return { ...attachment, url: signedUrl };
    } catch {
      return attachment;
    }
  }

  async signAttachmentUrls<T extends { tipo?: AttachmentType; url?: string }>(
    attachments: T[],
  ): Promise<T[]> {
    return Promise.all(
      attachments.map((attachment) => this.signAttachmentUrl(attachment)),
    );
  }
}
