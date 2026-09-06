import { mediaRange } from './media-range';
import {
  app,
  BrowserWindow,
  ipcMain,
  protocol,
  screen,
  shell,
  net,
  dialog,
  type WebContents,
} from "electron";
import { join, normalize, extname } from "node:path";
import { pathToFileURL } from "node:url";
import { installSafeClose } from "./safe-close";
import { installJobService } from "./job-service";
import { installProjectIpc } from "./project-ipc";
import type { ProjectFiles } from "./project-files";
import { existsSync, statSync } from "node:fs";
import {
  buildAppMenu,
  setRecentProjects,
  type MenuCommand,
  type RecentProject,
} from "./menu";
import {
  desktopLiteral,
  isDesktopLocale,
  resolveDesktopLocale,
  setDesktopLocale,
} from "./locale";

let projectFiles: ProjectFiles;

const isDev = !app.isPackaged;
const DEV_SERVER_URL = process.env.ELECTRON_START_URL ?? "http://localhost:3000";
const isMac = process.platform === "darwin";

type WindowMode = "compact" | "expanded" | "library";

/** The shell has two resting sizes: a small window for the upload screen, and a
 *  roomy one once the editor (transcript + preview + timeline) takes over. */
const WINDOW_SIZES: Record<WindowMode, { width: number; height: number }> = {
  compact: { width: 560, height: 400 },
  expanded: { width: 1080, height: 740 },
  library: { width: 1080, height: 740 },
};
const MIN_SIZE = { width: 560, height: 400 };

/** Height of the in-page drag strip (`h-12`), used to centre the traffic lights. */
const TITLE_BAR_HEIGHT = 48;
/** macOS traffic light buttons are 12px tall. */
const TRAFFIC_LIGHT_HEIGHT = 12;

/** MIME types for the custom app:// protocol that serves the Next static export. */
const MIME: Record<string, string> = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".wasm": "application/wasm",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
  ".ttf": "font/ttf",
  ".map": "application/json",
  ".txt": "text/plain; charset=utf-8",
};

// Register before app ready so the scheme can be privileged (fetch, workers,
// SharedArrayBuffer via COOP/COEP headers we attach below).
protocol.registerSchemesAsPrivileged([
  {
    scheme: "app",
    privileges: {
      standard: true,
      secure: true,
      supportFetchAPI: true,
      corsEnabled: true,
      stream: true,
    },
  },
]);

function staticRoot(): string {
  // Packaged: next export lives next to the compiled main process under
  // resources/app (asar) or we copy it beside electron-dist.
  return join(__dirname, "..", "out");
}

function resolveStaticPath(urlPath: string): string | null {
  const root = staticRoot();
  let pathname = decodeURIComponent(urlPath);
  if (pathname === "/" || pathname === "") pathname = "/index.html";
  // Strip leading slash and normalize; reject path escape attempts.
  const rel = normalize(pathname.replace(/^\/+/, ""));
  if (rel.startsWith("..")) return null;
  let filePath = join(root, rel);
  if (existsSync(filePath) && statSync(filePath).isDirectory()) {
    filePath = join(filePath, "index.html");
  }
  // Next static export emits /processing.html, while /processing/ can contain only RSC payloads.
  if (!existsSync(filePath) || !statSync(filePath).isFile()) {
    const html = join(root, rel.replace(/[\\/]+$/, "") + ".html");
    if (!existsSync(html) || !statSync(html).isFile()) return null;
    filePath = html;
  }
  return filePath;
}

function registerAppProtocol(): void {
  protocol.handle("app", async (request) => {
    const { pathname } = new URL(request.url);
    if (pathname.startsWith("/__media/")) {
      try {
        const id = decodeURIComponent(pathname.slice("/__media/".length));
        const file = await projectFiles.mediaPath(id);
        const size=statSync(file).size;const range=mediaRange(request.headers.get('range'),size);
        if(range.status===416)return new Response(null,{status:416,headers:{'Content-Range':'bytes */'+size}});
        const inputHeaders=new Headers(request.headers);
        if(range.status===206)inputHeaders.set('Range', 'bytes='+range.start+'-'+range.end);
        const response=await net.fetch(pathToFileURL(file).toString(),{headers:inputHeaders});
        const headers=new Headers(response.headers);
        headers.set('Accept-Ranges','bytes');headers.set('Content-Length',String(range.length));
        if(range.status===206)headers.set('Content-Range','bytes '+range.start+'-'+range.end+'/'+size);
        headers.set('Access-Control-Allow-Origin',isDev?new URL(DEV_SERVER_URL).origin:'app://localhost');
        headers.set('Cross-Origin-Resource-Policy','cross-origin');
        return new Response(response.body,{status:range.status,headers});
      } catch { return new Response("Original media needs relinking", { status: 404 }); }
    }
    const filePath = resolveStaticPath(pathname);
    if (!filePath) {
      return new Response("Not found", { status: 404, statusText: "Not Found" });
    }
    const fileUrl = pathToFileURL(filePath).toString();
    const response = await net.fetch(fileUrl);
    const headers = new Headers(response.headers);
    // Enable SharedArrayBuffer for ffmpeg.wasm + onnxruntime (same as Next
    // headers() in next.config.ts for the non-export server).
    headers.set("Cross-Origin-Opener-Policy", "same-origin");
    headers.set("Cross-Origin-Embedder-Policy", "require-corp");
    const type = MIME[extname(filePath).toLowerCase()];
    if (type) headers.set("Content-Type", type);
    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers,
    });
  });
}

