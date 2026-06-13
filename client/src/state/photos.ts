// Test-result photos, stored in Supabase Storage.
//
// Why Storage (not the `progress` table): photos are big binary blobs and the
// progress table holds small JSON rows that get pushed on every tick/keystroke.
// Putting images there would bloat the row and the cloud sync. Instead each
// photo is one object in a private bucket, and only its short path string is
// kept in the synced test-results (so every device knows a photo exists and
// can fetch it).
//
// Layout: one object per user / test / round at
//   <userId>/<testId>/<day>.jpg
// Row-level security (see server/supabase-schema.sql) lets each signed-in user
// read/write only files under a folder named after their own user id.
//
// Before upload we resize + re-encode to a modest JPEG so phone photos (often
// several MB) land at a few hundred KB.
import { supabase } from "./supabase";

const BUCKET = "test-photos";
const MAX_DIM = 1200; // longest edge after resize, px
const QUALITY = 0.8;  // JPEG quality

function photoPath(userId: string, testId: string, day: number): string {
  return `${userId}/${testId}/${day}.jpg`;
}

async function currentUserId(): Promise<string | null> {
  if (!supabase) return null;
  const { data } = await supabase.auth.getSession();
  return data.session?.user.id ?? null;
}

// Resize a chosen image File down to a compressed JPEG Blob.
async function compress(file: File): Promise<Blob> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, MAX_DIM / Math.max(bitmap.width, bitmap.height));
  const w = Math.round(bitmap.width * scale);
  const h = Math.round(bitmap.height * scale);
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    bitmap.close?.();
    throw new Error("Could not process the image.");
  }
  ctx.drawImage(bitmap, 0, 0, w, h);
  bitmap.close?.();
  return await new Promise<Blob>((resolve, reject) =>
    canvas.toBlob(
      (b) => (b ? resolve(b) : reject(new Error("Could not process the image."))),
      "image/jpeg",
      QUALITY,
    ),
  );
}

// Upload (or replace) the photo for a test + round. Returns the storage path.
export async function uploadTestPhoto(testId: string, day: number, file: File): Promise<string> {
  if (!supabase) throw new Error("No cloud connection — sign in to upload photos.");
  const userId = await currentUserId();
  if (!userId) throw new Error("Sign in to upload photos.");
  const blob = await compress(file);
  const path = photoPath(userId, testId, day);
  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(path, blob, { upsert: true, contentType: "image/jpeg" });
  if (error) throw error;
  return path;
}

// A temporary signed URL (1h) for displaying a stored photo.
export async function getTestPhotoUrl(path: string): Promise<string | null> {
  if (!supabase) return null;
  const { data, error } = await supabase.storage.from(BUCKET).createSignedUrl(path, 3600);
  if (error) return null;
  return data.signedUrl;
}

// Remove a stored photo (best-effort).
export async function deleteTestPhoto(path: string): Promise<void> {
  if (!supabase) return;
  await supabase.storage.from(BUCKET).remove([path]);
}
