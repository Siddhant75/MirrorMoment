import { lstat, readFile, readdir } from "node:fs/promises";
import path from "node:path";

const forbiddenSegments = new Set([
  ".agents",
  ".codex",
  ".git",
  ".local-plans",
  ".superpowers",
  "private-demo-images",
  "secrets",
]);

const forbiddenNames = new Set([
  "agent.md",
  "agents.md",
  "claude.md",
  "codex.md",
  "gemini.md",
  "judge_demo_release.md",
]);

const secretExtensions = new Set([
  ".jks",
  ".key",
  ".keystore",
  ".p12",
  ".pem",
  ".pfx",
]);

const textExtensions = new Set([
  ".cjs",
  ".cmd",
  ".css",
  ".html",
  ".js",
  ".json",
  ".map",
  ".md",
  ".mjs",
  ".ps1",
  ".txt",
  ".xml",
  ".yaml",
  ".yml",
]);

function normalizedRelative(root, target) {
  return path.relative(root, target).split(path.sep).join("/");
}

function compareText(left, right) {
  return left < right ? -1 : left > right ? 1 : 0;
}

function pathViolations(relativePath) {
  const lower = relativePath.toLowerCase();
  const segments = lower.split("/");
  const name = segments.at(-1) ?? "";
  const violations = [];

  if ((name === ".env" || name.startsWith(".env.")) && name !== ".env.example") {
    violations.push("environment file is forbidden");
  }
  if (segments.some((segment) => forbiddenSegments.has(segment))) {
    violations.push("private or agent-context path is forbidden");
  }
  if (forbiddenNames.has(name)) {
    violations.push("agent or local planning document is forbidden");
  }
  if (secretExtensions.has(path.extname(name))) {
    violations.push("credential file extension is forbidden");
  }
  if (/raw[-_.]?vendor[-_.]?response/.test(name) || /vendor[-_.]?response[-_.]?raw/.test(name)) {
    violations.push("raw vendor response is forbidden");
  }
  return violations;
}

function contentViolations(text) {
  const violations = [];

  if (/\bgh[oprsu]_[A-Za-z0-9]{20,}\b/.test(text)) {
    violations.push("GitHub credential pattern detected");
  }
  if (/-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/.test(text)) {
    violations.push("private key material detected");
  }
  if (/https?:\/\/[^\s"'<>]+\?[^\s"'<>]*(?:X-Amz-Signature|X-Goog-Signature|Signature|Key-Pair-Id)=/i.test(text)) {
    violations.push("signed URL detected");
  }

  for (const match of text.matchAll(/^[ \t]*(?:export[ \t]+)?YOUCAM_API_KEY[ \t]*=[ \t]*(.*?)[ \t]*$/gim)) {
    const value = match[1].trim().replace(/^(?:""|'')$/, "");
    if (value) {
      violations.push("YouCam API credential assignment detected");
      break;
    }
  }
  return violations;
}

async function walk(root, directory, files, violations) {
  const entries = await readdir(directory, { withFileTypes: true });
  entries.sort((left, right) => left.name.localeCompare(right.name));

  for (const entry of entries) {
    const target = path.join(directory, entry.name);
    const relativePath = normalizedRelative(root, target);
    if (entry.isSymbolicLink()) {
      violations.push(`${relativePath}: symbolic links are forbidden`);
      continue;
    }
    if (entry.isDirectory()) {
      await walk(root, target, files, violations);
      continue;
    }
    if (!entry.isFile()) {
      violations.push(`${relativePath}: unsupported filesystem entry`);
      continue;
    }

    const stat = await lstat(target);
    files.push({ relativePath, target, size: stat.size });
    for (const violation of pathViolations(relativePath)) {
      violations.push(`${relativePath}: ${violation}`);
    }

    const extension = path.extname(entry.name).toLowerCase();
    if (textExtensions.has(extension) || entry.name === ".env.example") {
      const text = await readFile(target, "utf8");
      for (const violation of contentViolations(text)) {
        violations.push(`${relativePath}: ${violation}`);
      }
    }
  }
}

export async function inspectRelease(root) {
  const resolvedRoot = path.resolve(root);
  const fileEntries = [];
  const violations = [];
  await walk(resolvedRoot, resolvedRoot, fileEntries, violations);
  fileEntries.sort((left, right) => compareText(left.relativePath, right.relativePath));
  violations.sort(compareText);

  return {
    files: fileEntries.map((entry) => entry.relativePath),
    totalBytes: fileEntries.reduce((total, entry) => total + entry.size, 0),
    violations,
  };
}

export async function assertReleaseSafe(root) {
  const report = await inspectRelease(root);
  if (report.violations.length > 0) {
    const error = new Error(`Judge release policy failed:\n${report.violations.join("\n")}`);
    error.report = report;
    throw error;
  }
  return report;
}
