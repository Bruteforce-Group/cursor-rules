#!/usr/bin/env node

import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(HERE, '../..');
const DEFAULT_PROFILE = path.join(os.homedir(), '.anvil', 'cursor-team-playwright-profile');

function parseArgs(argv) {
  const args = {
    apply: false,
    headless: false,
    keepOpen: false,
    channel: 'chrome',
    profileDir: DEFAULT_PROFILE,
    baseUrl: undefined,
    timeoutMs: 10 * 60 * 1000,
    slowMo: 75,
    skipCloudEnvironment: false,
    cloudOnly: false,
    environmentName: undefined,
    runtimeSecretName: 'GH_PAT',
    runtimeSecretFile: undefined,
    rebuildEnvironment: true,
  };
  for (let index = 0; index < argv.length; index += 1) {
    const value = argv[index];
    if (value === '--apply') args.apply = true;
    else if (value === '--dry-run') args.apply = false;
    else if (value === '--headless') args.headless = true;
    else if (value === '--headed') args.headless = false;
    else if (value === '--keep-open') args.keepOpen = true;
    else if (value === '--skip-cloud-environment') args.skipCloudEnvironment = true;
    else if (value === '--cloud-only') args.cloudOnly = true;
    else if (value === '--skip-rebuild') args.rebuildEnvironment = false;
    else if (value === '--channel') args.channel = argv[++index];
    else if (value === '--profile-dir') args.profileDir = path.resolve(argv[++index]);
    else if (value === '--base-url') args.baseUrl = argv[++index];
    else if (value === '--timeout-ms') args.timeoutMs = Number(argv[++index]);
    else if (value === '--slow-mo') args.slowMo = Number(argv[++index]);
    else if (value === '--environment-name') args.environmentName = argv[++index];
    else if (value === '--runtime-secret-name') args.runtimeSecretName = argv[++index];
    else if (value === '--runtime-secret-file') args.runtimeSecretFile = path.resolve(argv[++index]);
    else if (value === '--help' || value === '-h') {
      console.log(`Usage: npm run setup -- [options]

  --apply                    Write settings. Without this flag, discovery is read-only.
  --dry-run                  Explicit read-only discovery mode.
  --headed                   Show Chrome (default).
  --headless                 Run without a visible browser; requires an authenticated profile.
  --profile-dir PATH         Persistent Playwright profile.
  --channel NAME             Browser channel, default chrome.
  --base-url URL             Cursor dashboard URL override.
  --timeout-ms N             Authentication/navigation timeout.
  --slow-mo N                Delay between browser actions.
  --keep-open                Leave the browser open after completion.

Cloud Environment / Runtime Secrets (GH_PAT):
  --environment-name NAME    Cloud Environment to configure (or set CURSOR_CLOUD_ENVIRONMENT).
  --runtime-secret-name KEY  Runtime secret name (default: GH_PAT).
  --runtime-secret-file PATH File containing the secret value (preferred over env for apply).
  --skip-cloud-environment   Skip Cloud Environment / Runtime Secret steps.
  --cloud-only               Run only Cloud Environment / Runtime Secret steps.
  --skip-rebuild             Do not click Rebuild after saving a secret (apply mode only).

Apply mode for runtime secrets requires a value from --runtime-secret-file or the GH_PAT
environment variable. Secrets are never read from repository files and never written to reports.`);
      process.exit(0);
    } else {
      throw new Error(`Unknown argument: ${value}`);
    }
  }
  if (!Number.isFinite(args.timeoutMs) || args.timeoutMs < 30_000) {
    throw new Error('--timeout-ms must be at least 30000');
  }
  if (args.cloudOnly) args.skipCloudEnvironment = false;
  return args;
}

async function loadJson(file) {
  return JSON.parse(await readFile(file, 'utf8'));
}

function digest(content) {
  return createHash('sha256').update(content).digest('hex');
}

