/* eslint-disable @typescript-eslint/no-require-imports */
const { app, BrowserWindow, dialog, ipcMain, shell } = require("electron");
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

ipcMain.on("velvet:window-action", (event, action) => {
  const window = BrowserWindow.fromWebContents(event.sender);
  if (!window || window !== mainWindow) return;

  if (action === "minimize") window.minimize();
  if (action === "maximize") {
    if (window.isMaximized()) window.unmaximize();
    else window.maximize();
  }
  if (action === "close") window.close();
});

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

  if (process.argv.includes("--smoke-test")) {
    await waitForServer(`http://127.0.0.1:${port}/api/health`, serverProcess);
    await verifyFfmpeg(environment.FFMPEG_PATH);
    stopServices();
    app.quit();
    return;
  }

  mainWindow = createMainWindow(resourcesRoot);
  await mainWindow.loadURL(startupPage());
  mainWindow.show();

  await waitForServer(`http://127.0.0.1:${port}/api/health`, serverProcess);
  const localOrigin = `http://127.0.0.1:${port}`;
  configureNavigation(mainWindow, localOrigin);
  await mainWindow.loadURL(`${localOrigin}/projects/new`);
  workerProcess = launchWorker(workerEntry, userData, environment, log);
}

function createMainWindow(resourcesRoot) {
  const window = new BrowserWindow({
    width: 1500,
    height: 960,
    minWidth: 1180,
    minHeight: 760,
    frame: false,
    backgroundColor: "#00000000",
    transparent: true,
    autoHideMenuBar: true,
    show: false,
    icon: path.join(resourcesRoot, "velvet-icon.png"),
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      preload: path.join(__dirname, "preload.cjs"),
      sandbox: true
    }
  });
  window.on("closed", () => { mainWindow = undefined; });
  return window;
}

function configureNavigation(window, localOrigin) {
  window.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith(`${localOrigin}/api/youtube/login`) || !url.startsWith(localOrigin)) shell.openExternal(url);
    return { action: "deny" };
  });
  window.webContents.on("will-navigate", (event, url) => {
    if (url.startsWith(localOrigin)) return;
    event.preventDefault();
    shell.openExternal(url);
  });
}

function startupPage() {
  const html = `<!doctype html><html><head><meta charset="utf-8"><style>
    html,body{height:100%;margin:0;background:transparent;color:#f8f4fb;font-family:Segoe UI,sans-serif;-webkit-app-region:drag}
    body{display:grid;place-items:center;background:rgba(16,13,25,.9);border:1px solid rgba(224,178,220,.2);box-sizing:border-box}
    main{text-align:center}.mark{font:56px Georgia,serif}.name{font:44px Georgia,serif;margin-top:10px}.tag{margin-top:6px;color:#cbbbd0;font-size:11px;letter-spacing:.18em;text-transform:uppercase}
    .line{width:180px;height:2px;margin:28px auto 0;overflow:hidden;background:rgba(255,255,255,.08)}.line:after{content:"";display:block;width:45%;height:100%;background:#e875ad;animation:load 1.1s ease-in-out infinite}
    @keyframes load{from{transform:translateX(-110%)}to{transform:translateX(330%)}}@media(prefers-reduced-motion:reduce){.line:after{animation:none;width:100%}}
  </style></head><body><main><div class="mark">V</div><div class="name">velvet</div><div class="tag">AI music foundry</div><div class="line"></div></main></body></html>`;
  return `data:text/html;charset=utf-8,${encodeURIComponent(html)}`;
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
