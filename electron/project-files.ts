import { promises as fs } from "node:fs";
import path from "node:path";
import { createHash, randomUUID } from "node:crypto";

export interface SourceReference {
  path: string;
  name: string;
  size: number;
  modifiedAt: number;
  fingerprint: string;
}

export interface ProjectData {
  silenceSettings?:import("../lib/silence-analysis").SilenceSettings;
  id: string;
  name: string;
  mediaKind: "audio" | "video";
  duration: number;
  source: string;
  transcriptLanguage: string;
  words: unknown[];
  phrases?: import("../lib/transcript-schema").PhraseGroup[];
  clipNames?: import("../lib/transcript-schema").ClipName[];
  transcriptView?: import("../lib/transcript-schema").TranscriptView;
  showDeleted: boolean;
  manualCuts?: unknown[];
  sceneBoundaries?: unknown[];
  speakers?: unknown[];
  currentTime?: number;
  thumbnail?: string;
  transcriptionPreferences?: {source:string;transcriptLanguage:string};
  transcriptionPreservedCuts?: Array<{start:number;end:number}>;
  transcriptionComplete?: boolean;
  transcriptImportId?: string;
  transcriptionResultKey?: string;
  transcriptionChunks?: number[];
  sourceAudio?: import("../lib/audio-export").SourceAudioLayout;
  [key: string]: unknown;
}

export interface ProjectDocument {
  format: "rescript-project";
  version: 1;
  id: string;
  createdAt: number;
  updatedAt: number;
  revision: number;
  media: SourceReference;
  data: ProjectData;
}

interface LibrarySettings {
  projectsFolder: string;
  projects: Record<string, string>;
}

export interface ProjectSummary {
  id: string;
  name: string;
  mediaKind: "audio" | "video";
  duration: number;
  source: string;
  transcriptLanguage: string;
  thumbnail?: string;
  createdAt: number;
  updatedAt: number;
  filePath: string;
  missing?: boolean;
  recoveryAvailable?: boolean;
}

/** Write through a sibling temporary file; a crash never truncates the last save. */
export async function atomicJson(file: string, value: unknown): Promise<void> {
  await fs.mkdir(path.dirname(file), { recursive: true });
  const temp = `${file}.${randomUUID()}.tmp`;
  try {
    const handle = await fs.open(temp, "wx");
    try { await handle.writeFile(JSON.stringify(value)); await handle.sync(); }
    finally { await handle.close(); }
    await fs.rename(temp, file);
  } finally { await fs.rm(temp, { force: true }); }
}

export async function sourceReference(file: string): Promise<SourceReference> {
  const absolute = path.resolve(file);
  const stat = await fs.stat(absolute);
  if (!stat.isFile()) throw new Error("Choose an original media file.");
  const handle = await fs.open(absolute, "r");
  try {
    const hash = createHash("sha256").update(String(stat.size));
    for (const offset of [0, Math.max(0, stat.size - 65536)]) {
      const buffer = Buffer.alloc(Math.min(65536, stat.size));
      const { bytesRead } = await handle.read(buffer, 0, buffer.length, offset);
      hash.update(buffer.subarray(0, bytesRead));
    }
    return { path: absolute, name: path.basename(absolute), size: stat.size,
      modifiedAt: stat.mtimeMs, fingerprint: hash.digest("hex") };
  } finally { await handle.close(); }
}

function validate(value: unknown): ProjectDocument {
  const doc = value as ProjectDocument;
  if (!doc || doc.format !== "rescript-project" || doc.version !== 1 ||
      typeof doc.id !== "string" || !doc.media || typeof doc.media.path !== "string" ||
      !doc.data || !Array.isArray(doc.data.words) || doc.data.id !== doc.id ||
      typeof doc.data.name !== "string") {
    throw new Error("This project is damaged or uses an unsupported format. Try a recovery snapshot.");
  }
  return doc;
}

