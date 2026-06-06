// env.ts — loads server/.env into process.env. Import this FIRST, before any module
// that reads process.env (coach.ts, index.ts).
//
// Two deliberate choices:
//   path:     resolved relative to THIS file (/server/.env), so it works no matter what
//             directory the server is launched from.
//   override: true — the host shell here already defines an EMPTY `ANTHROPIC_API_KEY`,
//             and by default dotenv won't replace a variable that already exists. Without
//             override, our real key in .env would be silently ignored. .env is the
//             source of truth for this server, so overriding the ambient value is correct.

import { config } from "dotenv";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const here = dirname(fileURLToPath(import.meta.url)); // /server/src
config({ path: resolve(here, "..", ".env"), override: true });
