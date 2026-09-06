export const ANALYSIS_RATE=16000;
export const ANALYSIS_FRAME=512;
export const ANALYSIS_CHUNK_SECONDS=60;
export interface AcousticAnalysis {version:1;fingerprint:string;duration:number;frameSeconds:number;rms:number[];speech:number[];}
export type DetectionKind='amplitude'|'noSpeech'|'overlap';
export interface DetectionRange {start:number;end:number;kind:DetectionKind;}
export interface SilenceSettings {visible:boolean;thresholdMode:'absolute'|'relative';absoluteDb:number;relativePercent:number;vadThreshold:number;minDuration:number;preHandle:number;postHandle:number;mergeGap:number;colors:Record<DetectionKind,string>;}
export const DEFAULT_SILENCE_SETTINGS:SilenceSettings={visible:true,thresholdMode:'relative',absoluteDb:-45,relativePercent:10,vadThreshold:.35,minDuration:.3,preHandle:.1,postHandle:.15,mergeGap:.1,colors:{amplitude:'#3b82f6',noSpeech:'#eab308',overlap:'#22c55e'}};
export function normalizeSilenceSettings(value?:Partial<SilenceSettings>):SilenceSettings {
 const defaults=DEFAULT_SILENCE_SETTINGS;const number=(key:keyof SilenceSettings,min:number,max:number)=>{const input=value?.[key];return typeof input==='number'&&Number.isFinite(input)?Math.min(max,Math.max(min,input)):defaults[key] as number;};
 const color=(key:DetectionKind)=>/^#[0-9a-f]{6}$/i.test(value?.colors?.[key]??'')?value!.colors![key]:defaults.colors[key];
 return {visible:value?.visible!==false,thresholdMode:value?.thresholdMode==='absolute'?'absolute':'relative',absoluteDb:number('absoluteDb',-96,0),relativePercent:number('relativePercent',0,100),vadThreshold:number('vadThreshold',0,1),minDuration:number('minDuration',0,30),preHandle:number('preHandle',0,5),postHandle:number('postHandle',0,5),mergeGap:number('mergeGap',0,5),colors:{amplitude:color('amplitude'),noSpeech:color('noSpeech'),overlap:color('overlap')}};
}
/** RMS is acoustic energy, independent of recognized words or speaker labels. */
export function audioRms(audio:Float32Array,frameSize=ANALYSIS_FRAME):number[]{
 const result:number[]=[];for(let start=0;start<audio.length;start+=frameSize){const end=Math.min(audio.length,start+frameSize);let sum=0;for(let i=start;i<end;i++)sum+=audio[i]*audio[i];result.push(Math.sqrt(sum/(end-start)));}return result;
}
function ranges(flags:boolean[],step:number,duration:number,min:number):{start:number;end:number}[]{
 const result:{start:number;end:number}[]=[];let start=-1;
 for(let i=0;i<=flags.length;i++){if(flags[i]&&start<0)start=i;if(!flags[i]&&start>=0){const range={start:start*step,end:Math.min(duration,i*step)};if(range.end-range.start>=min-1e-8)result.push(range);start=-1;}}return result;
}
/** Overlay the two independent detector sets; never infer VAD from transcript gaps. */
export function silenceDetections(analysis:AcousticAnalysis|null,settings:SilenceSettings):{ranges:DetectionRange[];amplitude:{start:number;end:number}[];noSpeech:{start:number;end:number}[];threshold:number}{
 if(!analysis)return {ranges:[],amplitude:[],noSpeech:[],threshold:0};
 let weighted=0;for(let i=0;i<analysis.rms.length;i++)weighted+=analysis.rms[i]*Math.max(0,Math.min(analysis.frameSeconds,analysis.duration-i*analysis.frameSeconds));
 const average=analysis.duration>0?weighted/analysis.duration:0;
 const threshold=settings.thresholdMode==='absolute'?10**(settings.absoluteDb/20):average*settings.relativePercent/100;
 const amplitude=ranges(analysis.rms.map(rms=>rms<=threshold),analysis.frameSeconds,analysis.duration,settings.minDuration);
 const noSpeech=ranges(analysis.speech.map(probability=>probability<settings.vadThreshold),analysis.frameSeconds,analysis.duration,settings.minDuration);
 const events=[...amplitude.flatMap(r=>[{time:r.start,a:1,v:0},{time:r.end,a:-1,v:0}]),...noSpeech.flatMap(r=>[{time:r.start,a:0,v:1},{time:r.end,a:0,v:-1}])].sort((a,b)=>a.time-b.time);
 let a=0,v=0,previous=0;const out:DetectionRange[]=[];
 for(let i=0;i<events.length;){const time=events[i].time;if(time>previous&&(a||v)){const kind:DetectionKind=a&&v?'overlap':a?'amplitude':'noSpeech';const last=out.at(-1);if(last&&last.kind===kind&&Math.abs(last.end-previous)<1e-8)last.end=time;else out.push({start:previous,end:time,kind});}while(i<events.length&&events[i].time===time){a+=events[i].a;v+=events[i].v;i++;}previous=time;}
 return {ranges:out,amplitude,noSpeech,threshold};
}
/** Explicit Auto Cut selection: merge small gaps, then retain source handles around speech. */
export function detectionCuts(ranges:readonly {start:number;end:number}[],settings:SilenceSettings,duration:number){
 const merged:{start:number;end:number}[]=[];
 for(const range of [...ranges].sort((a,b)=>a.start-b.start)){const last=merged.at(-1);if(last&&range.start-last.end<=settings.mergeGap)last.end=Math.max(last.end,range.end);else merged.push({...range});}
 return merged.map(range=>({start:Math.max(0,range.start)+(range.start>0?settings.postHandle:0),end:Math.min(duration,range.end)-(range.end<duration?settings.preHandle:0)})).filter(range=>range.end>range.start);
}