function summary(doc: ProjectDocument, filePath: string): ProjectSummary {
  const { id, name, mediaKind, duration, source, transcriptLanguage, thumbnail } = doc.data;
  return { id, name, mediaKind, duration, source, transcriptLanguage, thumbnail,
    createdAt: doc.createdAt, updatedAt: doc.updatedAt, filePath };
}

/** Desktop project files are authoritative; the library only remembers their locations. */
export class ProjectFiles {
  private settings!: LibrarySettings;
  private tail: Promise<unknown> = Promise.resolve();
  readonly ready: Promise<void>;

  constructor(readonly configFile: string, readonly defaultFolder: string) {
    this.ready = this.initialize();
  }

  private async initialize() {
    try {
      this.settings = JSON.parse(await fs.readFile(this.configFile, "utf8"));
      if (!this.settings.projectsFolder || !this.settings.projects) throw new Error("Invalid library settings.");
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
      this.settings = { projectsFolder: this.defaultFolder, projects: {} };
    }
    await fs.mkdir(this.settings.projectsFolder, { recursive: true });
  }

  private serial<T>(action: () => Promise<T>): Promise<T> {
    const next = this.tail.catch(() => {}).then(() => this.ready).then(action);
    this.tail = next;
    return next;
  }

  async folder(): Promise<string> { await this.ready; return this.settings.projectsFolder; }

  setFolder(folder: string): Promise<void> {
    return this.serial(async () => {
      const absolute = path.resolve(folder);
      await fs.mkdir(absolute, { recursive: true });
      // Confirm write access before committing the new default.
      const probe = path.join(absolute, `.rescript-write-${randomUUID()}`);
      await fs.writeFile(probe, "", { flag: "wx" });
      await fs.rm(probe);
      const next = { ...this.settings, projectsFolder: absolute };
      await atomicJson(this.configFile, next);
      this.settings = next;
    });
  }

  async fileFor(id: string): Promise<string> {
    await this.ready;
    const file = this.settings.projects[id];
    if (!file) throw new Error("Project is not in the library. Use Open Project to locate it.");
    return file;
  }

  async read(id: string): Promise<ProjectDocument> {
    const file = await this.fileFor(id);
    const doc = validate(JSON.parse(await fs.readFile(file, "utf8")));
    // Resolve a portable relative reference against the project file.
    doc.media.path = path.resolve(path.dirname(file), doc.media.path);
    return doc;
  }

  private async remember(id: string, file: string) {
    const next = { ...this.settings, projects: { ...this.settings.projects, [id]: file } };
    await atomicJson(this.configFile, next);
    this.settings = next;
  }

  register(file: string): Promise<ProjectDocument> {
    return this.serial(async () => {
      const absolute = path.resolve(file);
      const doc = validate(JSON.parse(await fs.readFile(absolute, "utf8")));
      await this.remember(doc.id, absolute);
      return this.read(doc.id);
    });
  }

