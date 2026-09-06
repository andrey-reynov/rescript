"use client";
import { useEffect, useRef, useState } from 'react';
import ModelsManager from './ModelsManager';
import ShortcutsSettings from './ShortcutsSettings';
import Dropdown from "./Dropdown";
import { Settings, X, FolderOpen } from 'lucide-react';
import { useAppearance } from '@/hooks/useAppearance';
import { useI18n, useForkI18n } from './I18nProvider';
import { UI_LOCALES, UI_LOCALE_META, isUiLocalePreference } from '@/lib/i18n';
import { FORK_NOTICE, GITHUB_REPO_URL } from './SocialLinks';

export default function SettingsMenu() {
  const f=useForkI18n();
  const dialog=useRef<HTMLDialogElement>(null);
  const [folder,setFolder]=useState('');
  const [error,setError]=useState<string|null>(null);
  const [tab,setTab]=useState<'projects'|'appearance'|'models'|'shortcuts'|'about'>('projects');
  const {appearance,setAppearance}=useAppearance();
  const {t,preference,setPreference}=useI18n();
  useEffect(()=>{void window.rescriptDesktop?.projects.folder().then(setFolder).catch(e=>setError(String(e)));},[]);
  return <>
    <button type="button" aria-label={t('common.settings')} title={t('common.settings')} onClick={()=>dialog.current?.showModal()} className="flex h-8 w-8 items-center justify-center rounded-lg text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800"><Settings size={16}/></button>
    <dialog ref={dialog} aria-label={f("Settings")} className="m-auto max-h-[85vh] w-[640px] max-w-[92vw] overflow-auto rounded-2xl border border-zinc-200 bg-white p-0 text-zinc-900 shadow-xl backdrop:bg-black/40 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100">
      <div className="flex items-center justify-between border-b border-zinc-200 px-5 py-3 dark:border-zinc-700"><h1 className="text-lg font-semibold">{f("Settings")}</h1><button aria-label={f("Close settings")} onClick={()=>dialog.current?.close()} className="rounded p-1"><X size={18}/></button></div>
      <nav className="flex gap-2 border-b border-zinc-200 px-5 py-2 dark:border-zinc-700" aria-label={f("Settings sections")}>{(['projects','appearance','models','shortcuts','about'] as const).map(item=><button key={item} onClick={()=>setTab(item)} aria-pressed={tab===item} className={`rounded-lg px-3 py-1.5 text-sm capitalize ${tab===item?'bg-zinc-100 font-medium dark:bg-zinc-800':'text-zinc-500'}`}>{f(item)}</button>)}</nav>
      <div className="p-5">
        {tab==='projects'&&<><h2 className="font-medium">{f("Default project folder")}</h2><p className="mt-2 text-sm text-zinc-500">{f("New projects save here automatically. Save As lets you save a separate version elsewhere. Changing this folder does not move your existing projects.")}</p>
          <p className="my-3 break-all rounded-lg border border-zinc-200 p-3 text-sm dark:border-zinc-700">{folder||f('Browser storage — install the desktop app to choose a folder.')}</p>
          {folder&&<button className="flex items-center gap-2 rounded-lg bg-zinc-900 px-3 py-2 text-sm text-white dark:bg-zinc-100 dark:text-zinc-900" onClick={()=>void window.rescriptDesktop!.projects.chooseFolder().then(next=>{if(next){setFolder(next);window.dispatchEvent(new Event('rescript:projects-changed'));}}).catch(e=>setError(String(e)))}><FolderOpen size={16}/>{f("Choose folder…")}</button>}
          <p className="mt-4 text-xs text-zinc-500">{f("Original media stays where it is. Projects keep source references and saved edits, plus up to 20 recovery snapshots.")}</p></>}
        {tab==='appearance'&&<div className="space-y-4"><div className="text-sm">{t('settings.appearance')}<Dropdown label={f('Appearance')} value={appearance} onChange={value=>setAppearance(value==='dark'?'dark':'light')} options={[{value:'light',label:t('settings.light')},{value:'dark',label:t('settings.dark')}]}/></div><div className="text-sm">{t('settings.interfaceLanguage')}<Dropdown label={f('Interface language')} value={preference} onChange={value=>{if(isUiLocalePreference(value))setPreference(value);}} options={[{value:'system',label:t('common.system')},...UI_LOCALES.map(locale=>({value:locale,label:UI_LOCALE_META[locale].nativeLabel}))]}/></div></div>}
        {tab==='models'&&<ModelsManager/>}
        {tab==='shortcuts'&&<ShortcutsSettings/>}
        {tab==='about'&&<><h2 className="font-semibold">Rescript by Reynov</h2><p className="my-3 text-sm text-zinc-500">{f(FORK_NOTICE)}</p><a className="text-sm underline" href={GITHUB_REPO_URL} target="_blank" rel="noopener noreferrer">{f("Fork on GitHub")}</a></>}
        {error&&<p role="alert" className="mt-3 text-sm text-red-600">{error}</p>}
      </div>
    </dialog>
  </>;
}
