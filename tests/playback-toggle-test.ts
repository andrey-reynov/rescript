import assert from 'node:assert/strict';
import {getCutRanges,getKeepRanges} from '../lib/edits';
import {buildNleTimeline} from '../lib/serializeTimeline';
import {useEditorStore} from '../lib/store';
const s=useEditorStore;
let played=0;
const media={paused:true,currentTime:2,duration:10,play:()=>{played++;return Promise.resolve();},pause:()=>{}};
s.setState({videoEl:media as unknown as HTMLMediaElement,words:[],manualCuts:[{id:1,start:1,end:4}],duration:10,skipDeletions:true});
s.getState().togglePlayback();assert.ok(media.currentTime>4);assert.equal(played,1);
media.currentTime=2;s.getState().toggleSkipDeletions();s.getState().togglePlayback();assert.equal(media.currentTime,2);assert.equal(played,2);
assert.deepEqual(s.getState().manualCuts,[{id:1,start:1,end:4}]);
const oldShow=s.getState().showDeleted;s.getState().toggleShowDeleted();assert.equal(s.getState().skipDeletions,false);assert.equal(s.getState().showDeleted,!oldShow);
s.setState({videoEl:null});
const exportTimeline=()=>{const state=s.getState();return buildNleTimeline({keepRanges:getKeepRanges(getCutRanges(state.words,state.duration,state.manualCuts),state.duration),duration:state.duration,mediaFileName:'source.mp4',frameRate:'30',withVideo:true,withAudio:true});};
const beforeExport=exportTimeline();
for(let i=0;i<4;i++){s.getState().toggleSkipDeletions();if(i%2===0)s.getState().toggleShowDeleted();assert.deepEqual(exportTimeline(),beforeExport,'Playback/visibility controls must not change the exported NLE timeline');}

console.log('Playback skip and independent visibility toggle passed.');
