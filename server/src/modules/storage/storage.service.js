import { PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { r2 } from "../../config/r2.js";
import { env } from "../../config/env.config.js";

const BUCKET = env.R2_BUCKET;

export async function generatePresignedUploadUrl(key, contentType) {
  const command = new PutObjectCommand({ Bucket: BUCKET, Key: key, ContentType: contentType });
  return getSignedUrl(r2, command, { expiresIn: 300 }); // 5 min
}

export async function generatePresignedGetUrl(key) {
  const command = new GetObjectCommand({ Bucket: BUCKET, Key: key });
  return getSignedUrl(r2, command, { expiresIn: 3600 });
}

export async function deleteObject(key) {
  return r2.send(new DeleteObjectCommand({ Bucket: BUCKET, Key: key }));
}

export function buildKey(conversationId, filename) {
  return `conversations/${conversationId}/${crypto.randomUUID()}-${filename}`;
}