function regexFor(labels) {
  return new RegExp(labels.map((label) => label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|'), 'i');
}

async function firstVisible(locators) {
  for (const locator of locators) {
    if ((await locator.count()) > 0 && (await locator.first().isVisible())) return locator.first();
  }
  return null;
}

async function clickByLabels(page, labels) {
  const pattern = regexFor(labels);
  const roleLocators = ['link', 'button', 'tab', 'menuitem'].map((role) =>
    page.getByRole(role, { name: pattern }),
  );
  const locator = await firstVisible([
    ...roleLocators,
    page.locator('a,button,[role="tab"],[role="menuitem"]').filter({ hasText: pattern }),
  ]);
  if (!locator) return false;
  await locator.click();
  await page.waitForTimeout(500);
  return true;
}

async function findEditor(page, labels) {
  const pattern = regexFor(labels);
  const labelled = labels.flatMap((label) => [
    page.getByLabel(new RegExp(label, 'i')),
    page.getByPlaceholder(new RegExp(label, 'i')),
  ]);
  return firstVisible([
    ...labelled,
    page.locator('textarea:visible').filter({ has: page.locator('xpath=..') }),
    page.locator('[contenteditable="true"]:visible'),
    page.locator('.monaco-editor textarea:visible'),
    page.locator('.cm-content[contenteditable="true"]:visible'),
    page.locator('[role="textbox"]:visible').filter({ hasText: pattern }),
    page.locator('textarea:visible'),
    page.locator('[role="textbox"]:visible'),
  ]);
}

async function setEditorContent(locator, content) {
  const tag = await locator.evaluate((element) => element.tagName.toLowerCase());
  const editable = await locator.getAttribute('contenteditable');
  if (tag === 'textarea' || tag === 'input' || editable === 'true') {
    await locator.fill(content);
    return;
  }
  await locator.click();
  await locator.press(process.platform === 'darwin' ? 'Meta+A' : 'Control+A');
  await locator.press('Backspace');
  await locator.pressSequentially(content, { delay: 0 });
}

async function fillNamedField(page, labels, value) {
  const pattern = regexFor(labels);
  const field = await firstVisible([
    page.getByLabel(pattern),
    page.getByPlaceholder(pattern),
    page.locator('input[type="password"]:visible'),
    page.locator('input[type="text"]:visible'),
    page.locator('input:visible').filter({ has: page.locator('xpath=..') }),
    page.locator('input:visible'),
  ]);
  if (!field) throw new Error(`Could not find field labelled ${labels.join(', ')}`);
  await field.fill(value);
}

async function resolveRuntimeSecretValue(args, manifest) {
  const secretName = args.runtimeSecretName
    ?? manifest.cloud_environment?.default_runtime_secret
    ?? 'GH_PAT';

  if (args.runtimeSecretFile) {
    const value = (await readFile(args.runtimeSecretFile, 'utf8')).trim();
    if (!value) throw new Error(`Runtime secret file is empty: ${args.runtimeSecretFile}`);
    return { secretName, secretValue: value, source: 'file' };
  }

  const envKey = secretName;
  const fromEnv = process.env[envKey]?.trim();
  if (fromEnv) return { secretName, secretValue: fromEnv, source: 'env' };

  return { secretName, secretValue: undefined, source: 'none' };
}

function resolveEnvironmentName(args, manifest) {
  return (
    args.environmentName
    ?? process.env[manifest.cloud_environment?.environment_name_env ?? 'CURSOR_CLOUD_ENVIRONMENT']?.trim()
    ?? undefined
  );
}

async function waitForAuthentication(page, dashboardUrl, timeoutMs) {
  await page.goto(dashboardUrl, { waitUntil: 'domcontentloaded', timeout: 60_000 });
  const deadline = Date.now() + timeoutMs;
  let announced = false;
  while (Date.now() < deadline) {
    const title = await page.title().catch(() => '');
    const url = page.url();
    const body = await page.locator('body').innerText({ timeout: 5_000 }).catch(() => '');
    const challenged = /just a moment|security verification|authenticator\.cursor\.sh/i.test(
      `${title} ${url} ${body}`,
    );
    const needsLogin = /sign in|log in|continue with google|continue with github/i.test(body);
    if (!challenged && !needsLogin && /cursor\.(com|sh)/i.test(url)) return;
    if (!announced) {
      console.log('Complete the Cursor/Cloudflare sign-in in the opened Chrome window. The script will continue automatically.');
      announced = true;
    }
    await page.waitForTimeout(2_000);
  }
  throw new Error('Timed out waiting for an authenticated Cursor dashboard session');
}

async function openSection(page, dashboardUrl, section, { preNavigation = ['Settings', 'Admin', 'Team'] } = {}) {
  await page.goto(dashboardUrl, { waitUntil: 'domcontentloaded' });
  if (preNavigation.length > 0) await clickByLabels(page, preNavigation);
  if (await clickByLabels(page, section.navigation)) return;

  const base = new URL(dashboardUrl);
  for (const candidate of section.urls) {
    const url = new URL(candidate, base.origin).toString();
    const response = await page.goto(url, { waitUntil: 'domcontentloaded' }).catch(() => null);
    if (!response || response.status() >= 400) continue;
    const body = await page.locator('body').innerText().catch(() => '');
    if (!/not found|404/i.test(body)) return;
  }
  throw new Error(`Could not locate Cursor dashboard section: ${section.navigation.join(' / ')}`);
}

async function openCloudSection(page, dashboardUrl, section) {
  const base = new URL(dashboardUrl);
  for (const candidate of section.urls) {
    const url = new URL(candidate, base.origin).toString();
    const response = await page.goto(url, { waitUntil: 'domcontentloaded' }).catch(() => null);
    if (!response || response.status() >= 400) continue;
    const body = await page.locator('body').innerText().catch(() => '');
    if (!/not found|404/i.test(body)) return;
  }

  await page.goto(dashboardUrl, { waitUntil: 'domcontentloaded' });
  if (await clickByLabels(page, section.navigation)) return;

  throw new Error(`Could not locate Cloud Environment section: ${section.navigation.join(' / ')}`);
}

async function selectEnvironment(page, environmentName, section) {
  if (section.environment_search_labels) {
    const search = await firstVisible(
      section.environment_search_labels.flatMap((label) => [
        page.getByLabel(new RegExp(label, 'i')),
        page.getByPlaceholder(new RegExp(label, 'i')),
      ]),
    );
    if (search) {
      await search.fill(environmentName);
      await page.keyboard.press('Enter');
      await page.waitForTimeout(1_000);
    }
  }

  const candidates = [
    page.getByRole('link', { name: new RegExp(environmentName, 'i') }),
    page.getByRole('button', { name: new RegExp(environmentName, 'i') }),
    page.getByRole('row', { name: new RegExp(environmentName, 'i') }),
    page.getByText(environmentName, { exact: true }),
    page.getByText(environmentName, { exact: false }),
  ];
  const match = await firstVisible(candidates);
  if (!match) {
    throw new Error(
      `Could not select Cloud Environment "${environmentName}". Pass --environment-name or set CURSOR_CLOUD_ENVIRONMENT.`,
    );
  }
  await match.click();
  await page.waitForTimeout(1_000);
}

async function openSecretsPanel(page, section) {
  if (await clickByLabels(page, section.secrets_navigation)) {
    await page.waitForTimeout(500);
    return;
  }
  throw new Error(`Could not open Secrets panel: ${section.secrets_navigation.join(' / ')}`);
}

async function clickSave(page, labels) {
  if (!(await clickByLabels(page, labels))) {
    throw new Error(`Could not find save action: ${labels.join(', ')}`);
  }
  await page.waitForTimeout(1_000);
}

async function screenshot(page, artifactDir, name) {
  const file = path.join(artifactDir, `${name.replace(/[^a-z0-9._-]+/gi, '-')}.png`);
  await page.screenshot({ path: file, fullPage: true });
  return file;
}

async function applySingleEditor({ page, dashboardUrl, section, content, args, artifactDir, key }) {
  await openSection(page, dashboardUrl, section);
  await screenshot(page, artifactDir, `${key}-before`);
  const editor = await findEditor(page, section.editor_labels);
  if (!editor) throw new Error(`Could not find editor for ${key}`);
  if (args.apply) {
    await setEditorContent(editor, content);
    await clickSave(page, section.save_labels);
  }
  await screenshot(page, artifactDir, `${key}-after`);
  return { mode: args.apply ? 'applied' : 'discovered', digest: digest(content), url: page.url() };
}

async function upsertNamedItem({
  page,
  dashboardUrl,
  section,
  name,
  content,
  triggers,
  args,
  artifactDir,
  key,
}) {
  await openSection(page, dashboardUrl, section);
  const existing = page.getByText(name, { exact: true });
  if ((await existing.count()) > 0 && (await existing.first().isVisible())) {
    await existing.first().click();
  } else {
    if (!(await clickByLabels(page, section.add_labels))) {
      throw new Error(`Could not find add action while creating ${name}`);
    }
  }

  if (args.apply) {
    await fillNamedField(page, section.name_labels, name);
    const editor = await findEditor(page, section.editor_labels);
    if (!editor) throw new Error(`Could not find configuration editor for ${name}`);
    await setEditorContent(editor, content);

    for (const trigger of triggers ?? []) {
      const human = trigger.replace(/[._-]+/g, ' ');
      const checkbox = page.getByRole('checkbox', { name: new RegExp(human, 'i') });
      if ((await checkbox.count()) > 0 && (await checkbox.first().isVisible())) {
        if (!(await checkbox.first().isChecked())) await checkbox.first().check();
      }
    }
    await clickSave(page, section.save_labels);
  }

  await screenshot(page, artifactDir, `${key}-${name}`);
  return {
    name,
    mode: args.apply ? 'applied' : 'discovered',
    digest: digest(content),
    triggers: triggers ?? [],
    url: page.url(),
  };
}

async function upsertRuntimeSecret({
  page,
  dashboardUrl,
  section,
  args,
  artifactDir,
  environmentName,
  secretName,
  secretValue,
}) {
  await openCloudSection(page, dashboardUrl, section);
  await screenshot(page, artifactDir, 'cloud-environment-landing');

  if (environmentName) {
    await selectEnvironment(page, environmentName, section);
    await screenshot(page, artifactDir, 'cloud-environment-selected');
  }

  await openSecretsPanel(page, section);
  await screenshot(page, artifactDir, 'cloud-environment-secrets-before');

  const existingSecret = page.getByText(secretName, { exact: true });
  const hasExisting = (await existingSecret.count()) > 0 && (await existingSecret.first().isVisible());

  if (hasExisting) {
    await existingSecret.first().click();
    if (!(await clickByLabels(page, section.edit_secret_labels))) {
      await page.waitForTimeout(500);
    }
  } else if (!(await clickByLabels(page, section.add_secret_labels))) {
    throw new Error(`Could not find add-secret action: ${section.add_secret_labels.join(' / ')}`);
  }

  let rebuildTriggered = false;
  if (args.apply) {
    if (!secretValue) {
      throw new Error(
        `Apply mode requires a runtime secret value via --runtime-secret-file or the ${secretName} environment variable`,
      );
    }
    await fillNamedField(page, section.secret_name_labels, secretName);
    await fillNamedField(page, section.secret_value_labels, secretValue);
    await clickSave(page, section.save_labels);
    await screenshot(page, artifactDir, 'cloud-environment-secrets-after-save');

    if (args.rebuildEnvironment) {
      if (await clickByLabels(page, section.rebuild_labels)) {
        await clickByLabels(page, section.rebuild_confirm_labels ?? []);
        rebuildTriggered = true;
        await page.waitForTimeout(2_000);
        await screenshot(page, artifactDir, 'cloud-environment-rebuild');
      }
    }
  }

  await screenshot(page, artifactDir, 'cloud-environment-secrets-after');
  return {
    mode: args.apply ? 'applied' : 'discovered',
    environment: environmentName ?? null,
    secret_name: secretName,
    secret_present: Boolean(secretValue),
    secret_digest: secretValue ? digest(secretValue) : null,
    secret_existed: hasExisting,
    rebuild_requested: args.apply && args.rebuildEnvironment && Boolean(secretValue),
    rebuild_triggered: rebuildTriggered,
    url: page.url(),
  };
}

async function runTeamConfigurationSteps({ page, dashboardUrl, uiMap, manifest, args, artifactDir, runStep }) {
  const read = (relative) => readFile(path.join(REPO_ROOT, relative), 'utf8');
  const teamRules = await read(manifest.team_content.rules_file);
  const bugbotRules = await read(manifest.bugbot.team_rules_file);
  const commandsDir = path.join(REPO_ROOT, manifest.team_content.commands_directory);
  const commands = await Promise.all(
    manifest.team_content.required_commands.map(async (filename) => ({
      name: filename.replace(/\.md$/, ''),
      content: await readFile(path.join(commandsDir, filename), 'utf8'),
    })),
  );
  const securityAgents = await Promise.all(
    manifest.security_agents.map(async (agent) => ({
      ...agent,
      content: await read(agent.configuration_file),
    })),
  );
  const approvalAgents = await Promise.all(
    manifest.approval_agents.map(async (agent) => ({
      ...agent,
      content: await read(agent.configuration_file),
    })),
  );

  await runStep('team-content-rules', () =>
    applySingleEditor({
      page,
      dashboardUrl,
      section: uiMap.sections.team_content,
      content: teamRules,
      args,
      artifactDir,
      key: 'team-content',
    }),
  );

  for (const command of commands) {
    await runStep(`command:${command.name}`, () =>
      upsertNamedItem({
        page,
        dashboardUrl,
        section: uiMap.sections.commands,
        name: command.name,
        content: command.content,
        args,
        artifactDir,
        key: 'command',
      }),
    );
  }

  await runStep('bugbot-team-rules', () =>
    applySingleEditor({
      page,
      dashboardUrl,
      section: uiMap.sections.bugbot,
      content: bugbotRules,
      args,
      artifactDir,
      key: 'bugbot',
    }),
  );

  for (const agent of securityAgents) {
    await runStep(`security-agent:${agent.name}`, () =>
      upsertNamedItem({
        page,
        dashboardUrl,
        section: uiMap.sections.security_agents,
        name: agent.name,
        content: agent.content,
        triggers: agent.triggers,
        args,
        artifactDir,
        key: 'security-agent',
      }),
    );
  }

  for (const agent of approvalAgents) {
    await runStep(`approval-agent:${agent.name}`, () =>
      upsertNamedItem({
        page,
        dashboardUrl,
        section: uiMap.sections.approval_agents,
        name: agent.name,
        content: agent.content,
        triggers: agent.triggers,
        args,
        artifactDir,
        key: 'approval-agent',
      }),
    );
  }
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const uiMap = await loadJson(path.join(HERE, 'ui-map.json'));
  const manifest = await loadJson(path.join(REPO_ROOT, 'cursor-team/manifest.json'));
  const dashboardUrl = args.baseUrl ?? uiMap.dashboard_url;
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const artifactDir = path.join(HERE, 'artifacts', timestamp);
  await mkdir(artifactDir, { recursive: true });
  await mkdir(args.profileDir, { recursive: true });

  const environmentName = resolveEnvironmentName(args, manifest);
  const { secretName, secretValue, source: secretSource } = await resolveRuntimeSecretValue(args, manifest);
  args.environmentName = environmentName;
  args.runtimeSecretName = secretName;

  const context = await chromium.launchPersistentContext(args.profileDir, {
    channel: args.channel === 'chromium' ? undefined : args.channel,
    headless: args.headless,
    slowMo: args.slowMo,
    viewport: null,
    acceptDownloads: false,
  });
  const page = context.pages()[0] ?? (await context.newPage());
  page.setDefaultTimeout(30_000);

  const network = [];
  page.on('response', (response) => {
    const request = response.request();
    if (!['fetch', 'xhr'].includes(request.resourceType())) return;
    const url = new URL(response.url());
    for (const key of [...url.searchParams.keys()]) {
      if (/token|secret|key|auth|cookie|session/i.test(key)) url.searchParams.set(key, '[REDACTED]');
    }
    network.push({ method: request.method(), url: url.toString(), status: response.status() });
  });

  const report = {
    started_at: new Date().toISOString(),
    mode: args.apply ? 'apply' : 'dry-run',
    policy_repo: manifest.policy_repo,
    policy_version: manifest.policy_version,
    dashboard_url: dashboardUrl,
    cloud_environment: {
      environment_name: environmentName ?? null,
      runtime_secret_name: secretName,
      runtime_secret_source: secretSource,
      rebuild_environment: args.rebuildEnvironment,
      skipped: args.skipCloudEnvironment,
      cloud_only: args.cloudOnly,
    },
    results: [],
    failures: [],
  };

  async function runStep(name, operation) {
    console.log(`\n== ${name} ==`);
    try {
      const result = await operation();
      report.results.push({ name, ok: true, ...result });
      console.log(`OK: ${name}`);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      report.failures.push({ name, error: message, url: page.url() });
      console.error(`FAILED: ${name}: ${message}`);
      await screenshot(page, artifactDir, `${name}-failure`).catch(() => undefined);
    }
  }

  try {
    await waitForAuthentication(page, dashboardUrl, args.timeoutMs);

    if (!args.skipCloudEnvironment && uiMap.sections.cloud_environment) {
      await runStep('cloud-environment-runtime-secret', () =>
        upsertRuntimeSecret({
          page,
          dashboardUrl,
          section: uiMap.sections.cloud_environment,
          args,
          artifactDir,
          environmentName,
          secretName,
          secretValue,
        }),
      );
    }

    if (!args.cloudOnly) {
      await runTeamConfigurationSteps({
        page,
        dashboardUrl,
        uiMap,
        manifest,
        args,
        artifactDir,
        runStep,
      });
    }
  } finally {
    report.completed_at = new Date().toISOString();
    report.network_requests = network;
    await writeFile(path.join(artifactDir, 'report.json'), `${JSON.stringify(report, null, 2)}\n`);
    await writeFile(
      path.join(artifactDir, 'network.jsonl'),
      network.map((entry) => JSON.stringify(entry)).join('\n') + (network.length ? '\n' : ''),
    );
    console.log(`\nReport: ${path.join(artifactDir, 'report.json')}`);
    if (args.keepOpen) {
      console.log('Browser left open. Press Ctrl+C to exit.');
      await new Promise(() => undefined);
    }
    await context.close();
  }

  if (report.failures.length > 0) process.exitCode = 1;
}

main().catch((error) => {
  console.error(error instanceof Error ? error.stack : String(error));
  process.exitCode = 1;
});
