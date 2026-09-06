import path from "node:path"

export function dataDir() {
  return process.env.SENTINEL_DATA || path.join(process.cwd(), "data")
}

export function scriptsDir() {
  if (process.env.SENTINEL_ROOT) {
    return path.join(process.env.SENTINEL_ROOT, "scripts")
  }
  return path.join(process.cwd(), "scripts")
}

export function uploadsDir() {
  return path.join(dataDir(), "uploads")
}
