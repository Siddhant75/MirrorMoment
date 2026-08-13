import { cp, mkdir, rm } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const scriptPath = fileURLToPath(import.meta.url);
const projectRoot = path.resolve(path.dirname(scriptPath), "..");
const standaloneRoot = path.resolve(projectRoot, ".next", "standalone");

function assertStandaloneTarget(target) {
  const prefix = `${standaloneRoot}${path.sep}`;
  if (!target.startsWith(prefix)) {
    throw new Error("Standalone asset destination escaped .next/standalone.");
  }
}

async function replaceDirectory(source, destination) {
  assertStandaloneTarget(destination);
  await rm(destination, { recursive: true, force: true });
  await mkdir(path.dirname(destination), { recursive: true });
  await cp(source, destination, { recursive: true, dereference: true });
}

export async function prepareStandalone() {
  await replaceDirectory(
    path.resolve(projectRoot, "public"),
    path.resolve(standaloneRoot, "public"),
  );
  await replaceDirectory(
    path.resolve(projectRoot, ".next", "static"),
    path.resolve(standaloneRoot, ".next", "static"),
  );
}

if (process.argv[1] && path.resolve(process.argv[1]) === scriptPath) {
  prepareStandalone().catch((cause) => {
    console.error(cause instanceof Error ? cause.message : "Standalone assets could not be prepared.");
    process.exitCode = 1;
  });
}
