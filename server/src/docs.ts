// docs.ts — loads the four UNSTUCK source-of-truth documents from disk and stitches
// them into ONE big string. That string becomes Claude's cached context block, so the
// coach answers from the real program rather than guessing.
//
// We read the files ONCE at startup (see the exported constant at the bottom). Reusing
// the exact same string on every request matters: Anthropic's prompt cache only "hits"
// when the cached text is byte-for-byte identical, so we don't want to re-read/rebuild it.

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

// Figure out where the source docs live. __dirname doesn't exist in ES modules, so we
// derive it from import.meta.url: /server/src → up two levels → the project root.
const here = dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = resolve(here, "..", "..");
const DOCS_DIR = process.env.DOCS_DIR ?? PROJECT_ROOT;

// The four docs that feed the coach. _REVISED / FirstTimer are the current versions
// (see CLAUDE.md). Order: big-picture program first, then the day-of and reference docs.
const DOC_FILES = [
  "UNSTUCK_01_Main_Program_REVISED.md",
  "UNSTUCK_01a_Daily_Quick_Cards_REVISED.md",
  "UNSTUCK_02_Mobility_Science_Cheatsheet_REVISED.md",
  "UNSTUCK_03_Progress_Worksheet_FirstTimer.md",
];

function buildDocsBlock(): string {
  const parts = DOC_FILES.map((file) => {
    const full = resolve(DOCS_DIR, file);
    const text = readFileSync(full, "utf8");
    // A clear delimiter so Claude can tell the documents apart.
    return `===== BEGIN DOCUMENT: ${file} =====\n\n${text}\n\n===== END DOCUMENT: ${file} =====`;
  });
  return parts.join("\n\n\n");
}

// Built once when the server boots. If a file is missing, this throws on startup
// (loud and early) rather than silently shipping an empty-context coach.
export const DOCS_BLOCK = buildDocsBlock();
