export type AudioExportMode='stereo'|'discrete'|'preserve';
export interface SourceAudioStream { index:number; channels:number; sampleRate:number; layout:string; }
export interface SourceAudioLayout { streams:SourceAudioStream[]; }
export interface AudioExportTrack { channels:number[]; layout:string; }
export interface AudioExportPlan { tracks:AudioExportTrack[]; channelCount:number; sampleRate:number; warning?:string; }
export const AUDIO_EXPORT_MODES=[{value:'stereo' as const,label:'Stereo'},{value:'discrete' as const,label:'Discrete Channels'},{value:'preserve' as const,label:'Preserve Source Layout'}];
const layouts:Record<string,number>={mono:1,stereo:2,'2.1':3,quad:4,'4.0':4,'5.0':5,'5.0(side)':5,'5.1':6,'5.1(side)':6,'6.1':7,'7.1':8,'7.1(wide)':8};
/** Parse source declarations, never the converted mono output. Unknown layouts stay unknown. */
export function parseSourceAudioLog(lines:string[]):SourceAudioLayout{
 const streams:SourceAudioStream[]=[];let input=false;
 for(const line of lines){
  if(/^Input #0,/.test(line.trim())){input=true;continue;}
  if(/^Output #/.test(line.trim())){input=false;continue;}
  if(!input)continue;
  const m=/Stream #0:(\d+)(?:[^:]*): Audio:.*?,\s*(\d+) Hz,\s*([^,]+)/.exec(line);if(!m)continue;
  const description=m[3].trim();const count=layouts[description]??Number(/^(\d+) channels?/.exec(description)?.[1]??0);
  if(!count)throw Error('The source audio channel layout could not be read.');
  streams.push({index:Number(m[1]),sampleRate:Number(m[2]),channels:count,layout:layouts[description]?description:'unknown'});
 }
 return {streams};
}
export function defaultAudioExportMode(source:SourceAudioLayout):AudioExportMode{return source.streams.length===1&&source.streams[0].layout==='stereo'?'stereo':'preserve';}
export function planAudioExport(source:SourceAudioLayout,mode:AudioExportMode):AudioExportPlan{
 if(!source.streams.length)throw Error('The source has no audio streams.');
 if(source.streams.length>1)throw Error('NLE export of multiple audio streams is not supported yet. No channels have been changed. Multi-track support is planned.');
 let next=1;const original=source.streams.map(s=>{
  if(!Number.isInteger(s.channels)||s.channels<1||s.channels>64||!Number.isFinite(s.sampleRate)||s.sampleRate<=0)throw Error('Invalid source audio metadata.');
  return {channels:Array.from({length:s.channels},()=>next++),layout:s.layout};
 });
 const result={channelCount:next-1,sampleRate:source.streams[0].sampleRate};
 if(mode==='stereo'){
  if(original.length!==1||original[0].channels.length!==2)throw Error('Stereo requires one two-channel source stream. Choose Discrete Channels or Preserve Source Layout.');
  return {...result,tracks:[{channels:[1,2],layout:'stereo'}]};
 }
 const discrete=original.flatMap(t=>t.channels.map(channel=>({channels:[channel],layout:'mono'})));
 if(mode==='discrete')return {...result,tracks:discrete};
 if(mode!=='preserve')throw Error('Unknown audio export mode.');
 if(original.some(t=>t.layout==='unknown'))return {...result,tracks:discrete,warning:'This source is exported as ordered discrete channels. Its unspecified speaker layout cannot be preserved by this exporter.'};
 return {...result,tracks:original};
}
