"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import Image from "next/image";
import {
  AudioLines,
  Clapperboard,
  Film,
  Loader2,
  Music,
  Scissors,
  ShieldAlert,
  Type,
} from "lucide-react";
import logo from "@/assets/logo.png";
import SocialLinks, { GITHUB_REPO_URL, FORK_NOTICE } from "./SocialLinks";
import SettingsMenu from "./SettingsMenu";
import ModelSelector, {
  LanguageSection,
  ModelOption,
  ModelOptionSeparator,
} from "./ModelSelector";
import ImportTranscriptOption from "./ImportTranscriptOption";
import { MODEL_ORDER } from "@/lib/models";
import { useMediaEngineSupport } from "@/hooks/useMediaEngineSupport";
import { detectMediaKind, MEDIA_ACCEPT } from "@/lib/media";
import ProjectLibrary from "./ProjectLibrary";
import {
  listProjects,
  type ProjectMeta,
} from "@/lib/projects";
import { isElectron } from "@/lib/platform";
import { useEditorStore } from "@/lib/store";
import type { SpeakerInfo, Word } from "@/lib/types";
import { useI18n } from "./I18nProvider";
import {
  localizeRuntimeMessage,
} from "@/lib/i18n";

// The three media cards that stand in for the upload icon. Each carries its
// resting transform plus the fanned-out one, applied either on hover (via the
// dropzone's `group`) or while a file is being dragged over.
const CARDS = [
  {
    icon: Film,
    size: "h-[4.25rem] w-[3.25rem]",
    iconSize: 18,
    bars: ["w-7", "w-4"],
    fan: "-rotate-[18deg] -translate-x-10 -translate-y-1.5",
    rest: "-rotate-[11deg] -translate-x-5 group-hover:-rotate-[18deg] group-hover:-translate-x-10 group-hover:-translate-y-1.5",
  },
  {
    icon: AudioLines,
    size: "h-20 w-16",
    iconSize: 22,
    bars: ["w-9", "w-5"],
    fan: "z-10 -translate-y-2.5",
    rest: "z-10 group-hover:-translate-y-2.5",
  },
  {
    icon: Music,
    size: "h-[4.25rem] w-[3.25rem]",
    iconSize: 18,
    bars: ["w-7", "w-4"],
    fan: "rotate-[18deg] translate-x-10 -translate-y-1.5",
    rest: "rotate-[11deg] translate-x-5 group-hover:rotate-[18deg] group-hover:translate-x-10 group-hover:-translate-y-1.5",
  },
] as const;

