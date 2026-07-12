// Test-result photos, stored in Supabase Storage.
//
// Why Storage (not the `progress` table): photos are big binary blobs and the
// progress table holds small JSON rows that get pushed on every tick/keystroke.
// Putting images there would bloat the row and the cloud sync. Instead each
// photo is one object in a private bucket, and only its short path string is
// kept in the synced test-results (so every device knows a photo exists and
// can fetch it).
//
// Layout: one object per uploaded photo (a test + round can have several) at
//   <userId>/<testId>/<day>/<unique>.jpg
// Row-level security (see server/supabase-schema.sql) lets each signed-in user
// read/write only files under a folder named after their own user id.
//
// Before upload we resize + re-encode to a modest JPEG so phone photos (often
// several MB) land at a few hundred KB.
import { supabase } from "./supabase";

const BUCKET = "test-photos";
const MAX_DIM = 1200; // longest edge after resize, px
const QUALITY = 0.8;  // JPEG quality
// Shown if the browser can't decode/re-encode the image (defined once so both
// failure points in compress() report the same message).
const COMPRESS_ERROR = "Could not process the image.";

// A UNIQUE object path per photo, so a test + round can hold several photos
// without them overwriting each other. The first path segment stays <userId> so
// the storage RLS ("each user only touches their own folder") still holds.
function photoPath(userId: string, testId: string, day: number): string {
  const unique = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  return `${userId}/${testId}/${day}/${unique}.jpg`;
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
    throw new Error(COMPRESS_ERROR);
  }
  ctx.drawImage(bitmap, 0, 0, w, h);
  bitmap.close?.();
  return await new Promise<Blob>((resolve, reject) =>
    canvas.toBlob(
      (b) => (b ? resolve(b) : reject(new Error(COMPRESS_ERROR))),
      "image/jpeg",
      QUALITY,
    ),
  );
}

// Upload ONE photo for a test + round (several are allowed). Returns its path.
export async function uploadTestPhoto(testId: string, day: number, file: File): Promise<string> {
  if (!supabase) throw new Error("No cloud connection — sign in to upload photos.");
  const userId = await currentUserId();
  if (!userId) throw new Error("Sign in to upload photos.");
  const blob = await compress(file);
  const path = photoPath(userId, testId, day); // unique per call
  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(path, blob, { upsert: false, contentType: "image/jpeg" });
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
