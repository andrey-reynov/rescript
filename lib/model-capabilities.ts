import type {TranscriptLanguage} from './languages';

export interface ModelCapabilities {
  spokenLanguages: readonly string[];
  languageSelection: 'automatic' | 'explicit' | 'fixed';
  description: string;
}
// Language tokens supported by the installed Transformers.js Whisper backend.
// Limit choices to codes the installed backend can pass; expand with tokenizer support.
const whisperLanguages = ['en', 'zh', 'de', 'es', 'ru', 'ko', 'fr', 'ja', 'pt', 'tr', 'pl', 'ca', 'nl', 'ar', 'sv', 'it', 'id', 'hi', 'fi', 'vi', 'he', 'uk', 'el', 'ms', 'cs', 'ro', 'da', 'hu', 'ta', 'no', 'th', 'ur', 'hr', 'bg', 'lt', 'la', 'mi', 'ml', 'cy', 'sk', 'te', 'fa', 'lv', 'bn', 'sr', 'az', 'sl', 'kn', 'et', 'mk', 'br', 'eu', 'is', 'hy', 'ne', 'mn', 'bs', 'kk', 'sq', 'sw', 'gl', 'mr', 'pa', 'si', 'km', 'sn', 'yo', 'so', 'af', 'oc', 'ka', 'be', 'tg', 'sd', 'gu', 'am', 'yi', 'lo', 'uz', 'fo', 'ht', 'ps', 'tk', 'nn', 'mt', 'sa', 'lb', 'my', 'bo', 'tl', 'mg', 'as', 'tt', 'haw', 'ln', 'ha', 'ba', 'jw', 'su'];
export const WHISPER_CAPABILITIES:ModelCapabilities={spokenLanguages:whisperLanguages.filter(code=>code!=='yue'),languageSelection:'explicit',description:'Multilingual, including Russian and English · automatic or selected language'};
export const WHISPER_V3_CAPABILITIES:ModelCapabilities={...WHISPER_CAPABILITIES,spokenLanguages:whisperLanguages};
export const ENGLISH_CAPABILITIES:ModelCapabilities={spokenLanguages:['en'],languageSelection:'fixed',description:'English only · no language detection'};
// NVIDIA model card is authoritative; parakeet.js registry incorrectly lists Asian languages.
export const PARAKEET_V3_CAPABILITIES:ModelCapabilities={spokenLanguages:['bg','hr','cs','da','nl','en','et','fi','fr','de','el','hu','it','lv','lt','mt','pl','pt','ro','sk','sl','es','sv','ru','uk'],languageSelection:'automatic',description:'25 European languages, including Russian · automatic detection only'};
export function acceptsLanguage(capabilities:ModelCapabilities,language:string):boolean {
  if(language==='auto')return true;
  return capabilities.languageSelection!=='automatic'&&capabilities.spokenLanguages.includes(language);
}
export function compatibleLanguage(capabilities:ModelCapabilities,language:TranscriptLanguage):TranscriptLanguage {
  return acceptsLanguage(capabilities,language)?language:capabilities.languageSelection==='fixed'?'en':'auto';
}
