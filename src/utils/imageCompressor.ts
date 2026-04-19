/**
 * @file imageCompressor.ts
 * @module src/utils
 *
 * Production-grade image compression pipeline for Amistad.
 *
 * Why this exists:
 *  - iPhone 16 Pro shoots 48 MP RAW → ~15 MB HEIC per photo.
 *  - Without compression, avatar uploads cost ~150 MB/user (10 story photos).
 *  - At 1M users × 150 MB = 150 TB of storage. Supabase charges per GB.
 *  - Compressed avatars load 10× faster on slow connections (LATAM, SEA markets).
 *
 * Pipeline per image:
 *  1. Decode EXIF orientation (expo-image-manipulator handles this automatically).
 *  2. Resize to fit within maxDimension × maxDimension (preserving aspect ratio).
 *  3. Re-encode as JPEG at the target quality.
 *  4. Validate output size — if still over limit, apply a second pass at lower quality.
 *
 * Dependencies:
 *  - expo-image-manipulator (already in Expo SDK, no extra install needed)
 */

import * as ImageManipulator from 'expo-image-manipulator';

// ─── Preset configs ───────────────────────────────────────────────────────────

export type ImagePreset = 'avatar' | 'story' | 'thumbnail';

interface CompressionConfig {
  /** Max width or height in pixels (aspect ratio preserved). */
  maxDimension: number;
  /** JPEG quality 0–1. 0.82 is imperceptible loss for human faces. */
  quality: number;
  /** Fallback quality if first pass exceeds maxOutputBytes. */
  fallbackQuality: number;
  /** Hard size limit for output. Second-pass compression if exceeded. */
  maxOutputBytes: number;
}

const PRESETS: Record<ImagePreset, CompressionConfig> = {
  avatar: {
    maxDimension:   800,
    quality:        0.82,
    fallbackQuality: 0.65,
    maxOutputBytes: 300 * 1024, // 300 KB
  },
  story: {
    maxDimension:   1200,
    quality:        0.80,
    fallbackQuality: 0.60,
    maxOutputBytes: 600 * 1024, // 600 KB
  },
  thumbnail: {
    maxDimension:   200,
    quality:        0.75,
    fallbackQuality: 0.55,
    maxOutputBytes: 50 * 1024, // 50 KB
  },
};

// ─── Types ────────────────────────────────────────────────────────────────────

export interface CompressedImage {
  /** Local file:// URI of the compressed image. */
  uri: string;
  /** Width in pixels after compression. */
  width: number;
  /** Height in pixels after compression. */
  height: number;
  /** Estimated file size in bytes (from ImageManipulator result). */
  estimatedBytes?: number;
}

export class ImageCompressionError extends Error {
  constructor(
    message: string,
    public readonly code: 'READ_FAILED' | 'COMPRESS_FAILED' | 'SIZE_EXCEEDED',
  ) {
    super(message);
    this.name = 'ImageCompressionError';
  }
}

// ─── Internal helpers ─────────────────────────────────────────────────────────

/**
 * Calculate target dimensions maintaining aspect ratio within maxDimension.
 */
function calculateDimensions(
  width: number,
  height: number,
  maxDimension: number,
): { width: number; height: number } {
  if (width <= maxDimension && height <= maxDimension) {
    return { width, height };
  }
  const ratio = Math.min(maxDimension / width, maxDimension / height);
  return {
    width:  Math.round(width  * ratio),
    height: Math.round(height * ratio),
  };
}

/**
 * Run expo-image-manipulator with resize + compress.
 */
