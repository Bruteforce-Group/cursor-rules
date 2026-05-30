#!/usr/bin/env node
/*
 * ClickUp task lifecycle helper for CI.
 *
 * Actions:
 *   - upsert: create or update a canonical task in a target list.
 *   - close:  mark the canonical task as closed.
 *
 * Required env:
 *   CLICKUP_API_TOKEN
 *
 * Recommended env:
 *   CLICKUP_TASK_LIST_ID (preferred explicit list ID)
 *   CLICKUP_TASK_LIST_NAME + CLICKUP_TASK_SPACE_NAME (dynamic resolution by name)
 *   CLICKUP_TRACKING_* / CLICKUP_DRIFT_* aliases are also supported.
 *
 * Optional env:
 *   CLICKUP_TASK_ACTION      ("upsert" | "close", default: "upsert")
 *   CLICKUP_TEAM_ID          optional explicit workspace/team ID for dynamic lookup
 *   CLICKUP_TASK_FALLBACK_LIST_ID
 *                            fallback list ID if dynamic lookup fails
 *   CLICKUP_TASK_RESOLVE_DEBUG
 *                            set to 1/true/on to emit resolution diagnostics
 *   CLICKUP_TASK_TITLE / CLICKUP_DRIFT_TITLE      task title (default set below)
 *   CLICKUP_TASK_BODY / CLICKUP_DRIFT_BODY        task markdown body
 *   CLICKUP_TASK_BODY_FILE / CLICKUP_DRIFT_BODY_FILE
 *                                               path to markdown body file (takes precedence)
 */

'use strict';

const fs = require('fs');
const https = require('https');

const API = 'https://api.clickup.com/api/v2';
const DEFAULT_TITLE = '[drift] ANVIL-sourced cursor rules out of sync';
// Known stable ANVIL Hub active dev list (used as final fallback).
const DEFAULT_FALLBACK_LIST_ID = '901614505478';
const DEBUG_FLAGS = new Set(['1', 'true', 'yes', 'on', 'debug']);

function requestJson(method, path, token, body = null) {
  return new Promise((resolve, reject) => {
    const payload = body ? JSON.stringify(body) : null;
    const req = https.request(
      `${API}${path}`,
      {
        method,
        headers: {
          Authorization: token,
          'Content-Type': 'application/json',
          ...(payload ? { 'Content-Length': Buffer.byteLength(payload) } : {}),
        },
      },
      (res) => {
        const chunks = [];
        res.on('data', (c) => chunks.push(c));
        res.on('end', () => {
          const text = Buffer.concat(chunks).toString('utf8');
          let json = {};
          try {
            json = text ? JSON.parse(text) : {};
          } catch {
            // Keep raw body in error path.
          }
          if (res.statusCode >= 200 && res.statusCode < 300) {
            resolve(json);
            return;
          }
          reject(
            new Error(
              `ClickUp ${method} ${path} -> HTTP ${res.statusCode}: ${text.slice(0, 500)}`,
            ),
          );
        });
      },
    );
    req.on('error', reject);
    if (payload) req.write(payload);
    req.end();
  });
}

async function listTasks(listId, token) {
  const tasks = [];
  for (let page = 0; page < 20; page += 1) {
    const q = `/list/${listId}/task?include_closed=true&subtasks=true&page=${page}`;
    const data = await requestJson('GET', q, token);
    const batch = data.tasks || [];
    tasks.push(...batch);
    if (batch.length < 100) break;
  }
  return tasks;
}

function latestMatchingTask(tasks, title) {
  return tasks
    .filter((t) => t.name === title)
    .sort((a, b) => Number(b.date_updated || 0) - Number(a.date_updated || 0))[0];
}

function readBody() {
  const bodyFile = process.env.CLICKUP_TASK_BODY_FILE || process.env.CLICKUP_DRIFT_BODY_FILE;
  if (bodyFile) {
    const p = bodyFile;
    return fs.readFileSync(p, 'utf8');
  }
  return process.env.CLICKUP_TASK_BODY || process.env.CLICKUP_DRIFT_BODY || '';
}

function normalize(value) {
  return String(value || '')
    .trim()
    .toLowerCase();
}

function isDebugEnabled() {
  const v = normalize(process.env.CLICKUP_TASK_RESOLVE_DEBUG);
  return DEBUG_FLAGS.has(v);
}

function logDebug(message) {
  if (isDebugEnabled()) console.log(`[clickup-resolve] ${message}`);
}

function pickByName(candidates, desired) {
  const wanted = normalize(desired);
  if (!wanted) return null;
  const exact = candidates.find((c) => normalize(c.name) === wanted);
  if (exact) return exact;
  return candidates.find((c) => normalize(c.name).includes(wanted)) || null;
}

