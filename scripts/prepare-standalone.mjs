import { copyFileSync, cpSync, existsSync, mkdirSync, readdirSync, rmSync } from "node:fs"
import path from "node:path"

const root = process.cwd()
const standalone = path.join(root, ".next", "standalone")
const releaseApp = path.join(root, "release", "app")
const releaseScripts = path.join(root, "release", "scripts")

function findServerDir(dir) {
  if (existsSync(path.join(dir, "server.js"))) return dir
  if (!existsSync(dir)) return null
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue
    const nested = findServerDir(path.join(dir, entry.name))
    if (nested) return nested
  }
  return null
}

if (!existsSync(standalone)) {
  throw new Error("Run next build first. Missing .next/standalone")
}

const target = findServerDir(standalone)
if (!target) {
  throw new Error("Could not find server.js inside .next/standalone")
}

rmSync(releaseApp, { recursive: true, force: true })
rmSync(releaseScripts, { recursive: true, force: true })
rmSync(path.join(root, "release", "electron"), { recursive: true, force: true })
mkdirSync(releaseApp, { recursive: true })
cpSync(target, releaseApp, { recursive: true })
cpSync(path.join(root, ".next", "static"), path.join(releaseApp, ".next", "static"), {
  recursive: true,
})
if (existsSync(path.join(root, "public"))) {
  cpSync(path.join(root, "public"), path.join(releaseApp, "public"), { recursive: true })
}
mkdirSync(releaseScripts, { recursive: true })
copyFileSync(
  path.join(root, "scripts", "collect-events.ps1"),
  path.join(releaseScripts, "collect-events.ps1"),
)

console.log(`Packaged app files -> ${releaseApp}`)