function MediaCards({ dragging }: { dragging: boolean }) {
  return (
    <div className="pointer-events-none relative mb-5 flex h-24 w-full items-center justify-center">
      {CARDS.map(({ icon: Icon, size, iconSize, bars, rest, fan }, i) => (
        <div
          key={i}
          className={`absolute flex flex-col items-center justify-center gap-1.5 rounded-xl border border-zinc-200 bg-white transition-transform duration-300 ease-out dark:border-zinc-800 ${dragging ? "dark:bg-zinc-900" : "dark:bg-zinc-900 group-hover:dark:bg-zinc-900"} ${size} ${dragging ? fan : rest
            }`}
        >
          <Icon size={iconSize} className="text-neutral-400 dark:text-neutral-500" />
          <div className="flex flex-col items-center gap-1">
            {bars.map((w) => (
              <span key={w} className={`block h-[3px] rounded-full bg-zinc-200 dark:bg-zinc-700 ${w}`} />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

export default function UploadScreen({
  onFile,
}: {
  onFile: (
    file: File,
    options?: { words?: Word[]; speakers?: SpeakerInfo[] }
  ) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const inputId = useId();
  const [dragging, setDragging] = useState(false);
  const [projects, setProjects] = useState<ProjectMeta[]>([]);
  const [libraryError,setLibraryError]=useState<string|null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  // Don't accept a file until the media engine is known to be usable —
  // transcription would fail immediately otherwise.
  const engine = useMediaEngineSupport();
  const ready = engine === "ready";
  const unsupported = engine === "no-isolation" || engine === "no-simd";
  const source = useEditorStore((s) => s.source);
  const pendingTranscript = useEditorStore((s) => s.pendingTranscript);
  const openProject = useEditorStore((s) => s.openProject);

  const { t } = useI18n();

  const refreshProjects = useCallback(async () => {
    try {
      setProjects(await listProjects());setLibraryError(null);
    } catch (err) {
      console.warn("Failed to list saved projects.", err);
      setLibraryError(err instanceof Error?err.message:'Could not load the project library.');
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    // IndexedDB is an external store; load once on mount for the recent list.
    void listProjects()
      .then((rows) => {
        if (!cancelled) setProjects(rows);
      })
      .catch((err) => {
        console.warn("Failed to list saved projects.", err);
        if (!cancelled) setLibraryError(err instanceof Error?err.message:'Could not load the project library.');
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const handleFiles = useCallback(
    (files: FileList | null) => {
      if (!ready) return;
      const file = files?.[0];
      if (!file) return;
      if (!detectMediaKind(file)) {
        alert(t("editor.chooseMedia"));
        return;
      }
      const { source, pendingTranscript: pending } = useEditorStore.getState();
      if (source === "import") {
        if (!pending) {
          alert(t("editor.chooseTranscript"));
          return;
        }
        onFile(file, { words: pending.words, speakers: pending.speakers });
        return;
      }
      onFile(file);
    },
    [onFile, ready, t]
  );

  const handleOpen = useCallback(
    async (id: string) => {
      if (!ready) return;
      setBusyId(id);
      try {
        await openProject(id);
      } catch (err) {
        console.error(err);
        alert(
          err instanceof Error
            ? localizeRuntimeMessage(err.message, t)
            : t("error.openProject")
        );
        await refreshProjects();
      } finally {
        setBusyId(null);
      }
    },
    [openProject, ready, refreshProjects, t]
  );

  useEffect(() => {
    const refresh=()=>{void refreshProjects();};
    window.addEventListener('rescript:projects-changed',refresh);
    return()=>window.removeEventListener('rescript:projects-changed',refresh);
  },[refreshProjects]);
  useEffect(()=>{window.rescriptDesktop?.setWindowMode(projects.length?'library':'compact');},[projects.length]);

  return (
    <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain bg-gradient-to-b from-zinc-50 to-neutral-50/50 dark:from-zinc-950 dark:to-zinc-900/50">
      {/* min-h-full + items-center centers when content fits; the outer
          overflow-y-auto still lets short viewports (mobile) scroll the top. */}
      <div className="flex min-h-full items-center justify-center p-6">
        <div className={projects.length ? "w-full max-w-6xl" : "w-full max-w-xl"}>
          {!isElectron && (
            <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <a href={GITHUB_REPO_URL} target="_blank" rel="noopener noreferrer" className="hover:opacity-80 transition-opacity">
                <div className="flex min-w-0 items-center">
                  <Image
                    src={logo}
                    alt="Rescript"
                    width={24}
                    height={24}
                    priority
                    className="rounded-sm border border-zinc-200 dark:border-zinc-700"
                  />
                  <p className="ml-2 text-[15px] font-medium text-zinc-800 dark:text-zinc-100">
                    Rescript
                  </p>
                </div>
              </a>
              <div className="flex flex-wrap items-center gap-2 sm:justify-end">
                <SettingsMenu />
                <div className="h-5 w-px bg-zinc-200 dark:bg-zinc-700 mr-1" />
                <ModelSelector groupLabel={t("model.transcriptSource")}>
                  {MODEL_ORDER.map((id) => (
                    <ModelOption key={id} id={id} />
                  ))}
                  <ModelOptionSeparator />
                  <LanguageSection />
                  <ModelOptionSeparator />
                  <ImportTranscriptOption />
                </ModelSelector>
              </div>
            </div>
          )}
          {isElectron && <div className="mb-4 flex justify-end"><button type="button" className="rounded-lg border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700" onClick={()=>void window.rescriptDesktop!.projects.open().then(id=>{if(id)void handleOpen(id);}).catch(e=>alert(e.message))}>Open project…</button></div>}
          {/*
            Native <label htmlFor> opens the file dialog without a synthetic
            input.click(). display:none inputs + .click() fail in some Chromium
            setups (DnD still works), which matches "browse does nothing".
          */}
          <label
            htmlFor={inputId}
            aria-disabled={!ready}
            tabIndex={ready ? 0 : -1}
            onClick={(e) => {
              if (!ready) e.preventDefault();
            }}
            onKeyDown={(e) => {
              if (!ready) return;
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                inputRef.current?.click();
              }
            }}
            onDragOver={(e) => {
              e.preventDefault();
              if (ready) setDragging(true);
            }}
            onDragLeave={() => setDragging(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDragging(false);
              handleFiles(e.dataTransfer.files);
            }}
            className={`group flex flex-col items-center justify-center rounded-2xl border-2 border-dashed bg-white/80 px-8 ${projects.length ? "py-5" : "py-14"} text-center transition dark:bg-zinc-900/40 ${!ready
              ? "cursor-default border-zinc-200 dark:border-zinc-700"
              : dragging
                ? "cursor-pointer border-neutral-500 bg-neutral-50/80 dark:border-neutral-600 dark:bg-zinc-900/60"
                : "cursor-pointer border-zinc-300 hover:border-neutral-400 hover:bg-white dark:border-zinc-700 dark:hover:border-neutral-600 dark:hover:bg-zinc-900/60"
              }`}
          >
            {ready ? (
              projects.length ? <Film size={24} className="mb-2 text-zinc-400"/> : <MediaCards dragging={dragging} />
            ) : (
              <div
                className={`mb-3 flex h-12 w-12 items-center justify-center rounded-full ${unsupported
                  ? "bg-amber-50 text-amber-600 dark:bg-amber-950/40 dark:text-amber-400"
                  : "bg-neutral-100 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-300"
                  }`}
              >
                {unsupported ? (
                  <ShieldAlert size={20} />
                ) : (
                  <Loader2 size={20} className="animate-spin" />
                )}
              </div>
            )}
            {unsupported ? (
              <>
                <p className="text-[15px] font-medium text-zinc-800 dark:text-zinc-100">
                  {t(
                    engine === "no-simd"
                      ? "upload.unsupportedSimd"
                      : "upload.unsupported"
                  )}
                </p>
                <p className="mt-1 max-w-sm text-[13px] leading-relaxed text-zinc-400 dark:text-zinc-500">
                  {t(
                    engine === "no-simd"
                      ? "upload.unsupportedSimdHelp"
                      : "upload.unsupportedHelp"
                  )}
                </p>
              </>
            ) : ready ? (
              <>
                <p className="text-[15px] font-medium text-zinc-800 dark:text-zinc-100">
                  {t("upload.dropPrefix")}{" "}
                  <span className="text-neutral-600 dark:text-neutral-300">
                    {t("upload.browse")}
                  </span>
                </p>
                <p className="mt-1 text-[13px] text-zinc-400 dark:text-zinc-500">
                  {source === "import"
                    ? pendingTranscript
                      ? t("upload.willUseTranscript", {
                          name: pendingTranscript.name,
                        })
                      : t("upload.chooseTranscriptFirst")
                    : t("upload.mediaFormats")}
                </p>
              </>
            ) : (
              <>
                <p className="text-[15px] font-medium text-zinc-800 dark:text-zinc-100">{t("upload.gettingReady")}</p>
                <p className="mt-1 text-[13px] text-zinc-400 dark:text-zinc-500">
                  {t("upload.gettingReadyHelp")}
                </p>
              </>
            )}
            <input
              id={inputId}
              ref={inputRef}
              type="file"
              accept={MEDIA_ACCEPT}
              disabled={!ready}
              // Visually hidden but present in the layout tree — display:none
              // breaks programmatic / label-activated pickers in some browsers.
              className="sr-only"
              onChange={(e) => handleFiles(e.target.files)}
            />
          </label>

          {libraryError&&<p role="alert" className="my-4 text-sm text-red-600">{libraryError} <button className="underline" onClick={()=>void refreshProjects()}>Retry</button></p>}
          {ready && projects.length > 0 && <ProjectLibrary projects={projects} busyId={busyId} onOpen={handleOpen} />}

          {!isElectron && <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-3">
            {[
              { icon: Type, title: t("upload.transcribeTitle"), text: t("upload.transcribeText") },
              { icon: Scissors, title: t("upload.editTitle"), text: t("upload.editText") },
              { icon: Clapperboard, title: t("upload.exportTitle"), text: t("upload.exportText") },
            ].map(({ icon: Icon, title, text }) => (
              <div key={title} className="rounded-xl border border-zinc-200 bg-white/70 p-4 dark:border-zinc-700 dark:bg-zinc-900/70">
                <Icon size={16} className="mb-2 text-neutral-500 dark:text-neutral-400" />
                <p className="text-[13px] font-semibold text-zinc-800 dark:text-zinc-100">{title}</p>
                <p className="mt-0.5 text-xs leading-relaxed text-zinc-500 dark:text-zinc-400">{text}</p>
              </div>
            ))}
          </div>}

          {!isElectron && <div className="mt-6 flex flex-col items-center gap-2">
            <div className="flex max-w-sm flex-col items-center gap-2 text-center">
              <SocialLinks variant="text" />
              <p className="text-[11px] leading-snug text-zinc-500 dark:text-zinc-400">{FORK_NOTICE}</p>
            </div>
          </div>}
        </div>
      </div>
    </div>
  );
}
