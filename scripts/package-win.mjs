import { createWriteStream, cpSync, existsSync, mkdirSync, renameSync, rmSync, writeFileSync } from "node:fs"
import { execSync } from "node:child_process"
import https from "node:https"
import path from "node:path"
import { pipeline } from "node:stream/promises"

const ELECTRON_VERSION = "32.2.1"
const root = process.cwd()
const zipPath = path.join(root, "release", "electron.zip")
const unpackDir = path.join(root, "release", "electron")
const outDir = path.join(root, "dist", "WindowsLogsAnalyzer")
const zipUrl = `https://github.com/electron/electron/releases/download/v${ELECTRON_VERSION}/electron-v${ELECTRON_VERSION}-win32-x64.zip`

function download(url, dest) {
  return new Promise((resolve, reject) => {
    const request = (current) => {
      https
        .get(current, (response) => {
          const status = response.statusCode ?? 0
          if (status >= 300 && status < 400 && response.headers.location) {
            response.resume()
            request(response.headers.location)
            return
          }
          if (status !== 200) {
            reject(new Error(`Download failed (${status}) ${current}`))
            return
          }
          pipeline(response, createWriteStream(dest)).then(resolve).catch(reject)
        })
        .on("error", reject)
    }
    request(url)
  })
}

if (!existsSync(path.join(root, "release", "app", "server.js"))) {
  throw new Error("Missing release/app/server.js. Run next build && node scripts/prepare-standalone.mjs first.")
}

mkdirSync(path.join(root, "release"), { recursive: true })
if (!existsSync(zipPath)) {
  console.log(`Downloading Electron ${ELECTRON_VERSION}...`)
  await download(zipUrl, zipPath)
}

rmSync(unpackDir, { recursive: true, force: true })
mkdirSync(unpackDir, { recursive: true })
execSync(`powershell.exe -NoProfile -Command "Expand-Archive -LiteralPath '${zipPath.replaceAll("'", "''")}' -DestinationPath '${unpackDir.replaceAll("'", "''")}' -Force"`, {
  stdio: "inherit",
})

rmSync(outDir, { recursive: true, force: true })
mkdirSync(outDir, { recursive: true })
cpSync(unpackDir, outDir, { recursive: true })

const resourcesApp = path.join(outDir, "resources", "app")
rmSync(path.join(outDir, "resources", "default_app.asar"), { force: true })
mkdirSync(resourcesApp, { recursive: true })
writeFileSync(
  path.join(resourcesApp, "package.json"),
  JSON.stringify({ name: "windows-logs-analyzer", version: "0.1.0", main: "main.cjs" }, null, 2),
)
cpSync(path.join(root, "electron", "main.cjs"), path.join(resourcesApp, "main.cjs"))
cpSync(path.join(root, "release", "app"), path.join(outDir, "resources", "standalone"), { recursive: true })
cpSync(path.join(root, "release", "scripts"), path.join(outDir, "resources", "scripts"), { recursive: true })
renameSync(path.join(outDir, "electron.exe"), path.join(outDir, "WindowsLogsAnalyzer.exe"))

console.log(`Windows app ready: ${path.join(outDir, "WindowsLogsAnalyzer.exe")}`)
