/** Desktop projects use durable files and external source references.
 * Browser-only sessions retain IndexedDB storage. Projects are never pruned automatically. */

import { isTranscriptSource, type TranscriptSource } from "./source";
import type { TranscriptLanguage } from "./languages";
import {
  DEFAULT_TRANSCRIPT_LANGUAGE,
  isTranscriptLanguage,
} from "./languages";
import type { MediaKind } from "./media";
import type { ManualCut, SceneBoundary, SpeakerInfo, Word } from "./types";

const DB_NAME = "rescript-projects";
const DB_VERSION = 1;
const STORE = "projects";

export interface ProjectMeta {
  id: string;
  name: string;
  mediaKind: MediaKind;
  duration: number;
  source: TranscriptSource;
  transcriptLanguage: TranscriptLanguage;
  updatedAt: number;
  createdAt: number;
  thumbnail?: string;
  filePath?: string;
  missing?: boolean;
  recoveryAvailable?: boolean;
}

/** Read source from a stored row; older saves used `model`. */
function projectSource(row: {
  source?: unknown;
  model?: unknown;
}): TranscriptSource {
  const raw = row.source ?? row.model;
  return isTranscriptSource(raw) ? raw : "base";
}

export interface ProjectRecord extends ProjectMeta {
  words: Word[];
  showDeleted: boolean;
  /** Blade/trim cuts not owned by deleted words (optional for older saves). */
  manualCuts?: ManualCut[];
  /** Scene split points in original media time (optional for older saves). */
  sceneBoundaries?: SceneBoundary[];
  /** Named speakers (optional for older saves — derived from words when missing). */
  speakers?: SpeakerInfo[];
  /** Original media bytes. */
  media: Blob;
  /** MIME type used when reconstructing a File. */
  mediaType: string;
  mediaName?: string;
  currentTime?: number;
  transcriptionComplete?: boolean;
  transcriptionResultKey?: string;
}

export type ProjectWrite = Omit<ProjectRecord, "id" | "createdAt" | "updatedAt"> & {
  id?: string;
  createdAt?: number;
};

// One shared connection for the page. Opening (and closing) a fresh one per
// call churned connections — every autosave paid an open handshake, and DevTools
// lists the database once per open, which looks like duplicate stores.
let dbPromise: Promise<IDBDatabase> | null = null;
let liveDb: IDBDatabase | null = null;

/** Drop the cached handle so the next call reopens. */
function forgetDb(db: IDBDatabase) {
  if (liveDb !== db) return;
  liveDb = null;
  dbPromise = null;
}

function openDb(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    if (typeof indexedDB === "undefined") {
      reject(new Error("IndexedDB is not available."));
      return;
    }
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) {
        const store = db.createObjectStore(STORE, { keyPath: "id" });
        store.createIndex("updatedAt", "updatedAt", { unique: false });
      }
    };
    req.onsuccess = () => {
      const db = req.result;
      liveDb = db;
      // A held-open connection blocks another tab's upgrade, and the browser can
      // force-close it when reclaiming storage — invalidate the cache for both.
      db.onversionchange = () => {
        db.close();
        forgetDb(db);
      };
      db.onclose = () => forgetDb(db);
      resolve(db);
    };
    req.onerror = () => {
      dbPromise = null;
      reject(req.error ?? new Error("Failed to open projects DB."));
    };
  });
  return dbPromise;
}

function idbReq<T>(req: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error ?? new Error("IndexedDB request failed."));
  });
}

function txDone(tx: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error ?? new Error("IndexedDB transaction failed."));
    tx.onabort = () => reject(tx.error ?? new Error("IndexedDB transaction aborted."));
  });
}

/** List projects newest-first (metadata only — no media/words payloads). */
export async function listProjects(): Promise<ProjectMeta[]> {
  if (typeof window !== "undefined" && window.rescriptDesktop?.projects) return window.rescriptDesktop.projects.list() as Promise<ProjectMeta[]>;
  const db = await openDb();
  const tx = db.transaction(STORE, "readonly");
  const store = tx.objectStore(STORE);
  const rows = await idbReq(store.getAll() as IDBRequest<ProjectRecord[]>);
  await txDone(tx);
  return rows
    .map((r) => ({
      id: r.id,
      name: r.name,
      mediaKind: r.mediaKind,
      duration: r.duration,
      source: projectSource(r),
      transcriptLanguage: isTranscriptLanguage(r.transcriptLanguage)
        ? r.transcriptLanguage
        : DEFAULT_TRANSCRIPT_LANGUAGE,
      updatedAt: r.updatedAt,
      createdAt: r.createdAt,
    }))
    .sort((a, b) => b.updatedAt - a.updatedAt);
}

