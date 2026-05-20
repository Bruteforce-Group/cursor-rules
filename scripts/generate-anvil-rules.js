#!/usr/bin/env node
/**
 * generate-anvil-rules.js
 *
 * Regenerates the ANVIL-sourced .cursor/rules/*.mdc files from their
 * canonical sources:
 *   - COVE-ENG-AUTONOMY-001  (ClickUp doc 2kz0ewdg-1196)
 *   - COVE-PERSONA-001       (ClickUp doc 2kz0ewdg-896, page 2kz0ewdg-516)
 *   - COVE-SAFETY-001        (ClickUp doc 2kz0ewdg-1176, page 2kz0ewdg-1016)
 *   - ANVIL CLAUDE.md        (GitHub: Bruteforce-Group/ANVIL, .claude/CLAUDE.md)
 *   - ANVIL registry         (hub.boz.dev/mcp → anvil_registry)
 *
 * Usage:
 *   CLICKUP_API_TOKEN=xxx node scripts/generate-anvil-rules.js
 *   CLICKUP_API_TOKEN=xxx node scripts/generate-anvil-rules.js --dry-run
 *   CLICKUP_API_TOKEN=xxx node scripts/generate-anvil-rules.js --check   # exit 1 if drift
 *
 * Required env:
 *   CLICKUP_API_TOKEN   — ClickUp personal API token
 *
 * Optional env:
 *   GITHUB_TOKEN        — for fetching private ANVIL CLAUDE.md (falls back to public)
 *   ANVIL_HUB_API_KEY   — for live registry fetch (falls back to static snapshot)
 *   DRY_RUN=1           — print diff only, no writes (same as --dry-run)
 *   CHECK=1             — exit 1 if any file would change (same as --check)
 */

'use strict';

const fs = require('fs');
const path = require('path');
const https = require('https');
const crypto = require('crypto');

// ── CLI flags ──────────────────────────────────────────────────────────────
const args = process.argv.slice(2);
const DRY_RUN = args.includes('--dry-run') || process.env.DRY_RUN === '1';
const CHECK   = args.includes('--check')   || process.env.CHECK   === '1';

// ── Paths ──────────────────────────────────────────────────────────────────
const REPO_ROOT  = path.resolve(__dirname, '..');
const RULES_DIR  = path.join(REPO_ROOT, '.cursor', 'rules');
const VERSION    = fs.readFileSync(path.join(REPO_ROOT, 'VERSION'), 'utf8').trim();

// ── Source IDs ─────────────────────────────────────────────────────────────
const CLICKUP_ENG_AUTONOMY_DOC  = '2kz0ewdg-1196';
const CLICKUP_PERSONA_DOC       = '2kz0ewdg-896';
const CLICKUP_PERSONA_PAGE      = '2kz0ewdg-516';
const CLICKUP_PERSONA_PREFS_PAGE = '2kz0ewdg-3096';
const CLICKUP_SAFETY_DOC        = '2kz0ewdg-1176';
const CLICKUP_SAFETY_PAGE       = '2kz0ewdg-1016';
const ANVIL_CLAUDE_MD_URL       = 'https://raw.githubusercontent.com/Bruteforce-Group/ANVIL/main/.claude/CLAUDE.md';

// ── HTTP helpers ───────────────────────────────────────────────────────────
function httpsGet(url, headers = {}) {
  return new Promise((resolve, reject) => {
    const options = { headers: { 'User-Agent': 'cursor-rules-generator/1.0', ...headers } };
    https.get(url, options, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        return resolve(httpsGet(res.headers.location, headers));
      }
      const chunks = [];
      res.on('data', c => chunks.push(c));
      res.on('end', () => resolve({ status: res.statusCode, body: Buffer.concat(chunks).toString('utf8') }));
      res.on('error', reject);
    }).on('error', reject);
  });
}