/** Tracks each window's current mode so repeated requests are no-ops. */
const windowModes = new WeakMap<BrowserWindow, WindowMode>();

/** Renderers that have mounted and subscribed to menu commands. A freshly
 *  created (or reloading) window isn't listening yet, so its commands wait. */
const readyRenderers = new WeakSet<WebContents>();
const pendingCommands = new WeakMap<WebContents, MenuCommand[]>();

function deliverMenuCommand(contents: WebContents, command: MenuCommand): void {
  if (command.type === "open-file") {
    // Chromium only opens a file chooser under user activation, which an IPC
    // message doesn't carry — the click() is silently dropped. executeJavaScript
    // can grant one, so the picker is driven that way instead.
    void contents
      .executeJavaScript("window.rescriptOpenFilePicker?.()", true)
      .catch((err: unknown) => console.error("Failed to open the file picker.", err));
    return;
  }
  contents.send("menu:command", command);
}

function flushPendingCommands(contents: WebContents): void {
  const queued = pendingCommands.get(contents);
  pendingCommands.delete(contents);
  for (const command of queued ?? []) deliverMenuCommand(contents, command);
}

/** Deliver a File-menu command, launching a window if the app is running
 *  window-less (macOS keeps the menu bar after the last window closes). */
function dispatchMenuCommand(command: MenuCommand): void {
  const win =
    BrowserWindow.getFocusedWindow() ?? BrowserWindow.getAllWindows()[0] ?? createWindow();
  const contents = win.webContents;
  if (readyRenderers.has(contents)) {
    deliverMenuCommand(contents, command);
    return;
  }
  const queued = pendingCommands.get(contents) ?? [];
  queued.push(command);
  pendingCommands.set(contents, queued);
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

/** Resize a window to the given mode's resting size, keeping it centred on
 *  wherever the user left it rather than snapping to a corner. */
function applyWindowMode(win: BrowserWindow, mode: WindowMode): void {
  if (windowModes.get(win) === mode) return;
  windowModes.set(win, mode);
  // A maximized or full-screen window is already the size the user asked for.
  if (win.isFullScreen() || win.isMaximized()) return;

  const current = win.getBounds();
  const { workArea } = screen.getDisplayMatching(current);
  const width = Math.min(WINDOW_SIZES[mode].width, workArea.width);
  const height = Math.min(WINDOW_SIZES[mode].height, workArea.height);
  win.setBounds(
    {
      width,
      height,
      x: Math.round(
        clamp(
          current.x + (current.width - width) / 2,
          workArea.x,
          workArea.x + workArea.width - width
        )
      ),
      y: Math.round(
        clamp(
          current.y + (current.height - height) / 2,
          workArea.y,
          workArea.y + workArea.height - height
        )
      ),
    },
    true // animate (macOS)
  );
}

/** Set once the app is really terminating, so the close interception below
 *  doesn't swallow the quit. */
let quitting = false;

function createWindow(): BrowserWindow {
  const win = new BrowserWindow({
    ...WINDOW_SIZES.compact,
    minWidth: MIN_SIZE.width,
    minHeight: MIN_SIZE.height,
    // Light by default — appearance is a user preference in the renderer.
    backgroundColor: "#fafafa",
    title: "Rescript by Reynov",
    show: false,
    // macOS: drop the native title bar and let the page's top bar / upload drag
    // strip move the window instead. Windows and Linux keep their native frame
    // — hiding it there would take the caption buttons with it.
    ...(isMac
      ? {
          titleBarStyle: "hidden" as const,
          trafficLightPosition: {
            x: 16,
            y: Math.round((TITLE_BAR_HEIGHT - TRAFFIC_LIGHT_HEIGHT) / 2),
          },
        }
      : {}),
    webPreferences: {
      preload: join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
      backgroundThrottling: false,
    },
  });
  // Keep the fork title when the renderer updates its localized page title.
  win.on("page-title-updated", (event) => event.preventDefault());
  windowModes.set(win, "compact");

  win.webContents.on("render-process-gone", (_event, details) => {
    console.error("Editor renderer exited", details);
    void dialog.showMessageBox(win, {type:"error",message:desktopLiteral("The editor stopped responding."),detail:desktopLiteral("Saved projects remain on disk. Reload to recover your last save or choose a snapshot from the library."),buttons:[desktopLiteral("Reload"), desktopLiteral("Close")]}).then(({response}) => { if(response===0) win.reload(); else win.destroy(); });
  });
  win.once("ready-to-show", () => win.show());

  // A reload tears down the listener the renderer registered; make it re-announce.
  win.webContents.on("did-start-navigation", (event) => {
    if (event.isSameDocument) return;
    readyRenderers.delete(win.webContents);
    pendingCommands.delete(win.webContents);
  });

  // Closing while the editor is open drops the project rather than the window:
  // the renderer returns to the upload screen and the shell shrinks back. The
  // next close (already on the upload screen) is a real close. Guarded on the
  // renderer being live, so an unresponsive page can still be closed.
  win.on("close", (event) => {
    if (quitting) return;
    if (windowModes.get(win) !== "expanded") return;
    if (!readyRenderers.has(win.webContents)) return;
    event.preventDefault();
    win.webContents.send("menu:command", { type: "close-project" } satisfies MenuCommand);
  });

  // The page pads its top bar for the traffic lights, which macOS hides in
  // full screen; tell it when that changes so the gap can collapse.
  const emitFullScreen = () => {
    if (!win.isDestroyed()) {
      win.webContents.send("window:full-screen-changed", win.isFullScreen());
    }
  };
  win.on("enter-full-screen", emitFullScreen);
  win.on("leave-full-screen", emitFullScreen);

  // Open external http(s) links in the OS browser; keep app:// / localhost in-app.
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith("http:") || url.startsWith("https:")) {
      void shell.openExternal(url);
      return { action: "deny" };
    }
    return { action: "allow" };
  });
  win.webContents.on("will-navigate", (event, url) => {
    const isApp = url.startsWith("app://");
    const isDevServer = isDev && url.startsWith(DEV_SERVER_URL);
    if (!isApp && !isDevServer) {
      event.preventDefault();
      if (url.startsWith("http:") || url.startsWith("https:")) {
        void shell.openExternal(url);
      }
    }
  });

  if (isDev) {
    void win.loadURL(DEV_SERVER_URL);
  } else {
    void win.loadURL("app://localhost/");
  }

  return win;
}