export async function getProject(id: string): Promise<ProjectRecord | null> {
  const desktop = typeof window !== "undefined" ? window.rescriptDesktop?.projects : undefined;
  if (desktop) {
    const doc = await desktop.read(id);
    let mediaUrl: string;
    try { mediaUrl = await desktop.media(id); }
    catch {
      if (!await desktop.relink(id)) throw new Error("Source media is missing. Relink it to continue editing.");
      mediaUrl = await desktop.media(id);
    }
    const response = await fetch(mediaUrl);
    if (!response.ok) throw new Error("Could not load the original media.");
    const media = await response.blob();
    return {...doc.data, id:doc.id, createdAt:doc.createdAt, updatedAt:doc.updatedAt,
      filePath:doc.filePath, media, mediaName:doc.media.name,mediaType:media.type} as ProjectRecord;
  }
  const db = await openDb();
  const tx = db.transaction(STORE, "readonly");
  const row = await idbReq(
    tx.objectStore(STORE).get(id) as IDBRequest<
      (ProjectRecord & { model?: unknown }) | undefined
    >
  );
  await txDone(tx);
  if (!row) return null;
  return { ...row, source: projectSource(row) };
}

/** Insert or replace a project without deleting older projects. Returns the id. */
export async function putProject(input: ProjectWrite): Promise<string> {
  const desktop = typeof window !== "undefined" ? window.rescriptDesktop?.projects : undefined;
  if (desktop) {
    const {media, mediaType: _type, ...fields} = input;
    void _type;
    const id = input.id ?? crypto.randomUUID();
    const payload = {...fields, id} as import("../electron/project-files").ProjectData;
    if (input.id) await desktop.save(id,payload);
    else await desktop.create(payload,media as File);
    window.dispatchEvent(new Event("rescript:projects-changed"));
    return id;
  }
  const now = Date.now();
  const id = input.id ?? crypto.randomUUID();
  const db = await openDb();
  const tx = db.transaction(STORE, "readwrite");
  const store = tx.objectStore(STORE);

  // Read createdAt back in the same transaction as the write, so overlapping
  // saves can't interleave and lose it (and so a save is a single transaction).
  let createdAt = input.createdAt;
  if (createdAt === undefined && input.id !== undefined) {
    const existing = await idbReq(store.get(id) as IDBRequest<ProjectRecord | undefined>);
    createdAt = existing?.createdAt;
  }

  const record: ProjectRecord = {
    id,
    name: input.name,
    mediaKind: input.mediaKind,
    duration: input.duration,
    source: isTranscriptSource(input.source) ? input.source : "base",
    transcriptLanguage: isTranscriptLanguage(input.transcriptLanguage)
      ? input.transcriptLanguage
      : DEFAULT_TRANSCRIPT_LANGUAGE,
    words: input.words,
    showDeleted: input.showDeleted,
    manualCuts: input.manualCuts ?? [],
    sceneBoundaries: input.sceneBoundaries ?? [],
    speakers: input.speakers ?? [],
    media: input.media,
    mediaType: input.mediaType,
    createdAt: createdAt ?? now,
    updatedAt: now,
  };

  store.put(record);

  await txDone(tx);
  return id;
}

export async function deleteProject(id: string): Promise<void> {
  const db = await openDb();
  const tx = db.transaction(STORE, "readwrite");
  tx.objectStore(STORE).delete(id);
  await txDone(tx);
}

/** Reconstruct a File from a stored project for preview/export. */
export function fileFromProject(project: ProjectRecord): File {
  return new File([project.media], project.mediaName ?? project.name, {
    type: project.mediaType || project.media.type || undefined,
    lastModified: project.updatedAt,
  });
}
