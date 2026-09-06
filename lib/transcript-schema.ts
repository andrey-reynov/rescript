export type TranscriptView='clips'|'speakers'|'continuous';
export interface PhraseGroup {id:string;wordIds:number[]}
export interface ClipName {id:string;time:number;name:string}
export interface CorrectionProvenance {sourceWordIds:number[];sourceStart:number;sourceEnd:number;originalText:string;timing:'approximate'|'aligned'}
