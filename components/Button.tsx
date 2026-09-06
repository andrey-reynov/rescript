"use client";
import type {ButtonHTMLAttributes} from 'react';
export const REGULAR_BUTTON="flex h-7 shrink-0 items-center justify-center gap-1.5 rounded-lg px-2 text-xs font-medium text-zinc-700 transition hover:bg-zinc-100 hover:text-zinc-900 active:scale-[0.97] disabled:cursor-not-allowed disabled:text-zinc-300 disabled:hover:bg-transparent dark:text-zinc-300 dark:hover:bg-zinc-800 dark:hover:text-zinc-100 dark:disabled:text-zinc-600";
export const ICON_BUTTON="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-zinc-500 transition hover:bg-zinc-100 disabled:opacity-40 dark:hover:bg-zinc-800";
export const ACCENT_BUTTON="flex h-8 shrink-0 items-center justify-center gap-1.5 rounded-full bg-zinc-900 px-4 text-[13px] font-medium text-white transition hover:bg-zinc-700 disabled:opacity-40 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200";
export default function Button({variant='regular',className='',...props}:ButtonHTMLAttributes<HTMLButtonElement>&{variant?:'regular'|'accent'|'icon'}){return <button type="button" {...props} className={`${variant==='accent'?ACCENT_BUTTON:variant==='icon'?ICON_BUTTON:REGULAR_BUTTON} ${className}`}/>;}
export function Shortcut({children}:{children:React.ReactNode}){return <kbd className="rounded bg-zinc-100 px-1 py-px text-[10px] font-normal text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400">{children}</kbd>;}
