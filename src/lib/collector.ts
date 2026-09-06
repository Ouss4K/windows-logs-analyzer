import { spawn } from "node:child_process"
import { mkdir, readFile, writeFile } from "node:fs/promises"
import os from "node:os"
import path from "node:path"
import { COLLECT_EVENT_IDS } from "./catalog"
import { normalizeEvents } from "./parse"
import { dataDir, scriptsDir } from "./paths"
import type { LogEvent, RawWinEvent } from "./types"

function collectorScript() {
  return path.join(scriptsDir(), "collect-events.ps1")
}

export function collectorAvailable() {
  return os.platform() === "win32"
}

function runPowerShell(args: string[]) {
  return new Promise<{ stdout: string; stderr: string; code: number }>((resolve, reject) => {
    const child = spawn(
      "powershell.exe",
      ["-NoProfile", "-NonInteractive", "-ExecutionPolicy", "Bypass", "-File", collectorScript(), ...args],
      { windowsHide: true },
    )
    let stdout = ""
    let stderr = ""
    child.stdout.on("data", (chunk) => {
      stdout += chunk.toString()
    })
    child.stderr.on("data", (chunk) => {
      stderr += chunk.toString()
    })
    child.on("error", reject)
    child.on("close", (code) => {
      resolve({ stdout, stderr, code: code ?? 1 })
    })
  })
}

export async function collectWindowsEvents(options: {
  days?: number
  maxEvents?: number
  evtxPath?: string
  logName?: string
}): Promise<{ events: LogEvent[]; warning?: string }> {
  if (!collectorAvailable()) {
    throw new Error("Live Windows Event Log collection only works on Windows.")
  }

  const outDir = dataDir()
  await mkdir(outDir, { recursive: true })
  const outFile = path.join(outDir, `raw-${Date.now()}.json`)

  const args = [
    "-OutFile",
    outFile,
    "-Days",
    String(options.days ?? 14),
    "-MaxEvents",
    String(options.maxEvents ?? 8000),
    "-LogName",
    options.logName ?? "Security",
    "-EventIds",
    COLLECT_EVENT_IDS.join(","),
  ]
  if (options.evtxPath) {
    args.push("-Path", options.evtxPath)
  }

  const result = await runPowerShell(args)
  const warning = result.stderr.trim() || undefined
  if (result.code !== 0) {
    throw new Error(
      warning ||
        result.stdout.trim() ||
        "PowerShell collection failed. Run the app as Administrator to read the Security log.",
    )
  }

  const payload = (await readFile(outFile, "utf8")).replace(/^\uFEFF/, "")
  const parsed = JSON.parse(payload || "[]") as RawWinEvent[] | RawWinEvent
  const raw = Array.isArray(parsed) ? parsed : parsed ? [parsed] : []
  const events = normalizeEvents(raw)
  await writeFile(outFile, "[]")

  return {
    events,
    warning,
  }
}
