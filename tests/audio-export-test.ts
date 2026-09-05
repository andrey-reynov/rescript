import assert from 'node:assert/strict';
import {parseSourceAudioLog,defaultAudioExportMode,planAudioExport} from '../lib/audio-export';
import {serializeTimelineXml,timelineExtension,type TimelineExportOptions} from '../lib/serializeTimeline';
const stereo={streams:[{index:1,channels:2,sampleRate:44100,layout:'stereo'}]};
assert.deepEqual(parseSourceAudioLog(['Input #0, mov, from input.mp4:', '  Stream #0:0[0x1](und): Video: h264', '  Stream #0:1[0x2](rus): Audio: aac (LC), 44100 Hz, stereo, fltp, 128 kb/s','Output #0, wav, to audio.wav:', '  Stream #0:0: Audio: pcm_s16le, 16000 Hz, mono, s16']),stereo);
assert.equal(defaultAudioExportMode(stereo),'stereo');
const dualMono={streams:[{index:1,channels:1,sampleRate:48000,layout:'mono'},{index:2,channels:1,sampleRate:48000,layout:'mono'}]};
assert.equal(defaultAudioExportMode(dualMono),'preserve');
assert.throws(()=>planAudioExport(dualMono,'stereo'),/multiple audio streams/);
assert.throws(()=>planAudioExport(dualMono,'preserve'),/multiple audio streams/);
assert.throws(()=>planAudioExport(dualMono,'discrete'),/multiple audio streams/);
const surround={streams:[{index:1,channels:6,sampleRate:48000,layout:'5.1'}]};
assert.deepEqual(planAudioExport(surround,'preserve').tracks,[{channels:[1,2,3,4,5,6],layout:'5.1'}]);
assert.equal(planAudioExport(surround,'discrete').tracks.length,6);
assert.throws(()=>planAudioExport({streams:[]},'preserve'),/no audio/);
assert.throws(()=>parseSourceAudioLog(['Input #0, wav:', 'Stream #0:0: Audio: pcm, 48000 Hz, invalid']),/could not/);
const options:TimelineExportOptions={keepRanges:[{start:2,end:5},{start:17,end:20},{start:35,end:39}],duration:42.4,mediaFileName:'Русский & LR.mp4',frameRate:'30',withVideo:true,withAudio:true,sourceAudio:stereo};
const before=JSON.stringify(options);
for(const mode of ['stereo','preserve','discrete'] as const){
 const o={...options,audioExportMode:mode};const xml=serializeTimelineXml(o,'resolve');
 if(mode==='discrete'){
  assert.equal(timelineExtension('resolve',o),'xml');
  assert.equal((xml.match(/<clipitem /g)??[]).length,9);
  assert.equal((xml.match(/<link>/g)??[]).length,27);
  assert.equal((xml.match(/<channelcount>2<\/channelcount>/g)??[]).length,1);
  assert.ok(xml.includes('<in>1050</in><out>1170</out>'));
  assert.ok(xml.includes('<duration>1272</duration>'));
  assert.ok(xml.includes('file://localhost/'));
  assert.ok(xml.includes('<samplerate>44100</samplerate>'));
 }else{
  assert.equal(timelineExtension('resolve',o),'fcpxml');
  assert.equal((xml.match(/<asset-clip /g)??[]).length,3);
  assert.equal((xml.match(/srcCh="1,2"/g)??[]).length,3);
  assert.ok(!xml.includes('lane="1"'));
  assert.ok(xml.includes('duration="212/5s"'));
 }
 assert.ok(xml.includes('Русский &amp; LR.mp4'));
}
assert.equal(JSON.stringify(options),before,'Export mutates neither cuts nor source metadata');
assert.throws(()=>serializeTimelineXml({...options,sourceAudio:surround,audioExportMode:'preserve'},'premiere'),/Discrete Channels/);
const mono=serializeTimelineXml({...options,sourceAudio:stereo,audioExportMode:'discrete',withVideo:false},'resolve');
assert.equal((mono.match(/<clipitem /g)??[]).length,6);
assert.ok(mono.includes('<file id="source-1"><name>'));
console.log('Audio metadata, mode selection, channel mapping, links, source handles and immutable exports: passed');
