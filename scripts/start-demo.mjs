import { spawn, spawnSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const scriptPath = fileURLToPath(import.meta.url);
const projectRoot = path.resolve(path.dirname(scriptPath), "..");
const demoUrl = "http://127.0.0.1:3000";

export function assertSupportedNode(version) {
  const match = /^(\d+)\./.exec(String(version));
  if (!match) {
    throw new Error("Could not determine the Node.js version.");
  }
  if (Number(match[1]) < 20) {
    throw new Error("MirrorMoment requires Node.js 20 or newer.");
  }
}

export function validateMode(value) {
  const mode = String(value ?? "").trim().toLowerCase();
  if (mode !== "replay" && mode !== "live") {
    throw new Error("Demo mode must be replay or live.");
  }
  return mode;
}

export function redactRuntime({ mode, apiKey }) {
  return {
    mode,
    keyStatus: mode === "replay"
      ? "not required"
      : String(apiKey ?? "").trim()
        ? "configured"
        : "missing",
  };
}

export function getDemoServerLaunch(root) {
  const cwd = path.resolve(root, ".next", "standalone");
  return {
    cwd,
    serverPath: path.resolve(cwd, "server.js"),
  };
}

function readLocalApiKey() {
  const envPath = path.join(projectRoot, ".env.local");
  if (!existsSync(envPath)) return "";

  for (const line of readFileSync(envPath, "utf8").split(/\r?\n/)) {
    const match = /^\s*(?:export\s+)?YOUCAM_API_KEY\s*=\s*(.*?)\s*$/.exec(line);
    if (!match) continue;
    const value = match[1].trim();
    if (
      value.length >= 2
      && ((value.startsWith('"') && value.endsWith('"'))
        || (value.startsWith("'") && value.endsWith("'")))
    ) {
      return value.slice(1, -1).trim();
    }
    return value;
  }
  return "";
}

function wait(delayMs) {
  return new Promise((resolve) => setTimeout(resolve, delayMs));
}

async function waitForReadiness(child, expectedMode) {
  const deadline = Date.now() + 30_000;
  let lastMessage = "server did not respond";

  while (Date.now() < deadline) {
    if (child.exitCode !== null || child.signalCode !== null) {
      throw new Error("MirrorMoment exited before it became ready.");
    }
    try {
      const response = await fetch(`${demoUrl}/api/runtime`, {
        signal: AbortSignal.timeout(2_000),
      });
      if (response.ok) {
        const runtime = await response.json();
        if (runtime.mode === expectedMode) return;
        lastMessage = `server reported ${String(runtime.mode)} mode`;
      } else {
        lastMessage = `readiness endpoint returned HTTP ${response.status}`;
      }
    } catch (cause) {
      lastMessage = cause instanceof Error ? cause.message : "readiness request failed";
    }
    await wait(500);
  }

  throw new Error(`MirrorMoment was not ready after 30 seconds (${lastMessage}).`);
}

function terminateChild(child) {
  if (child.exitCode === null && child.signalCode === null) {
    child.kill("SIGTERM");
  }
}

export async function main(argv = process.argv.slice(2)) {
  assertSupportedNode(process.versions.node);
  const mode = validateMode(argv[0] ?? process.env.MIRRORMOMENT_MODE ?? "replay");
  const apiKey = mode === "live"
    ? (process.env.YOUCAM_API_KEY?.trim() || readLocalApiKey())
    : "";
  const safeRuntime = redactRuntime({ mode, apiKey });

  if (mode === "live" && safeRuntime.keyStatus !== "configured") {
    throw new Error("Live mode needs a non-empty YOUCAM_API_KEY in the environment or .env.local.");
  }

  const environment = {
    ...process.env,
    HOSTNAME: "127.0.0.1",
    MIRRORMOMENT_MODE: mode,
    PORT: "3000",
    YOUCAM_API_KEY: apiKey,
  };

  console.log(`MirrorMoment mode: ${safeRuntime.mode}`);
  console.log(`YOUCAM_API_KEY status: ${safeRuntime.keyStatus}`);
  console.log("Building the production app...");

  const npmExecutable = process.platform === "win32" ? "npm.cmd" : "npm";
  const build = spawnSync(npmExecutable, ["run", "build"], {
    cwd: projectRoot,
    env: environment,
    stdio: "inherit",
  });
  if (build.error) throw build.error;
  if (build.status !== 0) {
    throw new Error(`Production build failed with exit code ${build.status ?? "unknown"}.`);
  }

  const serverLaunch = getDemoServerLaunch(projectRoot);
  const child = spawn(process.execPath, [serverLaunch.serverPath], {
    cwd: serverLaunch.cwd,
    env: environment,
    stdio: "inherit",
  });
  const exitPromise = new Promise((resolve) => {
    child.once("error", (error) => resolve({ code: 1, signal: null, error }));
    child.once("exit", (code, signal) => resolve({ code, signal, error: null }));
  });

  let interrupted = false;
  const stop = () => {
    interrupted = true;
    terminateChild(child);
  };
  process.once("SIGINT", stop);
  process.once("SIGTERM", stop);

  try {
    const startup = await Promise.race([
      waitForReadiness(child, mode).then(() => ({ kind: "ready" })),
      exitPromise.then((exit) => ({ kind: "exit", exit })),
    ]);
    if (startup.kind === "exit") {
      if (startup.exit.error) throw startup.exit.error;
      throw new Error(`MirrorMoment exited before readiness (${startup.exit.signal ?? startup.exit.code ?? "unknown"}).`);
    }
    console.log(`MirrorMoment is ready at ${demoUrl}`);
    console.log("Open that URL manually, then start your OBS recording. Press Ctrl+C here when finished.");

    const exit = await exitPromise;
    if (exit.error) throw exit.error;
    if (!interrupted && exit.code !== 0) {
      throw new Error(`MirrorMoment exited unexpectedly (${exit.signal ?? exit.code ?? "unknown"}).`);
    }
  } catch (cause) {
    terminateChild(child);
    if (interrupted) return;
    throw cause;
  } finally {
    process.removeListener("SIGINT", stop);
    process.removeListener("SIGTERM", stop);
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === scriptPath) {
  main().catch((cause) => {
    console.error(cause instanceof Error ? cause.message : "The MirrorMoment demo could not start.");
    process.exitCode = 1;
  });
}
