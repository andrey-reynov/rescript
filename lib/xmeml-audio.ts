import type {TimelineExportOptions} from './serializeTimeline';
import type {AudioExportPlan} from './audio-export';
import {FRAME_RATES} from '../node_modules/@chatoctopus/timeline/dist/time.js';
const escape=(value:string)=>value.replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;');
/** XMEML represents channels as tracks; link indices retain each logical cut. */
export function writeMappedXmeml(options:TimelineExportOptions,plan:AudioExportPlan,url:string):string{
 const fr=FRAME_RATES[options.frameRate];const fps=fr.num/fr.den;
 const frames=(seconds:number)=>Math.round(seconds*fps);
 const full=frames(options.duration),timebase=Math.round(fps),ntsc=fr.den===1001;
 const rate=`<rate><timebase>${timebase}</timebase><ntsc>${ntsc?'TRUE':'FALSE'}</ntsc></rate>`;
 let cursor=0;
 const cuts=options.keepRanges.map(range=>{
  const sourceIn=frames(range.start),sourceOut=frames(range.end);
  if(range.start<0||range.end>options.duration+1e-6||sourceOut<=sourceIn)throw Error('A cut is outside the source or shorter than one export frame.');
  const start=cursor;cursor+=sourceOut-sourceIn;return {sourceIn,sourceOut,start,end:cursor};
 });
 if(!cuts.length)throw Error('Nothing to export.');
 const sample=`<samplecharacteristics><samplerate>${plan.sampleRate}</samplerate><sampledepth>16</sampledepth></samplecharacteristics>`;
 const videoSample=`<samplecharacteristics>${rate}<width>${options.width??1920}</width><height>${options.height??1080}</height><pixelaspectratio>square</pixelaspectratio><fielddominance>none</fielddominance></samplecharacteristics>`;
 let declared=false;
 const file=()=>{
  if(declared)return '<file id="source-1"/>';declared=true;
  return `<file id="source-1"><name>${escape(options.mediaFileName)}</name><pathurl>${escape(url)}</pathurl>${rate}<duration>${full}</duration><timecode>${rate}<frame>0</frame><displayformat>NDF</displayformat></timecode><media>${options.withVideo?`<video>${videoSample}</video>`:''}${options.withAudio?`<audio>${sample}<channelcount>${plan.channelCount}</channelcount></audio>`:''}</media></file>`;
 };
 const stereo=plan.tracks.length===1&&plan.tracks[0].layout==='stereo';
 const channelNumbers=options.withAudio?plan.tracks.flatMap(track=>track.channels):[];
 const links=(i:number)=>[
  ...(options.withVideo?[{id:`video-${i}`,kind:'video',track:1}]:[]),
  ...channelNumbers.map(channel=>({id:`audio-${channel}-${i}`,kind:'audio',track:channel})),
 ].map(link=>`<link><linkclipref>${link.id}</linkclipref><mediatype>${link.kind}</mediatype><trackindex>${link.track}</trackindex><clipindex>${i}</clipindex>${link.kind==='audio'?`<groupindex>${stereo?1:link.track}</groupindex>`:''}</link>`).join('');
 const clip=(cut:typeof cuts[number],i:number,channel?:number)=>`<clipitem id="${channel?`audio-${channel}-${i}`:`video-${i}`}"${channel?` premiereChannelType="${stereo?'stereo':'mono'}"`:''}><name>${escape(options.mediaFileName)} ${i}</name><enabled>TRUE</enabled><duration>${full}</duration>${rate}<start>${cut.start}</start><end>${cut.end}</end><in>${cut.sourceIn}</in><out>${cut.sourceOut}</out>${file()}<sourcetrack><mediatype>${channel?'audio':'video'}</mediatype><trackindex>${channel??1}</trackindex></sourcetrack>${links(i)}</clipitem>`;
 const video=options.withVideo?`<video><format>${videoSample}</format><track>${cuts.map((cut,i)=>clip(cut,i+1)).join('')}</track></video>`:'';
 const audio=options.withAudio?`<audio><numOutputChannels>${plan.channelCount}</numOutputChannels><format>${sample}</format>${channelNumbers.map((channel,index)=>`<track premiereTrackType="${stereo?'Stereo':'Mono'}"${stereo?` currentExplodedTrackIndex="${index}" totalExplodedTrackCount="2"`:''}>${cuts.map((cut,i)=>clip(cut,i+1,channel)).join('')}<outputchannelindex>${channel}</outputchannelindex></track>`).join('')}</audio>`:'';
 return `<?xml version="1.0" encoding="UTF-8"?>\n<!DOCTYPE xmeml>\n<xmeml version="5"><sequence id="sequence-1"><name>${escape(options.projectName??options.mediaFileName)}</name><duration>${cursor}</duration>${rate}<timecode>${rate}<frame>0</frame><displayformat>NDF</displayformat></timecode><media>${video}${audio}</media></sequence></xmeml>`;
}