  create(data: ProjectData, media: SourceReference, destination?: string): Promise<ProjectDocument> {
    return this.serial(async () => {
      if (this.settings.projects[data.id]) throw new Error("Project already exists.");
      const slug = data.name.replace(/[<>:"/\\|?*\x00-\x1f]/g, "_").slice(0, 70).trim() || "Untitled";
      const file = destination ? path.resolve(destination) : path.join(this.settings.projectsFolder, `${slug}-${data.id.slice(0,8)}`, "project.rescript");
      try { await fs.access(file); throw new Error("A project already exists at that location. Choose a different filename."); }
      catch (error) { if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error; }
      const now = Date.now();
      const doc: ProjectDocument = { format: "rescript-project", version: 1, id: data.id,
        createdAt: now, updatedAt: now, revision: 1, media, data };
      await this.writeDocument(file, doc);
      await this.remember(doc.id, file);
      return doc;
    });
  }

  private async writeDocument(file: string, doc: ProjectDocument) {
    const portable = { ...doc, media: { ...doc.media, path: path.relative(path.dirname(file), doc.media.path) || doc.media.path } };
    await atomicJson(file, portable);
    await atomicJson(`${file}.summary.json`, summary(doc, file));
  }

  save(id: string, data: ProjectData): Promise<ProjectDocument> {
    return this.update(id,old=>{
      // An editor may have queued this save before the worker committed its result.
      // Keep the authoritative transcript until that editor has acknowledged it.
      const newImport=data.source==='import'&&!!data.transcriptImportId&&data.transcriptImportId!==old.transcriptImportId;
      if(newImport)return data;
      if(old.transcriptionResultKey && data.transcriptionResultKey!==old.transcriptionResultKey){
        let manualCuts=data.manualCuts;
        if(old.transcriptionPreservedCuts?.length){
          const incoming=(data.manualCuts??[]) as Array<{id:number;start:number;end:number}>;
          let nextId=incoming.reduce((max,cut)=>Math.max(max,cut.id),0)+1;
          manualCuts=[...incoming,...old.transcriptionPreservedCuts.map(range=>({...range,id:nextId++}))];
        }
        return {...data,...old.transcriptionPreferences,transcriptionPreferences:old.transcriptionPreferences,manualCuts,phrases:old.phrases,transcriptionPreservedCuts:old.transcriptionPreservedCuts,words:old.words,speakers:old.speakers,transcriptionComplete:old.transcriptionComplete,transcriptionResultKey:old.transcriptionResultKey,transcriptionChunks:old.transcriptionChunks};
      }
      if(old.transcriptionResultKey&&data.transcriptionResultKey===old.transcriptionResultKey&&old.transcriptionChunks?.some(index=>!data.transcriptionChunks?.includes(index))){
        const known=new Set(data.transcriptionChunks??[]);
        const incoming=data.words as Array<{id:number;start:number;end:number}>;const ids=new Set(incoming.map(word=>word.id));
        const unseen=(old.words as typeof incoming).filter(word=>!known.has(Math.floor(((word.start+word.end)/2)/60))&&!ids.has(word.id));
        return {...data,words:[...incoming,...unseen].sort((a,b)=>a.start-b.start||a.id-b.id),transcriptionChunks:old.transcriptionChunks,transcriptionComplete:old.transcriptionComplete};
      }
      return data;
    });
  }

  update(id: string, change: (current:ProjectData)=>ProjectData): Promise<ProjectDocument> {
    return this.serial(async () => {
      const file = await this.fileFor(id);
      const old = await this.read(id);
      const data=change(old.data);
      if(data===old.data)return old;
      if (data.id !== id) throw new Error("Project identity mismatch.");
      const snapshots = `${file}.snapshots`;
      await fs.mkdir(snapshots, { recursive: true });
      // Keep a previous consistent revision before replacing the current one.
      await atomicJson(path.join(snapshots, `${String(old.revision).padStart(12,"0")}.json`), old);
      const next = { ...old, data, updatedAt: Date.now(), revision: old.revision + 1 };
      await this.writeDocument(file, next);
      const names = (await fs.readdir(snapshots)).filter(n=>/^\d{12,}\.json$/.test(n)).sort();
      for (const name of names.slice(0, Math.max(0,names.length-20))) await fs.rm(path.join(snapshots,name));
      return next;
    });
  }

  async snapshots(id: string): Promise<string[]> {
    try { return (await fs.readdir(`${await this.fileFor(id)}.snapshots`)).filter(n=>/^\d{12,}\.json$/.test(n)).sort().reverse(); }
    catch (e) { if ((e as NodeJS.ErrnoException).code === "ENOENT") return []; throw e; }
  }

  restore(id: string, snapshot: string): Promise<ProjectDocument> {
    return this.serial(async () => {
      if (!(await this.snapshots(id)).includes(snapshot)) throw new Error("Snapshot not found.");
      const file = await this.fileFor(id);
      const doc = validate(JSON.parse(await fs.readFile(path.join(`${file}.snapshots`,snapshot),"utf8")));
      if (doc.id !== id) throw new Error("Snapshot identity mismatch.");
      // Preserve even a corrupted current file for manual recovery.
      await fs.copyFile(file, `${file}.before-recovery-${Date.now()}`).catch(e=>{ if(e.code!=="ENOENT") throw e; });
      doc.updatedAt = Date.now();
      doc.revision = Math.max(doc.revision + 1, Date.now());
      await this.writeDocument(file,doc);
      return doc;
    });
  }

  relink(id: string, replacement: string): Promise<ProjectDocument> {
    return this.serial(async () => {
      const doc = await this.read(id);
      const media = await sourceReference(replacement);
      if (media.size !== doc.media.size || media.fingerprint !== doc.media.fingerprint)
        throw new Error("This file does not match the original source. Select the original media file.");
      doc.media = media;
      doc.updatedAt = Date.now();
      doc.revision++;
      await this.writeDocument(await this.fileFor(id),doc);
      return doc;
    });
  }

  async mediaPath(id: string): Promise<string> {
    const doc = await this.read(id);
    const stat = await fs.stat(doc.media.path).catch(()=>null);
    if (!stat || stat.size !== doc.media.size) throw new Error("Source media is missing or changed. Relink the original file.");
    if(stat.mtimeMs !== doc.media.modifiedAt && (await sourceReference(doc.media.path)).fingerprint !== doc.media.fingerprint) throw new Error("Source media changed. Relink the original file.");
    return doc.media.path;
  }

  forget(id: string): Promise<void> {
    return this.serial(async () => {
      const projects = { ...this.settings.projects }; delete projects[id];
      const next = { ...this.settings, projects };
      await atomicJson(this.configFile, next); this.settings = next;
    });
  }

  list(): Promise<ProjectSummary[]> {
    return this.serial(async () => {
      // Discover files in the designated folder as well as remembered Save As locations.
      const files = new Set(Object.values(this.settings.projects));
      for (const entry of await fs.readdir(this.settings.projectsFolder,{withFileTypes:true})) {
        if(entry.isFile() && entry.name.endsWith('.rescript')) files.add(path.join(this.settings.projectsFolder,entry.name));
        if(entry.isDirectory()) {
          const candidate=path.join(this.settings.projectsFolder,entry.name,'project.rescript');
          try { await fs.access(candidate); files.add(candidate); } catch { /* Not a project directory. */ }
        }
      }
      const rows: ProjectSummary[]=[];
      let changed=false;
      for(const file of files) {
        try {
          let row: ProjectSummary;
          const stat=await fs.stat(file);
          try {
            const cached=JSON.parse(await fs.readFile(`${file}.summary.json`,'utf8')) as ProjectSummary;
            const cachedStat=await fs.stat(`${file}.summary.json`);
            if(cachedStat.mtimeMs < stat.mtimeMs) throw new Error('Stale metadata');
            row={...cached,filePath:file};
          } catch { row=summary(validate(JSON.parse(await fs.readFile(file,'utf8'))),file); }
          if(this.settings.projects[row.id]!==file){this.settings.projects[row.id]=file;changed=true;}
          rows.push(row);
        } catch {
          const id=Object.keys(this.settings.projects).find(k=>this.settings.projects[k]===file);
          if(id) rows.push({id,name:path.basename(path.dirname(file)),filePath:file,mediaKind:'video',duration:0,source:'base',transcriptLanguage:'en',createdAt:0,updatedAt:0,missing:true,recoveryAvailable:(await this.snapshots(id)).length>0});
        }
      }
      if(changed) await atomicJson(this.configFile,this.settings);
      return rows.sort((a,b)=>b.updatedAt-a.updatedAt);
    });
  }
}
