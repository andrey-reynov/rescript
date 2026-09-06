export type TranscriptLanguage = "auto" | "ru" | "en" | "es" | "fr" | "de" | "pt" | "zh";

export interface TranscriptLanguageInfo {
  label: string;
  nativeLabel: string;
  /** Flag emoji shown beside the language name in the submenu. */
  flag: string;
  /** Short uppercase code shown in the model selector trigger. */
  code: string;
}

const LANGUAGE_STORAGE_KEY = "rescript.transcript-language";

export const DEFAULT_TRANSCRIPT_LANGUAGE: TranscriptLanguage = "auto";

export const TRANSCRIPT_LANGUAGES: Record<
  TranscriptLanguage,
  TranscriptLanguageInfo
> = {
  auto: {label:"Automatic",nativeLabel:"Automatic",flag:"🌐",code:"AUTO"},
  ru: {label:"Russian",nativeLabel:"Русский",flag:"🇷🇺",code:"RU"},
  en: {
    label: "English",
    nativeLabel: "English",
    flag: "🇺🇸",
    code: "EN",
  },
  es: {
    label: "Spanish",
    nativeLabel: "Español",
    flag: "🇪🇸",
    code: "ES",
  },
  fr: {
    label: "French",
    nativeLabel: "Français",
    flag: "🇫🇷",
    code: "FR",
  },
  de: {
    label: "German",
    nativeLabel: "Deutsch",
    flag: "🇩🇪",
    code: "DE",
  },
  pt: {
    label: "Portuguese",
    nativeLabel: "Português",
    flag: "🇧🇷",
    code: "PT",
  },
  zh: {
    label: "Chinese",
    nativeLabel: "中文",
    flag: "🇨🇳",
    code: "ZH",
  },
};

export const TRANSCRIPT_LANGUAGE_ORDER: TranscriptLanguage[] = [
  "auto",
  "ru",
  "en",
  "es",
  "fr",
  "de",
  "pt",
  "zh",
];

export function isTranscriptLanguage(
  value: unknown
): value is TranscriptLanguage {
  return (
    value === "auto" ||
    value === "ru" ||
    value === "en" ||
    value === "es" ||
    value === "fr" ||
    value === "de" ||
    value === "pt" ||
    value === "zh"
  );
}

/** Read the last-selected transcript language from localStorage. */
export function loadTranscriptLanguagePreference(): TranscriptLanguage {
  if (!browserStorage()) return DEFAULT_TRANSCRIPT_LANGUAGE;
  try {
    const raw = browserStorage()?.getItem(LANGUAGE_STORAGE_KEY);
    if (isTranscriptLanguage(raw)) return raw;
  } catch {
    // private mode / disabled storage
  }
  return DEFAULT_TRANSCRIPT_LANGUAGE;
}

/** Persist the selected transcript language for the next visit. */
export function saveTranscriptLanguagePreference(language: TranscriptLanguage) {
  if (!browserStorage()) return;
  try {
    browserStorage()?.setItem(LANGUAGE_STORAGE_KEY, language);
  } catch {
    // private mode / disabled storage
  }
}

function browserStorage(){try{return (globalThis as {localStorage?:{getItem(key:string):string|null;setItem(key:string,value:string):void}}).localStorage;}catch{return undefined;}}
