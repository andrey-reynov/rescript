import { contextBridge, ipcRenderer, webUtils, type IpcRendererEvent } from "electron";

/**
 * Minimal bridge for the renderer. Rescript's UI is still a normal web
 * surface; we only expose host metadata so the page can adapt chrome / skip
 * the COI service worker (headers come from the app:// protocol instead),
 * plus the few window controls the page drives (sizing, title-bar state).
 */
contextBridge.exposeInMainWorld("rescriptDesktop", {
  onSaveBeforeQuit: (save: () => Promise<void>) => {
    const listener = () => { void save().then(() => ipcRenderer.send("project:flush-reply", null)).catch(error => ipcRenderer.send("project:flush-reply", String(error))); };
    ipcRenderer.on("project:flush-request", listener);
    return () => { ipcRenderer.removeListener("project:flush-request", listener); };
  },
  jobs: {
    start: (id:string,model:string,language:string,transcribe:boolean) => ipcRenderer.invoke('job:start',id,model,language,transcribe),
    read: (id:string) => ipcRenderer.invoke('job:read',id),
    pause: (id:string) => ipcRenderer.invoke('job:pause',id),
    transcribeAll: (id:string,model:string,language:string) => ipcRenderer.invoke('job:transcribe-all',id,model,language),
    transcribeRange: (id:string,start:number,end:number,model:string,language:string) => ipcRenderer.invoke('job:transcribe-range',id,start,end,model,language),
    retryChunks: (id:string,indices:number[]) => ipcRenderer.invoke('job:retry-chunks',id,indices),
    fork: (sourceId:string,destinationId:string) => ipcRenderer.invoke('job:fork',sourceId,destinationId),
    result: (id:string) => ipcRenderer.invoke('job:result',id),
    onChanged: (callback:(id:string)=>void) => {const listener=(_event:unknown,id:string)=>callback(id);ipcRenderer.on('job:changed',listener);return()=>{ipcRenderer.removeListener('job:changed',listener);};},
  },
  processing: {
    take: () => ipcRenderer.invoke('processing:take'),
    preparation: () => ipcRenderer.invoke('processing:preparation'),
    prepareChunk: (index:number,bytes:Uint8Array,finished:boolean) => ipcRenderer.invoke('processing:prepare-chunk',index,bytes,finished),
    completePreparedAudio: () => ipcRenderer.invoke('processing:complete-prepared-audio'),
    beginAudio: () => ipcRenderer.invoke('processing:begin-audio'),
    appendAudio: (bytes:Uint8Array) => ipcRenderer.invoke('processing:append-audio',bytes),
    audioReady: (peaks:unknown) => ipcRenderer.invoke('processing:audio-ready',peaks),
    preferCpu: () => ipcRenderer.invoke('processing:prefer-cpu'),
    next: () => ipcRenderer.invoke('processing:next'),
    checkpoint: (key:string,chunk:unknown,words:unknown) => ipcRenderer.invoke('processing:checkpoint',key,chunk,words),
    progress: (message:string,value:number|null) => ipcRenderer.invoke('processing:progress',message,value),
    fail: (message:string) => ipcRenderer.invoke('processing:fail',message),
  },
  projects: {
    migrate: (data:unknown,source:unknown) => ipcRenderer.invoke("project:migrate",data,source),
    folder: () => ipcRenderer.invoke("project:folder"),
    chooseFolder: () => ipcRenderer.invoke("project:choose-folder"),
    list: () => ipcRenderer.invoke("project:list"),
    create: (data: unknown, file: File) => ipcRenderer.invoke("project:create", data, webUtils.getPathForFile(file)),
    save: (id: string, data: unknown) => ipcRenderer.invoke("project:save", id, data),
    read: (id: string) => ipcRenderer.invoke("project:read", id),
    media: (id: string) => ipcRenderer.invoke("project:media", id),
    open: () => ipcRenderer.invoke("project:open"),
    saveAs: (id: string, data: unknown) => ipcRenderer.invoke("project:save-as", id, data),
    relink: (id: string) => ipcRenderer.invoke("project:relink", id),
    snapshots: (id: string) => ipcRenderer.invoke("project:snapshots", id),
    restore: (id: string, snapshot: string) => ipcRenderer.invoke("project:restore", id, snapshot),
    show: (id: string) => ipcRenderer.invoke("project:show", id),
  },
  platform: process.platform as NodeJS.Platform,
  versions: {
    electron: process.versions.electron,
    chrome: process.versions.chrome,
    node: process.versions.node,
  },
  /** Switch between the compact upload window and the full editor window. */
  setWindowMode: (mode: "compact" | "expanded" | "library") => {
    ipcRenderer.send("window:set-mode", mode);
  },
  /** Keep native menus and dialogs in sync with the renderer preference. */
  setUiLocale: (locale: string) => {
    ipcRenderer.send("ui:set-locale", locale);
  },
  /**
   * Publish the saved-project list (newest first) so the main process can draw
   * it under File › Recent Projects. Only id + name are sent.
   */
  setRecentProjects: (projects: Array<{ id: string; name: string }>) => {
    ipcRenderer.send(
      "menu:set-recents",
      projects.map(({ id, name }) => ({ id, name }))
    );
  },
  /** Subscribe to File-menu actions; returns an unsubscribe function. */
  onMenuCommand: (callback: (command: unknown) => void) => {
    const listener = (_event: IpcRendererEvent, command: unknown) => callback(command);
    ipcRenderer.on("menu:command", listener);
    // Tell the main process the page is listening, so commands fired at a
    // window that was opened *by* the menu aren't lost before mount.
    ipcRenderer.send("menu:renderer-ready");
    return () => {
      ipcRenderer.off("menu:command", listener);
    };
  },
  isFullScreen: (): Promise<boolean> => ipcRenderer.invoke("window:is-full-screen"),
  onFullScreenChange: (callback: (value: boolean) => void) => {
    const listener = (_event: IpcRendererEvent, value: boolean) => callback(value);
    ipcRenderer.on("window:full-screen-changed", listener);
    return () => {
      ipcRenderer.off("window:full-screen-changed", listener);
    };
  },
});
