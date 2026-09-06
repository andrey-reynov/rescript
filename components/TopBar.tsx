"use client";

import { useEditorStore } from "@/lib/store";
import Image from "next/image";
import logo from "@/assets/logo.png";
import { useWindowChrome } from "@/hooks/useWindowChrome";
import { scheduleProjectAutosave } from "@/lib/autosave";
import { useI18n, useForkI18n } from "./I18nProvider";

export default function TopBar({ children }: { children?: React.ReactNode }) {
  const { t } = useI18n();
  const f=useForkI18n();
  const projectName=useEditorStore(s=>s.projectName);
  const { draggable, trafficLights } = useWindowChrome();
  const videoFile = useEditorStore((s) => s.videoFile);
  const reset = () => { void import("@/lib/autosave").then(m=>m.closeCurrentProject()).catch(e=>alert(e.message)); };

  return (
    <header
      className={`flex h-13 shrink-0 items-center gap-2 border-b border-zinc-200 bg-white pr-3 transition-[padding-left] duration-200 ease-out dark:border-zinc-800 dark:bg-zinc-900 ${
        draggable ? "app-drag" : ""
      } ${trafficLights ? "pl-22" : "pl-3"}`}
    >
      <button
        onClick={reset}
        title={t("topbar.startOver")}
        className="app-no-drag flex h-7 w-7 cursor-pointer items-center justify-center rounded-lg text-zinc-500 transition hover:bg-zinc-100 hover:text-zinc-800 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-200"
      >
        <Image
          src={logo}
          alt="Rescript"
          width={18}
          height={18}
          priority
          className="rounded-sm"
        />
      </button>
      {videoFile ? <input aria-label={f("Project name")} title={f("Project name")} value={projectName}
        onChange={event=>{useEditorStore.setState({projectName:event.target.value});scheduleProjectAutosave();}}
        onBlur={()=>{if(!useEditorStore.getState().projectName.trim()){useEditorStore.setState({projectName:videoFile.name});scheduleProjectAutosave();}}}
        className="app-no-drag min-w-24 max-w-64 flex-1 rounded border border-transparent bg-transparent px-2 py-1 text-sm font-semibold hover:border-zinc-300 focus:border-zinc-400" />
        : <span className="text-sm font-semibold">Rescript by Reynov</span>}

      <div className="app-no-drag ml-auto flex min-w-0 flex-1 items-center justify-end gap-1">
        {children}
      </div>
    </header>
  );
}