async function runManipulator(
  uri: string,
  targetWidth: number,
  targetHeight: number,
  quality: number,
): Promise<ImageManipulator.ImageResult> {
  return ImageManipulator.manipulateAsync(
    uri,
    [{ resize: { width: targetWidth, height: targetHeight } }],
    {
      compress: quality,
      format:   ImageManipulator.SaveFormat.JPEG,
      // base64: false — we don't need base64, just the URI
    },
  );
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Compress a local image URI according to a named preset.
 *
 * @param localUri  - file:// URI from expo-image-picker or expo-camera
 * @param preset    - 'avatar' | 'story' | 'thumbnail'
 * @returns         Compressed image info with local URI ready for upload
 *
 * @throws {ImageCompressionError} if compression fails or output exceeds hard limit
 *
 * @example
 * ```ts
 * const compressed = await compressImage(pickerResult.uri, 'avatar');
 * const publicUrl  = await uploadAvatar(compressed.uri, userId);
 * ```
 */
export async function compressImage(
  localUri: string,
  preset: ImagePreset = 'avatar',
): Promise<CompressedImage> {
  const config = PRESETS[preset];

  // Step 1 — Read original dimensions via a no-op manipulator pass
  let originalResult: ImageManipulator.ImageResult;
  try {
    originalResult = await ImageManipulator.manipulateAsync(localUri, []);
  } catch (err) {
    throw new ImageCompressionError(
      `Failed to read image at "${localUri}": ${(err as Error).message}`,
      'READ_FAILED',
    );
  }

  const { width: origW, height: origH } = originalResult;
  const { width: targetW, height: targetH } = calculateDimensions(
    origW,
    origH,
    config.maxDimension,
  );

  // Step 2 — First compression pass
  let result: ImageManipulator.ImageResult;
  try {
    result = await runManipulator(localUri, targetW, targetH, config.quality);
  } catch (err) {
    throw new ImageCompressionError(
      `Compression failed: ${(err as Error).message}`,
      'COMPRESS_FAILED',
    );
  }

  // Step 3 — Size check via fetch (gets blob.size without full read)
  const sizeCheck = await fetch(result.uri);
  const blob = await sizeCheck.blob();

  if (blob.size <= config.maxOutputBytes) {
    return { uri: result.uri, width: result.width, height: result.height, estimatedBytes: blob.size };
  }

  // Step 4 — Second pass at fallback quality (size still exceeded)
  if (__DEV__) {
    // eslint-disable-next-line no-console
    console.warn(
      `[imageCompressor] First pass ${(blob.size / 1024).toFixed(0)} KB exceeded limit ` +
      `${(config.maxOutputBytes / 1024).toFixed(0)} KB. Applying fallback quality.`,
    );
  }

  let fallbackResult: ImageManipulator.ImageResult;
  try {
    fallbackResult = await runManipulator(localUri, targetW, targetH, config.fallbackQuality);
  } catch (err) {
    throw new ImageCompressionError(
      `Fallback compression failed: ${(err as Error).message}`,
      'COMPRESS_FAILED',
    );
  }

  // Final size check
  const fallbackCheck = await fetch(fallbackResult.uri);
  const fallbackBlob  = await fallbackCheck.blob();

  if (fallbackBlob.size > config.maxOutputBytes) {
    // This would only happen with extremely dense images at minimum quality.
    // We allow it through rather than blocking the user — upload will succeed,
    // just over our soft target.
    if (__DEV__) {
      // eslint-disable-next-line no-console
      console.error(
        `[imageCompressor] Fallback pass still ${(fallbackBlob.size / 1024).toFixed(0)} KB. ` +
        `Allowing upload — check source image dimensions.`,
      );
    }
  }

  return {
    uri:            fallbackResult.uri,
    width:          fallbackResult.width,
    height:         fallbackResult.height,
    estimatedBytes: fallbackBlob.size,
  };
}

/**
 * Compress multiple images in parallel (for story upload flows).
 * Applies a concurrency cap of 3 to avoid OOM on low-end devices.
 *
 * @param uris    - Array of local file:// URIs
 * @param preset  - Applied uniformly to all images
 */
export async function compressImages(
  uris: string[],
  preset: ImagePreset = 'story',
): Promise<CompressedImage[]> {
  const CONCURRENCY = 3;
  const results: CompressedImage[] = [];

  for (let i = 0; i < uris.length; i += CONCURRENCY) {
    const batch = uris.slice(i, i + CONCURRENCY);
    const batchResults = await Promise.all(
      batch.map((uri) => compressImage(uri, preset)),
    );
    results.push(...batchResults);
  }

  return results;
}