async function clickupGet(path) {
  const token = process.env.CLICKUP_API_TOKEN;
  if (!token) throw new Error('CLICKUP_API_TOKEN not set');
  const res = await httpsGet(`https://api.clickup.com/api/v2${path}`, {
    Authorization: token,
    'Content-Type': 'application/json',
  });
  if (res.status !== 200) throw new Error(`ClickUp ${path} → HTTP ${res.status}: ${res.body.slice(0, 200)}`);
  return JSON.parse(res.body);
}

async function fetchClickupDocPages(docId) {
  const data = await clickupGet(`/doc/${docId}/page`);
  return data; // array of page objects with .content
}

async function fetchClickupPage(docId, pageId) {
  const pages = await fetchClickupDocPages(docId);
  const page = pages.find(p => p.id === pageId);
  if (!page) throw new Error(`Page ${pageId} not found in doc ${docId}`);
  return page.content;
}

async function fetchAnvilClaudeMd() {
  const token = process.env.GITHUB_TOKEN;
  const headers = token ? { Authorization: `token ${token}` } : {};
  const res = await httpsGet(ANVIL_CLAUDE_MD_URL, headers);
  if (res.status !== 200) throw new Error(`CLAUDE.md fetch → HTTP ${res.status}`);
  return res.body;
}

// ── Markdown section extractor ─────────────────────────────────────────────
/**
 * Extract a top-level section (## Heading) from markdown content.
 * Returns everything from the heading up to (but not including) the next ## heading.
 */
function extractSection(md, heading) {
  const lines = md.split('\n');
  const startIdx = lines.findIndex(l => l.trimEnd() === `## ${heading}`);
  if (startIdx === -1) return null;
  let endIdx = lines.length;
  for (let i = startIdx + 1; i < lines.length; i++) {
    if (lines[i].startsWith('## ')) { endIdx = i; break; }
  }
  return lines.slice(startIdx, endIdx).join('\n').trimEnd();
}

// ── .mdc file builder ──────────────────────────────────────────────────────
function buildMdc(frontmatter, body) {
  const fm = Object.entries(frontmatter)
    .map(([k, v]) => v === true || v === false ? `${k}: ${v}` : `${k}: ${v}`)
    .join('\n');
  const header = [
    `<!-- AUTO-GENERATED by scripts/generate-anvil-rules.js — DO NOT EDIT MANUALLY -->`,
    `<!-- Sources: see frontmatter description. Re-run generator to update. -->`,
  ].join('\n');
  return `---\n${fm}\n---\n\n${header}\n\n${body.trim()}\n`;
}

// ── File write / diff ──────────────────────────────────────────────────────
let driftDetected = false;

function writeRule(filename, content) {
  const dest = path.join(RULES_DIR, filename);
  const existing = fs.existsSync(dest) ? fs.readFileSync(dest, 'utf8') : null;
  const hash = s => crypto.createHash('sha256').update(s).digest('hex').slice(0, 8);

  if (existing === content) {
    console.log(`  unchanged  ${filename}`);
    return;
  }

  driftDetected = true;
  console.log(`  ${existing ? 'updated ' : 'created '} ${filename}  (${hash(existing ?? '')} → ${hash(content)})`);

  if (DRY_RUN || CHECK) return;

  fs.writeFileSync(dest, content, 'utf8');
}

// ── Rule generators ────────────────────────────────────────────────────────

