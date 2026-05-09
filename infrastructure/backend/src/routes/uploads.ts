// =============================================================================
// File Upload Routes - Cloudflare R2 Integration
// =============================================================================
// Handles file uploads (documents, photos) to Cloudflare R2 storage.
//
// WHY R2 over local storage:
// - VPS disk is limited and expensive to scale
// - R2 has zero egress fees (unlike S3)
// - Files survive VPS rebuilds/migrations
// - CDN-native: files served from Cloudflare edge
//
// WHY pre-signed URLs:
// - Client uploads directly to R2 (no backend bandwidth bottleneck)
// - Time-limited (1 hour) — can't be reused after expiry
// - Each URL is scoped to a specific file path
// =============================================================================

import { Router, Request, Response } from 'express';
import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { v4 as uuidv4 } from 'uuid';

export const uploadsRouter = Router();

// Initialize R2 client (R2 is S3-compatible)
const r2Client = new S3Client({
  region: 'auto',
  endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY || '',
  },
});

const BUCKET = process.env.R2_BUCKET_NAME || 'solarcrm-files';
const PUBLIC_URL = process.env.R2_PUBLIC_URL || '';

// Allowed file types and max sizes
const ALLOWED_TYPES: Record<string, number> = {
  'image/jpeg': 10 * 1024 * 1024,     // 10MB
  'image/png': 10 * 1024 * 1024,
  'image/webp': 10 * 1024 * 1024,
  'application/pdf': 25 * 1024 * 1024,  // 25MB
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 10 * 1024 * 1024,
};

// ─── GET UPLOAD URL (Pre-signed) ────────────────────────────────────────────
// Client requests a pre-signed URL, then uploads directly to R2
uploadsRouter.post('/presign', async (req: Request, res: Response) => {
  try {
    const { filename, contentType, folder } = req.body;

    if (!filename || !contentType) {
      res.status(400).json({ error: 'filename and contentType are required' });
      return;
    }

    if (!ALLOWED_TYPES[contentType]) {
      res.status(400).json({ error: `File type ${contentType} is not allowed` });
      return;
    }

    // Generate a unique file key to prevent collisions
    const ext = filename.split('.').pop();
    const fileKey = `${folder || 'general'}/${uuidv4()}.${ext}`;

    const command = new PutObjectCommand({
      Bucket: BUCKET,
      Key: fileKey,
      ContentType: contentType,
      // Metadata for tracking who uploaded what
      Metadata: {
        'uploaded-by': req.user?.email || 'unknown',
        'original-name': filename,
      },
    });

    // URL expires in 1 hour
    const uploadUrl = await getSignedUrl(r2Client, command, { expiresIn: 3600 });

    // The public URL where the file will be accessible after upload
    const publicUrl = PUBLIC_URL ? `${PUBLIC_URL}/${fileKey}` : fileKey;

    res.json({
      uploadUrl,
      fileKey,
      publicUrl,
    });
  } catch (err) {
    console.error('Error generating presigned URL:', err);
    res.status(500).json({ error: 'Failed to generate upload URL' });
  }
});

// ─── GET DOWNLOAD URL (Pre-signed, for private files) ───────────────────────
uploadsRouter.get('/download/:folder/:fileId', async (req: Request, res: Response) => {
  try {
    const fileKey = `${req.params.folder}/${req.params.fileId}`;

    const command = new GetObjectCommand({
      Bucket: BUCKET,
      Key: fileKey,
    });

    // Download URL expires in 1 hour
    const downloadUrl = await getSignedUrl(r2Client, command, { expiresIn: 3600 });
    res.json({ downloadUrl });
  } catch (err) {
    console.error('Error generating download URL:', err);
    res.status(500).json({ error: 'Failed to generate download URL' });
  }
});

// ─── DELETE FILE ────────────────────────────────────────────────────────────
uploadsRouter.delete('/:folder/:fileId', async (req: Request, res: Response) => {
  try {
    const fileKey = `${req.params.folder}/${req.params.fileId}`;

    await r2Client.send(new DeleteObjectCommand({
      Bucket: BUCKET,
      Key: fileKey,
    }));

    res.json({ message: 'File deleted', fileKey });
  } catch (err) {
    console.error('Error deleting file:', err);
    res.status(500).json({ error: 'Failed to delete file' });
  }
});
