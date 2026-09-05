/** Incremental project saves; user-visible errors and a maximum 500 ms debounce. */
import { useEditorStore } from "./store";
import { putProject } from "./projects";

let timer: ReturnType<typeof setTimeout> | null = null;
let queue: Promise<void> = Promise.resolve();
let editRevision = 0;

export function scheduleProjectAutosave() {
  if (typeof window === "undefined") return;
  editRevision++;
  useEditorStore.setState({ saveState: "pending" });
  // Start a bounded window at the first edit; typing must not defer it forever.
  if (timer) return;
  timer = setTimeout(() => {
    timer = null;
    void flushProjectAutosave().catch(() => { /* Error is visible in the project bar. */ });
  }, 500);
}

export function projectPayload() {
  const s = useEditorStore.getState();
  if (!s.videoFile || !s.mediaKind) throw new Error("Open a project first.");
  return { id: s.projectId ?? undefined, name: s.projectName || s.videoFile.name,
    mediaKind: s.mediaKind, duration: s.duration, source: s.source,
    transcriptLanguage: s.transcriptLanguage, words: s.words, showDeleted:s.showDeleted,
    manualCuts:s.manualCuts, sceneBoundaries:s.sceneBoundaries, speakers:s.speakers,
    currentTime:s.currentTime, thumbnail:s.projectThumbnail ?? undefined,
    transcriptionComplete:s.skipTranscription || s.status === 'ready' || s.status === 'exporting',
    media:s.videoFile, mediaType:s.videoFile.type };
}

export function flushProjectAutosave(): Promise<void> {
  if(timer) {clearTimeout(timer);timer=null;}
  queue=queue.catch(()=>{}).then(async()=>{
    const s=useEditorStore.getState();
    if(!s.videoFile || !s.mediaKind || s.status==='idle') return;
    const file=s.videoFile;
    const savingRevision=editRevision;
    useEditorStore.setState({saveState:'saving',saveError:null});
    try {
      const id=await putProject(projectPayload());
      if(useEditorStore.getState().videoFile === file) {
        useEditorStore.setState({projectId:id,saveState:savingRevision===editRevision?'saved':'pending',lastSavedAt:Date.now(),saveError:null});
      }
    } catch(error) {
      if(useEditorStore.getState().videoFile===file) useEditorStore.setState({saveState:'error',saveError:error instanceof Error?error.message:'Could not save the project.'});
      throw error;
    }
  });
  return queue;
}

export async function saveProjectAs(): Promise<void> {
  await flushProjectAutosave();
  const s=useEditorStore.getState();
  if(!s.projectId || !window.rescriptDesktop?.projects) throw new Error('Save As requires the desktop app.');
  const {media,mediaType,...data}=projectPayload();void media;void mediaType;
  const result=await window.rescriptDesktop.projects.saveAs(s.projectId,{...data,id:s.projectId});
  if(result) {
    useEditorStore.setState({projectId:result.id,projectName:result.data.name,lastSavedAt:result.updatedAt,saveState:'saved'});
    window.dispatchEvent(new Event('rescript:projects-changed'));
  }
}

export async function closeCurrentProject(): Promise<void> {
  await flushProjectAutosave();
  useEditorStore.getState().reset();
}