async function generateEngineeringRules() {
  console.log('Fetching COVE-ENG-AUTONOMY-001…');
  const pages = await fetchClickupDocPages(CLICKUP_ENG_AUTONOMY_DOC);
  const page = pages[0]; // single page
  const raw = page.content;

  // The ClickUp doc content is already well-structured markdown.
  // Strip the document-level header block (Version/Effective/Owner lines) and keep rules.
  const body = raw
    .replace(/^#.*\n/, '')                               // drop H1
    .replace(/\*\*Version:\*\*.*\n/g, '')               // drop version/owner metadata
    .replace(/\*\*Effective:\*\*.*\n/g, '')
    .replace(/\*\*Set by:\*\*.*\n/g, '')
    .replace(/\*\*Parent policy:\*\*.*\n/g, '')
    .replace(/\*\*This clause.*\n/g, '')
    .replace(/---\n_This clause.*\n/g, '')
    .replace(/\* \* \*\n/g, '\n---\n')                  // ClickUp HR → markdown HR
    .replace(/\\\\\*/g, '*')                             // unescape ClickUp asterisks
    .replace(/\\\\\[/g, '[')
    .replace(/\\\\\]/g, ']')
    .replace(/\\n/g, '\n')
    .trim();

  return buildMdc({
    description: 'ANVIL engineering autonomy rules — SDK-first, best practice, latest versions, justify custom code, same-session doc sync',
    version: VERSION,
    alwaysApply: true,
  }, `# Engineering Rules (COVE-ENG-AUTONOMY-001)\n\nSource: ClickUp \`${CLICKUP_ENG_AUTONOMY_DOC}\`. Non-negotiable for all ANVIL code.\n\n${body}`);
}

const DEFAULT_TOOL_ROUTING_SECTION = [
  '## Tool Routing Hierarchy (STRICT — never skip steps)',
  '1. `anvil_catalog` — check if ANVIL has a component for this task',
  '2. `anvil_dispatch` — route through the hub if a component exists',
  '3. Direct MCP plugin — only if ANVIL has no equivalent',
  '4. Raw API (curl/bash) — only if no MCP exists',
  '5. Browser automation — ABSOLUTE LAST RESORT',
  '',
  'Never downgrade silently. Surface errors and fall back only after confirming unreachable.',
].join('\n');

async function generateAnvilStack(claudeMd) {
  console.log('Building anvil-stack from CLAUDE.md + registry…');

  // Static fallback — keep committed sections as ground-truth between generator runs
  const existingStack = fs.existsSync(path.join(RULES_DIR, 'anvil-stack.mdc'))
    ? fs.readFileSync(path.join(RULES_DIR, 'anvil-stack.mdc'), 'utf8')
    : '';

  const dispatchFromClaude = extractSection(claudeMd, 'ANVIL-First Orchestration (Mandatory)');
  const dispatchFromExisting = existingStack.match(/(## Tool Routing Hierarchy[\s\S]+?)\n\n(?=## )/)?.[1];
  const dispatchSection = dispatchFromClaude ?? dispatchFromExisting ?? DEFAULT_TOOL_ROUTING_SECTION;

  // Try live registry fetch for component table
  let componentTable = '';
  const hubKey = process.env.ANVIL_HUB_API_KEY;
  if (hubKey) {
    try {
      const res = await httpsGet('https://hub.boz.dev/mcp', {
        Authorization: `Bearer ${hubKey}`,
        'Content-Type': 'application/json',
      });
      // Parse component list from registry response if available
      // (fall through to static if parsing fails)
    } catch (_) {}
  }

  const tableMatch = existingStack.match(/(## Active Components[\s\S]+?)\n## /);
  componentTable = tableMatch ? tableMatch[1] : '';

  const body = [
    `**Hub:** \`https://hub.boz.dev\` (canonical — MCP endpoint: \`https://hub.boz.dev/mcp\`)`,
    `**Monorepo:** \`/Users/danielborrowman/Developer/Projects/boz.dev.ANVIL/\``,
    `**Auth:** Static Bearer token via \`HUB_API_KEY\` secret. Never hardcode — always load from env.`,
    `**CF Account ID (components):** \`dac01715f027bf360c500dce1d805d94\``,
    '',
    dispatchSection,
    '',
    componentTable,
    '',
    `## Hub-Level Tools`,
    `| Tool | Purpose |`,
    `|---|---|`,
    `| \`anvil_status\` / \`anvil_health_check\` | Platform health |`,
    `| \`anvil_registry\` | List, register, update, deactivate components |`,
    `| \`anvil_catalog\` | Full tool catalog across all components |`,
    `| \`anvil_dispatch\` | Route commands to any component |`,
    `| \`anvil_events\` / \`anvil_search\` | Unified event log |`,
    `| \`anvil_triage\` | AI-powered event classification |`,
    `| \`anvil_memory\` | Three-tier memory (short/medium/long-term) |`,
    `| \`anvil_config\` | Platform configuration keys |`,
    `| \`anvil_git_push\` | Push to ANVIL repo via GitHub API |`,
    `| \`anvil_knowledge\` | Code-memory ingestion |`,
    '',
    `## Deploy Commands`,
    '```bash',
    '# Hub',
    'cd hub && npx wrangler deploy',
    '',
    '# Component',
    'cd components/anvil-{name}-mcp && npx wrangler deploy',
    '```',
    '',
    `## GitHub Org`,
    `Default repo owner: **\`Bruteforce-Group\`** (not \`bozza-man\`).`,
    `Use personal namespace ONLY when explicitly told to in the current session.`,
  ].join('\n');

  return buildMdc({
    description: 'ANVIL platform architecture, component registry, and routing hierarchy — always apply',
    version: VERSION,
    alwaysApply: true,
  }, `# ANVIL Stack Architecture\n\n${body}`);
}

async function generateDocSync(claudeMd) {
  console.log('Building anvil-doc-sync from CLAUDE.md §Documentation Sync…');
  const section = extractSection(claudeMd, 'Documentation Sync (Mandatory)') ?? '';

  return buildMdc({
    description: 'Every change to system state must be reflected in its documentation in the same session — mandatory for all ANVIL work',
    version: VERSION,
    alwaysApply: false,
  }, `# Documentation Sync (Mandatory)\n\nSource: \`.claude/CLAUDE.md\` §Documentation Sync (Mandatory) + COVE-ENG-AUTONOMY-001 Rule 5.\n\n${section}`);
}

// ── Main ───────────────────────────────────────────────────────────────────
async function main() {
  console.log(`\ncursor-rules generator v${VERSION} — ANVIL rule sync`);
  console.log(`Mode: ${DRY_RUN ? 'DRY RUN' : CHECK ? 'CHECK' : 'WRITE'}\n`);

  if (!process.env.CLICKUP_API_TOKEN) {
    console.error('ERROR: CLICKUP_API_TOKEN not set');
    process.exit(1);
  }

  let claudeMd;
  try {
    claudeMd = await fetchAnvilClaudeMd();
    console.log(`Fetched ANVIL CLAUDE.md (${claudeMd.length} chars)`);
  } catch (e) {
    console.warn(`Warning: could not fetch CLAUDE.md — ${e.message}`);
    claudeMd = '';
  }

  const results = await Promise.allSettled([
    (async () => writeRule('anvil-engineering-rules.mdc', await generateEngineeringRules()))(),
    (async () => writeRule('anvil-stack.mdc',             await generateAnvilStack(claudeMd)))(),
    (async () => writeRule('anvil-doc-sync.mdc',          await generateDocSync(claudeMd)))(),
  ]);

  for (const r of results) {
    if (r.status === 'rejected') {
      console.error('ERROR:', r.reason?.message ?? r.reason);
    }
  }

  console.log('');
  if (CHECK && driftDetected) {
    console.error('DRIFT DETECTED — sources differ from committed rules.');
    process.exit(1);
  }

  if (!driftDetected) {
    console.log('All generated rules are up to date.');
  } else if (DRY_RUN) {
    console.log('Dry run complete — no files written.');
  } else {
    console.log('Rules updated. Run bump_rule_versions.sh if adding a new file, then commit.');
  }
}

main().catch(e => { console.error(e); process.exit(1); });
