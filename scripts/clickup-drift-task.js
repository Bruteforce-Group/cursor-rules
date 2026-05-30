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
 *   CLICKUP_TASK_LIST_ID (preferred)
 *   CLICKUP_TRACKING_LIST_ID / CLICKUP_DRIFT_LIST_ID (fallback aliases)
 *   If no list ID is provided, script exits 0 with a warning.
 *
 * Optional env:
 *   CLICKUP_TASK_ACTION      ("upsert" | "close", default: "upsert")
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

async function main() {
  const token = (process.env.CLICKUP_API_TOKEN || '').trim();
  const listId = (
    process.env.CLICKUP_TASK_LIST_ID ||
    process.env.CLICKUP_TRACKING_LIST_ID ||
    process.env.CLICKUP_DRIFT_LIST_ID ||
    ''
  ).trim();
  const action = (process.env.CLICKUP_TASK_ACTION || 'upsert').trim();
  const title = (process.env.CLICKUP_TASK_TITLE || process.env.CLICKUP_DRIFT_TITLE || DEFAULT_TITLE).trim();
  const body = readBody();

  if (!token) throw new Error('CLICKUP_API_TOKEN not set');
  if (!listId) {
    console.warn('No ClickUp task list ID set; skipping ClickUp task automation.');
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
