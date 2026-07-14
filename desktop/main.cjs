/* eslint-disable @typescript-eslint/no-require-imports */
const { app, BrowserWindow, dialog, shell } = require("electron");
const { execFile, spawn } = require("node:child_process");
const { createWriteStream } = require("node:fs");
const net = require("node:net");
const path = require("node:path");

let mainWindow;
let serverProcess;
let workerProcess;
let stopping = false;

if (!app.requestSingleInstanceLock()) app.quit();

app.on("second-instance", () => {
  if (!mainWindow) return;
  if (mainWindow.isMinimized()) mainWindow.restore();
  mainWindow.focus();
});

app.whenReady().then(startDesktopApp).catch((error) => {
  if (process.argv.includes("--smoke-test")) {
    console.error(error);
    stopServices();
    app.exit(1);
    return;
  }
  dialog.showErrorBox("Velvet could not start", error instanceof Error ? error.message : String(error));
  stopServices();
  app.quit();
});

app.on("before-quit", stopServices);
app.on("window-all-closed", () => app.quit());

async function startDesktopApp() {
  const port = await findAvailablePort();
  const resourcesRoot = app.isPackaged ? process.resourcesPath : path.join(__dirname, "..", "desktop-dist");
  const serverRoot = path.join(resourcesRoot, "app-server");
  const workerEntry = path.join(resourcesRoot, "velvet-worker.cjs");
  const userData = app.getPath("userData");
  const log = createWriteStream(path.join(userData, "desktop.log"), { flags: "a" });
  const environment = {
    ...process.env,
    ELECTRON_RUN_AS_NODE: "1",
    FFMPEG_PATH: path.join(resourcesRoot, "ffmpeg", "ffmpeg.exe"),
    HOSTNAME: "127.0.0.1",
    NODE_ENV: "production",
    PORT: String(port),
    VELVET_DATA_DIR: path.join(userData, ".velvet"),
    VELVET_DESKTOP: "1"
  };

  serverProcess = launchNode(path.join(serverRoot, "server.js"), userData, environment, log);
  workerProcess = launchWorker(workerEntry, userData, environment, log);
  await waitForServer(`http://127.0.0.1:${port}/api/health`, serverProcess);

  if (process.argv.includes("--smoke-test")) {
    await verifyFfmpeg(environment.FFMPEG_PATH);
    stopServices();
    app.quit();
    return;
  }

  mainWindow = new BrowserWindow({
    width: 1500,
    height: 960,
    minWidth: 1180,
    minHeight: 760,
    backgroundColor: "#15111f",
    autoHideMenuBar: true,
    show: false,
    icon: path.join(resourcesRoot, "velvet-icon.png"),
    webPreferences: { contextIsolation: true, nodeIntegration: false, sandbox: true }
  });

  const localOrigin = `http://127.0.0.1:${port}`;
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (!url.startsWith(localOrigin)) shell.openExternal(url);
    return { action: "deny" };
  });
  mainWindow.webContents.on("will-navigate", (event, url) => {
    if (url.startsWith(localOrigin)) return;
    event.preventDefault();
    shell.openExternal(url);
  });
  mainWindow.once("ready-to-show", () => mainWindow.show());
  mainWindow.on("closed", () => { mainWindow = undefined; });
  await mainWindow.loadURL(`${localOrigin}/dashboard`);
}

function launchNode(entry, cwd, env, log) {
  const child = spawn(process.execPath, [entry], { cwd, env, windowsHide: true, stdio: ["ignore", "pipe", "pipe"] });
  child.stdout.pipe(log, { end: false });
  child.stderr.pipe(log, { end: false });
  return child;
}

function launchWorker(entry, cwd, env, log) {
  const child = launchNode(entry, cwd, env, log);
  child.on("exit", () => {
    if (stopping) return;
    setTimeout(() => { if (!stopping) workerProcess = launchWorker(entry, cwd, env, log); }, 3000);
  });
  return child;
}

function stopServices() {
  if (stopping) return;
  stopping = true;
  workerProcess?.kill();
  serverProcess?.kill();
}

async function findAvailablePort() {
  return new Promise((resolve, reject) => {
    const server = net.createServer();
    server.unref();
    server.on("error", reject);
    server.listen(0, "127.0.0.1", () => {
      const address = server.address();
      const port = typeof address === "object" && address ? address.port : 32100;
      server.close(() => resolve(port));
    });
  });
}

async function waitForServer(url, child) {
  const deadline = Date.now() + 60000;
  while (Date.now() < deadline) {
    if (child.exitCode !== null) throw new Error("The bundled Velvet server stopped during startup.");
    try {
      const response = await fetch(url);
      if (response.ok) return;
    } catch {}
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  throw new Error("The bundled Velvet server did not become ready.");
}

async function verifyFfmpeg(ffmpegPath) {
  return new Promise((resolve, reject) => {
    execFile(ffmpegPath, ["-version"], { windowsHide: true }, (error) => error ? reject(error) : resolve());
  });
}
