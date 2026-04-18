/**
 * @file uploadAudio.ts
 * @module src/storage/chatStorage
 *
 * Uploads a locally recorded audio file to Supabase Storage and returns
 * a permanent public URL safe to store in the database.
 *
 * Critical fixes over previous version:
 *  1. NO atob() — not guaranteed in React Native / Hermes without polyfill.
 *     Uses fetch(localUri) → Blob instead (the correct RN-native approach).
 *  2. File size validation before upload (configurable, default 10 MB).
 *  3. Exponential-backoff retry (3 attempts) for transient network errors.
 *  4. Typed errors — callers can distinguish user-facing errors from infra errors.
 *  5. Correct bucket: 'audio-messages'.
 *  6. Path: userId/timestamp.m4a — no collisions, easy per-user cleanup.
 *  7. Shared supabase client — never instantiates a new client.
 */

import { supabase } from "../../lib/supabase";

// ─── Constants ────────────────────────────────────────────────────────────────

const AUDIO_BUCKET          = "audio-messages";
const MAX_FILE_SIZE_BYTES   = 10 * 1024 * 1024; // 10 MB
const UPLOAD_RETRY_ATTEMPTS = 3;
const RETRY_BASE_DELAY_MS   = 500;

// ─── Error types ─────────────────────────────────────────────────────────────

export class AudioUploadError extends Error {
  constructor(
    message: string,
    public readonly code:
      | "FILE_TOO_LARGE"
      | "FILE_READ_FAILED"
      | "UPLOAD_FAILED"
      | "URL_FAILED",
  ) {
    super(message);
    this.name = "AudioUploadError";
  }
}

// ─── Internal helpers ─────────────────────────────────────────────────────────

/** Sleep for `ms` milliseconds. Used for retry back-off. */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Read a local file URI as a Blob.
 *
 * Using `fetch(localUri)` is the idiomatic React Native way to read local
 * files as binary without base64 encoding. The Expo file-system bridge
 * handles the `file://` → native stream conversion automatically.
 *
 * @throws {AudioUploadError} FILE_READ_FAILED if the URI can't be read.
 */
async function localUriToBlob(localUri: string): Promise<Blob> {
  try {
    const response = await fetch(localUri);
    if (!response.ok) {
      throw new Error(`fetch status ${response.status}`);
    }
    const blob = await response.blob();
    return blob;
  } catch (err) {
    throw new AudioUploadError(
      `Failed to read audio file from URI "${localUri}": ${(err as Error).message}`,
      "FILE_READ_FAILED",
    );
  }
}

/**
 * Upload a Blob to Supabase Storage with exponential-backoff retry.
 *
 * @throws {AudioUploadError} UPLOAD_FAILED after all retries exhausted.
 */
async function uploadWithRetry(
  path: string,
  blob: Blob,
  contentType: string,
): Promise<string> {
  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= UPLOAD_RETRY_ATTEMPTS; attempt++) {
    const { data, error } = await supabase.storage
      .from(AUDIO_BUCKET)
      .upload(path, blob, {
        contentType,
        upsert: false,
        // cacheControl: "3600" — public assets, 1h CDN cache
        cacheControl: "3600",
      });

    if (!error && data?.path) {
      return data.path;
    }

    lastError = error ?? new Error("Upload returned no data.path");

    if (attempt < UPLOAD_RETRY_ATTEMPTS) {
      // Exponential back-off: 500ms, 1000ms, 2000ms
      await sleep(RETRY_BASE_DELAY_MS * 2 ** (attempt - 1));
    }
  }

  throw new AudioUploadError(
    `Audio upload failed after ${UPLOAD_RETRY_ATTEMPTS} attempts: ${lastError?.message}`,
    "UPLOAD_FAILED",
  );
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Upload a locally recorded audio file to Supabase Storage.
 *
 * Flow:
 *  1. Validate file size via blob.size (no full read required upfront).
 *  2. Upload with retry to `audio-messages/{userId}/{timestamp}.m4a`.
 *  3. Return the permanent public URL for storage in the database.
 *
 * @param localUri  - `file://…` URI returned by expo-av after recording stops.
 * @param userId    - Authenticated user ID (from supabase.auth.getUser).
 * @returns         Permanent public HTTPS URL, safe to store in the database.
 *
 * @throws {AudioUploadError} with typed code for UI-level error handling.
 *
 * @example
 * ```ts
 * try {
 *   const publicUrl = await uploadAudio(recording.uri, user.id);
 *   await sendMessage({ type: 'audio', url: publicUrl, ... });
 * } catch (err) {
 *   if (err instanceof AudioUploadError && err.code === 'FILE_TOO_LARGE') {
 *     showToast(t('errors.audioTooLarge'));
 *   } else {
 *     showToast(t('errors.audioUploadFailed'));
 *   }
 * }
 * ```
 */
export async function uploadAudio(localUri: string, userId: string): Promise<string> {
  // Step 1 — Read file as Blob (React Native native, no base64/atob needed)
  const blob = await localUriToBlob(localUri);

  // Step 2 — Size guard (before spending bandwidth)
  if (blob.size > MAX_FILE_SIZE_BYTES) {
    throw new AudioUploadError(
      `Audio file is ${(blob.size / 1024 / 1024).toFixed(1)} MB, exceeds ${MAX_FILE_SIZE_BYTES / 1024 / 1024} MB limit.`,
      "FILE_TOO_LARGE",
    );
  }

  // Step 3 — Determine content type from blob or fall back to m4a
  // expo-av records as m4a on iOS and webm/opus on Android in some configs.
  const contentType = blob.type && blob.type !== "application/octet-stream"
    ? blob.type
    : "audio/m4a";

  // Step 4 — Build a collision-free storage path
  const extension = contentType.includes("webm") ? "webm" : "m4a";
  const storagePath = `${userId}/${Date.now()}.${extension}`;

  // Step 5 — Upload with retry
  const uploadedPath = await uploadWithRetry(storagePath, blob, contentType);

  // Step 6 — Resolve to permanent public URL
  const { data: publicData } = supabase.storage
    .from(AUDIO_BUCKET)
    .getPublicUrl(uploadedPath);

  if (!publicData?.publicUrl) {
    throw new AudioUploadError(
      "Supabase returned no public URL after successful upload.",
      "URL_FAILED",
    );
  }

  return publicData.publicUrl;
}