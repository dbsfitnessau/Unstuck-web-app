// account.ts - self-service account deletion (the "right to erasure").
//
// When a signed-in user taps "Delete my account", the browser sends their
// Supabase session token. Here we:
//   1. Verify the token with Supabase and learn WHICH user it is.
//   2. Delete that user's private photos from storage (best-effort).
//   3. Delete the auth user with the admin key - which CASCADES in the database
//      (profiles + progress rows are removed automatically, see supabase-schema.sql).
//
// Needs SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY (the same ones the auth verifier
// uses). Without them this module reports "not configured" and the endpoint
// returns 503, so the client falls back to an email erasure request.

const SUPABASE_URL = (() => {
  const raw = (process.env.SUPABASE_URL ?? "").trim();
  if (!raw) return "";
  try {
    return new URL(raw).origin;
  } catch {
    return "";
  }
})();
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";
const PHOTO_BUCKET = "test-photos";

export const accountDeletionConfigured = Boolean(SUPABASE_URL && SERVICE_KEY);

const adminHeaders = {
  apikey: SERVICE_KEY,
  Authorization: `Bearer ${SERVICE_KEY}`,
  "Content-Type": "application/json",
};

// Confirm the token belongs to a real signed-in user and return their id.
async function getUserId(token: string): Promise<string | null> {
  if (token.split(".").length !== 3) return null; // not a JWT (e.g. a beta code)
  try {
    const res = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
      headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${token}` },
    });
    if (!res.ok) return null;
    const user = (await res.json()) as { id?: string };
    return user.id ?? null;
  } catch {
    return null;
  }
}

// Best-effort: remove every photo under "<uid>/...". Storage isn't tied to the
// auth user by a foreign key, so we clean it up explicitly. We never let a
// storage hiccup block the account deletion itself.
async function deleteUserPhotos(uid: string): Promise<void> {
  async function list(prefix: string): Promise<{ name: string; id: string | null }[]> {
    const res = await fetch(`${SUPABASE_URL}/storage/v1/object/list/${PHOTO_BUCKET}`, {
      method: "POST",
      headers: adminHeaders,
      body: JSON.stringify({ prefix, limit: 1000, offset: 0 }),
    });
    if (!res.ok) return [];
    return (await res.json()) as { name: string; id: string | null }[];
  }

  try {
    const paths: string[] = [];
    // Top level under the user folder is one "folder" per testId.
    const testFolders = await list(`${uid}/`);
    for (const folder of testFolders) {
      if (folder.id === null) {
        // It's a sub-folder (a testId) - list the files inside it.
        const files = await list(`${uid}/${folder.name}/`);
        for (const f of files) paths.push(`${uid}/${folder.name}/${f.name}`);
      } else {
        paths.push(`${uid}/${folder.name}`);
      }
    }
    if (paths.length === 0) return;
    await fetch(`${SUPABASE_URL}/storage/v1/object/${PHOTO_BUCKET}`, {
      method: "DELETE",
      headers: adminHeaders,
      body: JSON.stringify({ prefixes: paths }),
    });
  } catch (err) {
    console.error("[account] photo cleanup failed (continuing):", err);
  }
}

// Delete the auth user. Cascades to profiles + progress via ON DELETE CASCADE.
async function deleteAuthUser(uid: string): Promise<boolean> {
  try {
    const res = await fetch(`${SUPABASE_URL}/auth/v1/admin/users/${uid}`, {
      method: "DELETE",
      headers: adminHeaders,
    });
    return res.ok;
  } catch (err) {
    console.error("[account] auth user delete failed:", err);
    return false;
  }
}

// The whole flow. Returns a small status the route turns into an HTTP code.
export async function deleteAccountByToken(
  token: string,
): Promise<"ok" | "unauthorized" | "failed"> {
  if (!accountDeletionConfigured) return "failed";
  const uid = await getUserId(token);
  if (!uid) return "unauthorized";
  await deleteUserPhotos(uid); // best-effort, before the user row goes
  const ok = await deleteAuthUser(uid);
  return ok ? "ok" : "failed";
}