async function discoverListByName(token, teamId, listName, spaceName) {
  if (!listName) return null;

  let resolvedTeamId = teamId;
  if (!resolvedTeamId) {
    const teams = await requestJson('GET', '/team', token);
    resolvedTeamId = teams?.teams?.[0]?.id || '';
    logDebug(`resolved team ID from /team: ${resolvedTeamId || 'none'}`);
  } else {
    logDebug(`using provided team ID: ${resolvedTeamId}`);
  }
  if (!resolvedTeamId) return null;

  const spaceResp = await requestJson('GET', `/team/${resolvedTeamId}/space?archived=false`, token);
  const spaces = spaceResp?.spaces || [];
  logDebug(`found ${spaces.length} space(s) in team ${resolvedTeamId}`);
  if (!spaces.length) return null;

  const preferredSpace = pickByName(spaces, spaceName);
  const spaceCandidates = preferredSpace ? [preferredSpace] : spaces;
  if (preferredSpace) {
    logDebug(`matched preferred space "${preferredSpace.name}" (${preferredSpace.id})`);
  } else {
    logDebug(`no exact/partial space match for "${spaceName}", searching all spaces`);
  }

  const allLists = [];
  for (const space of spaceCandidates) {
    const folderless = await requestJson('GET', `/space/${space.id}/list?archived=false`, token);
    for (const list of folderless?.lists || []) {
      allLists.push({ id: list.id, name: list.name, space: space.name, folder: null });
    }

    const folders = await requestJson('GET', `/space/${space.id}/folder?archived=false`, token);
    for (const folder of folders?.folders || []) {
      const lists = await requestJson('GET', `/folder/${folder.id}/list?archived=false`, token);
      for (const list of lists?.lists || []) {
        allLists.push({ id: list.id, name: list.name, space: space.name, folder: folder.name });
      }
    }
  }

  logDebug(`collected ${allLists.length} list candidate(s) for list match "${listName}"`);
  return pickByName(allLists, listName);
}

async function resolveListId(token) {
  const explicitListId = (
    process.env.CLICKUP_TASK_LIST_ID ||
    process.env.CLICKUP_TRACKING_LIST_ID ||
    process.env.CLICKUP_DRIFT_LIST_ID ||
    ''
  ).trim();
  if (explicitListId) {
    console.log(`Using explicit ClickUp list ID: ${explicitListId}`);
    logDebug('resolution path: explicit_id');
    return explicitListId;
  }

  const listName = (
    process.env.CLICKUP_TASK_LIST_NAME ||
    process.env.CLICKUP_TRACKING_LIST_NAME ||
    process.env.CLICKUP_DRIFT_LIST_NAME ||
    'ANVIL Hub Active Dev'
  ).trim();
  const spaceName = (
    process.env.CLICKUP_TASK_SPACE_NAME ||
    process.env.CLICKUP_TRACKING_SPACE_NAME ||
    process.env.CLICKUP_DRIFT_SPACE_NAME ||
    'AI Oversight & Governance'
  ).trim();
  const teamId = (process.env.CLICKUP_TEAM_ID || '').trim();
  logDebug(`resolution input: space="${spaceName}", list="${listName}", team="${teamId || 'auto'}"`);

  try {
    const found = await discoverListByName(token, teamId, listName, spaceName);
    if (found?.id) {
      console.log(`Resolved ClickUp list dynamically: "${found.space}" / "${found.name}" (${found.id})`);
      logDebug(`resolution path: dynamic_name (folder="${found.folder || 'none'}")`);
      return found.id;
    }
    console.warn(`Could not resolve ClickUp list by name "${spaceName}" / "${listName}".`);
    logDebug('resolution path: dynamic_name_miss');
  } catch (err) {
    console.warn(`Dynamic ClickUp list resolution failed: ${err.message || err}`);
    logDebug('resolution path: dynamic_name_error');
  }

  const fallbackListId = (
    process.env.CLICKUP_TASK_FALLBACK_LIST_ID ||
    process.env.CLICKUP_TRACKING_FALLBACK_LIST_ID ||
    process.env.CLICKUP_DRIFT_FALLBACK_LIST_ID ||
    DEFAULT_FALLBACK_LIST_ID
  ).trim();
  if (fallbackListId) {
    console.warn(`Falling back to ClickUp list ID: ${fallbackListId}`);
    logDebug('resolution path: fallback_id');
    return fallbackListId;
  }

  return '';
}

async function main() {
  const token = (process.env.CLICKUP_API_TOKEN || '').trim();
  const listId = await resolveListId(token);
  const action = (process.env.CLICKUP_TASK_ACTION || 'upsert').trim();
  const title = (process.env.CLICKUP_TASK_TITLE || process.env.CLICKUP_DRIFT_TITLE || DEFAULT_TITLE).trim();
  const body = readBody();

  if (!token) throw new Error('CLICKUP_API_TOKEN not set');
  if (!listId) {
    console.warn('No ClickUp list could be resolved; skipping ClickUp task automation.');
    return;
  }
  if (!['upsert', 'close'].includes(action)) {
    throw new Error(`Unsupported CLICKUP_TASK_ACTION="${action}"`);
  }

  const list = await requestJson('GET', `/list/${listId}`, token);
  const statuses = list.statuses || [];
  const openStatus = statuses.find((s) => s.type !== 'closed')?.status;
  const closedStatus = statuses.find((s) => s.type === 'closed')?.status;

  const tasks = await listTasks(listId, token);
  const existing = latestMatchingTask(tasks, title);

  if (action === 'close') {
    if (!existing) {
      console.log('No existing drift task found to close.');
      return;
    }
    if (!closedStatus) {
      console.warn(`No closed status found for list ${listId}; leaving task open.`);
      return;
    }
    await requestJson('PUT', `/task/${existing.id}`, token, {
      status: closedStatus,
      description: body || existing.description || '',
    });
    console.log(`Closed drift task: ${existing.id} (${title})`);
    return;
  }

  if (existing) {
    const patch = {
      description: body || existing.description || '',
    };
    const currentType = existing.status?.type || '';
    if (currentType === 'closed' && openStatus) patch.status = openStatus;
    await requestJson('PUT', `/task/${existing.id}`, token, patch);
    console.log(`Updated drift task: ${existing.id} (${title})`);
    return;
  }

  const createBody = {
    name: title,
    description: body,
    ...(openStatus ? { status: openStatus } : {}),
  };
  const created = await requestJson('POST', `/list/${listId}/task`, token, createBody);
  console.log(`Created drift task: ${created.id} (${title})`);
}

main().catch((err) => {
  console.error(err.message || err);
  process.exit(1);
});