// Ensure a single instance — second launches focus the existing window.
const gotLock = app.requestSingleInstanceLock();
if (!gotLock) {
  app.quit();
} else {
  app.on("second-instance", () => {
    const win = BrowserWindow.getAllWindows().find(candidate => !candidate.webContents.getURL().includes("/processing")) ?? createWindow();
    if (win) {
      if (win.isMinimized()) win.restore();
      win.show();
      win.focus();
    }
  });

  ipcMain.on("window:set-mode", (event, mode: unknown) => {
    if (mode !== "compact" && mode !== "expanded" && mode !== "library") return;
    const win = BrowserWindow.fromWebContents(event.sender);
    if (win) applyWindowMode(win, mode);
  });
  ipcMain.handle(
    "window:is-full-screen",
    (event) => BrowserWindow.fromWebContents(event.sender)?.isFullScreen() ?? false
  );
  ipcMain.on("ui:set-locale", (_event, value: unknown) => {
    if (!isDesktopLocale(value)) return;
    setDesktopLocale(value);
    buildAppMenu();
  });
  // The saved projects live in the renderer's IndexedDB; it pushes a snapshot
  // whenever the list changes so the File menu can list them.
  ipcMain.on("menu:set-recents", (_event, value: unknown) => {
    if (!Array.isArray(value)) return;
    const recents: RecentProject[] = [];
    for (const entry of value) {
      if (!entry || typeof entry !== "object") continue;
      const { id, name } = entry as { id?: unknown; name?: unknown };
      if (typeof id !== "string" || typeof name !== "string") continue;
      recents.push({ id, name });
    }
    setRecentProjects(recents);
  });
  // The renderer announces itself once it is listening for menu commands; until
  // then anything the menu fired at a just-opened window is held.
  ipcMain.on("menu:renderer-ready", (event) => {
    readyRenderers.add(event.sender);
    flushPendingCommands(event.sender);
  });

  installSafeClose(() => BrowserWindow.getAllWindows().filter(win => readyRenderers.has(win.webContents)), value => { quitting = value; });

  app.whenReady().then(() => {
    projectFiles = installProjectIpc(event => {
      const owner = BrowserWindow.fromWebContents(event.sender);
      const url = event.senderFrame?.url ?? "";
      const trusted = isDev ? url.startsWith(DEV_SERVER_URL + "/") : url.startsWith("app://localhost/");
      return owner && trusted ? owner : null;
    });
    installJobService(projectFiles, isDev ? DEV_SERVER_URL : null, join(__dirname,"preload.js"), event => {
      const url=event.senderFrame?.url??"";
      return Boolean(BrowserWindow.fromWebContents(event.sender)) && (isDev ? url.startsWith(DEV_SERVER_URL+"/") : url.startsWith("app://localhost/"));
    });
    setDesktopLocale(resolveDesktopLocale(app.getLocale()));
    registerAppProtocol();
    buildAppMenu(dispatchMenuCommand);
    createWindow();
    // Local fork: updates are installed manually; never initialize an updater.

    app.on("activate", () => {
      if (!BrowserWindow.getAllWindows().some(candidate => !candidate.webContents.getURL().includes("/processing"))) createWindow();
    });
  });

  app.on("window-all-closed", () => {
    if (process.platform !== "darwin") app.quit();
  });
}
