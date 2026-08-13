import { spawnSync } from "node:child_process";
import {
  cp,
  mkdir,
  readFile,
  rm,
  stat,
  writeFile,
} from "node:fs/promises";
import { createHash } from "node:crypto";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { assertReleaseSafe } from "./package-policy.mjs";

const scriptPath = fileURLToPath(import.meta.url);
const projectRoot = path.resolve(path.dirname(scriptPath), "..");
const releaseRoot = path.resolve(projectRoot, "release");
const stagingRoot = path.resolve(releaseRoot, "MirrorMoment-Judge-Demo");
const archivePath = path.resolve(releaseRoot, "MirrorMoment-Judge-Demo.zip");
const maxArchiveBytes = 34 * 1024 * 1024;

function assertExactGeneratedTargets() {
  if (path.dirname(releaseRoot) !== projectRoot || path.basename(releaseRoot) !== "release") {
    throw new Error("Release root resolved outside the MirrorMoment project.");
  }
  if (path.dirname(stagingRoot) !== releaseRoot || path.basename(stagingRoot) !== "MirrorMoment-Judge-Demo") {
    throw new Error("Staging path is not the exact expected release target.");
  }
  if (path.dirname(archivePath) !== releaseRoot || path.basename(archivePath) !== "MirrorMoment-Judge-Demo.zip") {
    throw new Error("Archive path is not the exact expected release target.");
  }
}

async function cleanGeneratedTargets() {
  assertExactGeneratedTargets();
  await rm(stagingRoot, { recursive: true, force: true });
  await rm(archivePath, { force: true });
}

async function copyRequired(sourceRelative, destinationRelative, options = {}) {
  const source = path.resolve(projectRoot, sourceRelative);
  const destination = path.resolve(stagingRoot, destinationRelative);
  const destinationPrefix = `${stagingRoot}${path.sep}`;
  if (destination !== stagingRoot && !destination.startsWith(destinationPrefix)) {
    throw new Error(`Package destination escaped staging: ${destinationRelative}`);
  }
  await mkdir(path.dirname(destination), { recursive: true });
  await cp(source, destination, {
    recursive: true,
    dereference: true,
    errorOnExist: false,
    force: true,
    ...options,
  });
}

async function copyJudgeMaterials() {
  await copyRequired("packaging/judge", ".");
  await copyRequired("docs/ASSET_ATTRIBUTION.md", "docs/ASSET_ATTRIBUTION.md");
  await copyRequired("docs/API_NOTES.md", "docs/API_NOTES.md");
  await copyRequired(".env.example", ".env.example");
}

async function stageStandalone() {
  await copyRequired(".next/standalone", "app");
  await copyRequired(".next/static", "app/.next/static");
  await copyRequired("public", "app/public");
  await copyJudgeMaterials();
  await writeFile(path.join(stagingRoot, "PACKAGE_KIND.txt"), "standalone\n", "utf8");
  return "standalone";
}

function sourceFilter(source) {
  const sourceRoot = path.resolve(projectRoot, "src");
  const relative = path.relative(sourceRoot, source).split(path.sep).join("/");
  if (!relative) return true;
  if (relative === "test" || relative.startsWith("test/")) return false;
  if (relative.split("/").some((segment) => segment === "__tests__")) return false;
  return !/(?:^|\.)test\.[^/]+$/i.test(path.basename(relative));
}

async function stageSource() {
  await copyRequired("src", "src", { filter: sourceFilter });
  await copyRequired("public", "public");
  for (const file of [
    "package.json",
    "package-lock.json",
    "next.config.ts",
    "next-env.d.ts",
    "tsconfig.json",
    "postcss.config.mjs",
    "eslint.config.mjs",
  ]) {
    await copyRequired(file, file);
  }
  await copyJudgeMaterials();
  await writeFile(path.join(stagingRoot, "PACKAGE_KIND.txt"), "source\n", "utf8");
  return "source";
}

async function writeChecksums() {
  const report = await assertReleaseSafe(stagingRoot);
  const lines = [];
  for (const relativePath of report.files) {
    const contents = await readFile(path.join(stagingRoot, ...relativePath.split("/")));
    const digest = createHash("sha256").update(contents).digest("hex");
    lines.push(`${digest}  ${relativePath}`);
  }
  await writeFile(path.join(stagingRoot, "SHA256SUMS.txt"), `${lines.join("\n")}\n`, "utf8");
  return assertReleaseSafe(stagingRoot);
}

function compressStaging() {
  if (process.platform !== "win32") {
    throw new Error("Judge ZIP creation currently requires Windows tar.exe.");
  }
  const result = spawnSync("tar.exe", ["-a", "-c", "-f", archivePath, "-C", stagingRoot, "."], {
    cwd: projectRoot,
    stdio: "inherit",
  });
  if (result.error) throw result.error;
  if (result.status !== 0) {
    throw new Error(`tar.exe failed with exit code ${result.status ?? "unknown"}.`);
  }
}

async function buildPackage(stage) {
  await cleanGeneratedTargets();
  await mkdir(stagingRoot, { recursive: true });
  const kind = await stage();
  const report = await writeChecksums();
  compressStaging();
  const archive = await stat(archivePath);
  return { kind, report, archiveBytes: archive.size };
}

export async function main() {
  assertExactGeneratedTargets();
  await mkdir(releaseRoot, { recursive: true });

  let result = await buildPackage(stageStandalone);
  if (result.archiveBytes > maxArchiveBytes) {
    console.log(`Standalone archive is ${result.archiveBytes} bytes; rebuilding the source fallback.`);
    result = await buildPackage(stageSource);
  }
  if (result.archiveBytes > maxArchiveBytes) {
    throw new Error(`Judge ZIP is ${result.archiveBytes} bytes and exceeds the 34 MiB safety limit.`);
  }

  const archiveContents = await readFile(archivePath);
  const archiveSha256 = createHash("sha256").update(archiveContents).digest("hex");
  console.log(`Package kind: ${result.kind}`);
  console.log(`Staged files: ${result.report.files.length}`);
  console.log(`Archive bytes: ${result.archiveBytes}`);
  console.log(`Archive SHA-256: ${archiveSha256}`);
  console.log(`Created: ${archivePath}`);
}

if (process.argv[1] && path.resolve(process.argv[1]) === scriptPath) {
  main().catch((cause) => {
    console.error(cause instanceof Error ? cause.message : "Judge package creation failed.");
    process.exitCode = 1;
  });
}
