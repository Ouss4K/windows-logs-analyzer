const { app, BrowserWindow, dialog } = require("electron")
const { spawn } = require("node:child_process")
const http = require("node:http")
const net = require("node:net")
const path = require("node:path")
const fs = require("node:fs")

const DEV_URL = process.env.SENTINEL_DEV_URL || "http://127.0.0.1:3000"

let serverProcess = null
let mainWindow = null

function findFreePort() {
  return new Promise((resolve, reject) => {
    const server = net.createServer()
    server.listen(0, "127.0.0.1", () => {
      const address = server.address()
      const port = address && address.port
      server.close(() => resolve(port))
    })
    server.on("error", reject)
  })
}

function waitForServer(url, timeoutMs = 180000) {
  const started = Date.now()
  return new Promise((resolve, reject) => {
    const ping = () => {
      const request = http.get(url, (response) => {
        response.resume()
        if (response.statusCode && response.statusCode < 500) {
          resolve(true)
          return
        }
        retry()
      })
      request.on("error", retry)
      request.setTimeout(2000, () => {
        request.destroy()
        retry()
      })
    }
    const retry = () => {
      if (Date.now() - started > timeoutMs) {
        reject(new Error("Windows Logs Analyzer did not start in time."))
        return
      }
      setTimeout(ping, 400)
    }
    ping()
  })
}

function standaloneDir() {
  return path.join(process.resourcesPath, "standalone")
}

function startProductionServer(port) {
  const dir = standaloneDir()
  const serverJs = path.join(dir, "server.js")
  if (!fs.existsSync(serverJs)) {
    throw new Error(`Missing packaged server at ${serverJs}`)
  }

  serverProcess = spawn(process.execPath, [serverJs], {
    cwd: dir,
    windowsHide: true,
    env: {
      ...process.env,
      ELECTRON_RUN_AS_NODE: "1",
      NODE_ENV: "production",
      PORT: String(port),
      HOSTNAME: "127.0.0.1",
      SENTINEL_ROOT: process.resourcesPath,
      SENTINEL_DATA: path.join(path.dirname(process.execPath), "data"),
    },
  })

  serverProcess.stderr?.on("data", (chunk) => {
    console.error(String(chunk))
  })
  serverProcess.on("exit", (code) => {
    if (code && mainWindow) {
      dialog.showErrorBox("Windows Logs Analyzer", `Background server exited (${code}).`)
    }
  })
}

function createWindow(url) {
  mainWindow = new BrowserWindow({
    width: 1440,
    height: 920,
    minWidth: 960,
    minHeight: 640,
    title: "Windows Logs Analyzer",
    autoHideMenuBar: true,
    backgroundColor: "#171717",
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
    },
  })
  mainWindow.loadURL(url)
  mainWindow.on("closed", () => {
    mainWindow = null
  })
}

async function boot() {
  try {
    if (!app.isPackaged) {
      await waitForServer(DEV_URL, 120000)
      createWindow(DEV_URL)
      return
    }
    const port = await findFreePort()
    const url = `http://127.0.0.1:${port}`
    startProductionServer(port)
    await waitForServer(`${url}/api/health`)
    createWindow(url)
  } catch (error) {
    dialog.showErrorBox("Windows Logs Analyzer", error instanceof Error ? error.message : String(error))
    app.quit()
  }
}

function stopServer() {
  if (!serverProcess) return
  serverProcess.kill()
  serverProcess = null
}

app.whenReady().then(() => {
  app.setAppUserModelId("local.sentinellogs.app")
  return boot()
})

app.on("window-all-closed", () => {
  stopServer()
  app.quit()
})

app.on("before-quit", () => {
  stopServer()
})
