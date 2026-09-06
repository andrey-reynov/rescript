import assert from 'node:assert/strict';
import {timelineWordBlocks,correctionSelection,transcriptBlocks,groupPhrase,projectPhrases,selectedRange,replaceTimedText} from '../lib/transcript-structure';
import type {Word} from '../lib/types';
const words:Word[]=Array.from({length:8},(_,id)=>({id,text:'word'+id,start:id,end:id+.8,speaker:id%2,deleted:false}));
const cut=[{start:3,end:5}],splits=[{id:1,time:6}];
const blocks=transcriptBlocks(words,cut,splits,8,[{id:'name',time:5,name:'Outro'}]);
assert.deepEqual(blocks.map(b=>[b.kind,b.start,b.end]),[['clip',0,3],['deleted',3,5],['clip',5,6],['clip',6,8]]);
assert.equal(blocks[2].name,'Outro');assert.deepEqual(blocks.flatMap(b=>b.words.map(w=>w.id)),words.map(w=>w.id));
assert.equal(transcriptBlocks(words,[],splits,8).length,2,'Explicit split survives restoring a deletion');
const partial=transcriptBlocks(words,[{start:.4,end:1.2}],[],8);assert.ok(partial.some(b=>b.partialIds.includes(0)));assert.equal(words[0].start,0);
assert.deepEqual(selectedRange(words,5,[1,2]),[1,2,3,4,5]);
let groups=groupPhrase(words,[],[0,1,2],blocks,'phrase');assert.deepEqual(groups[0].wordIds,[0,1,2]);
assert.throws(()=>groupPhrase(words,groups,[2,3,4,5],blocks,'bad'));
assert.throws(()=>groupPhrase(words,groups,[0,2],blocks,'bad'));
groups=projectPhrases(groups,transcriptBlocks(words,[],[{id:2,time:2}],8));assert.deepEqual(groups.map(g=>g.wordIds),[[0,1]]);
const replacement=replaceTimedText(words,[0,1],'one two three',blocks);
assert.equal(replacement.length,9);assert.deepEqual(replacement.slice(3),words.slice(2));assert.equal(replacement[0].start,0);assert.equal(replacement[2].end,1.8);assert.equal(replacement[0].speaker,-1);assert.equal(replacement[0].correction?.timing,'approximate');assert.deepEqual(replacement[0].correction?.sourceWordIds,[0,1]);
assert.throws(()=>replaceTimedText(words,[2,3,4],'hidden',blocks));
console.log('Transcript structure: clip/deletion projection, partial cuts, shared ranges, phrases, corrections and timing provenance passed.');

// Source order does not imply monotonically increasing ends (overlapping speech).
const overlapping:Word[]=[{...words[0],start:0,end:4},{...words[1],start:1,end:2},{...words[2],start:5,end:6}];
const unchanged=structuredClone(overlapping);
const overlapBlocks=transcriptBlocks(overlapping,[],[],8);
const correctedOverlap=replaceTimedText(overlapping,[0,1],'new caption text',overlapBlocks);
assert.equal(correctedOverlap[0].start,0);
assert.equal(correctedOverlap[2].end,4,'Replacement must retain the longest selected source span');
assert.equal(correctedOverlap[0].correction?.sourceEnd,4);
assert.equal(correctedOverlap[0].correction?.timing,'approximate');
assert.equal(correctedOverlap[0].speaker,-1,'Mixed speaker correction remains Unknown');
assert.deepEqual(correctedOverlap[3],overlapping[2],'Unselected text and timing stay intact');
assert.deepEqual(groupPhrase(overlapping,[],[0,1],overlapBlocks,'overlap')[0].wordIds,[0,1]);
for(const boundaryBlocks of [transcriptBlocks(overlapping,[],[{id:9,time:3}],8),transcriptBlocks(overlapping,[{start:3,end:4}],[],8)]){
 assert.throws(()=>replaceTimedText(overlapping,[0,1],'bad',boundaryBlocks),/one retained clip/,'An earlier overlapping word cannot cross a cut or split');
 assert.throws(()=>groupPhrase(overlapping,[],[0,1],boundaryBlocks,'bad'),/one retained clip/);
}
assert.deepEqual(overlapping,unchanged,'Neither accepted nor rejected operations mutate source words');
console.log('Overlapping speech: full correction span, mixed metadata and cross-boundary rejection passed.');

assert.throws(()=>correctionSelection(words,[0,999],blocks),/Select text/,'Stale selection cannot silently correct only its surviving IDs');
assert.throws(()=>correctionSelection(words,[0,2],blocks),/consecutive/);
assert.throws(()=>correctionSelection(words,[2,3,4,5],blocks),/one retained clip/);
assert.deepEqual(correctionSelection(words,[1,0],blocks).members.map(w=>w.id),[0,1],'Draft anchor follows source order');
assert.equal(correctionSelection(overlapping,[0,1],overlapBlocks).end,4);
console.log('Correction draft preflight rejects stale, disjoint and cross-cut selections.');

const overlapPhrase={id:'stable-group',wordIds:[0,1]};
const projected=timelineWordBlocks(overlapping,[overlapPhrase],overlapBlocks);
assert.equal(projected[0].end,4,'Phrase geometry covers all overlapping members');
assert.equal(projected[0].speaker,-1,'Mixed phrase does not pretend to have its first member speaker');
assert.deepEqual(projected[0].members.map(w=>w.speaker),[0,1]);
assert.deepEqual(projected.flatMap(w=>w.memberIds),overlapping.map(w=>w.id));
const persistedGroup={id:'persistent',wordIds:[0,1,2,3,4,5]};
for(const projectedBlocks of [transcriptBlocks(words,[],[{id:44,time:3}],8),transcriptBlocks(words,[{start:2,end:4}],[],8)]){
 const chips=timelineWordBlocks(words,[persistedGroup],projectedBlocks);
 assert.deepEqual(chips.flatMap(w=>w.memberIds),words.map(w=>w.id),'Boundary changes neither lose nor duplicate words');
 for(const chip of chips.filter(w=>w.memberIds.length>1))assert.ok(projectedBlocks.some(b=>b.kind==='clip'&&b.start<=chip.start&&b.end>=chip.end));
}
assert.deepEqual(persistedGroup,{id:'persistent',wordIds:[0,1,2,3,4,5]},'Projection preserves persisted group identity');
assert.deepEqual(overlapping,unchanged);
console.log('Phrase projection: overlap bounds, mixed attribution, split/cut membership and stable persisted identity passed.');


const anchoredNames=[{id:'first-name',time:1,name:'First clip'},{id:'second-name',time:6,name:'Second clip'}];
const separateNames=transcriptBlocks(words,[],[{id:71,time:4}],8,anchoredNames);
assert.deepEqual(separateNames.map(b=>b.name),['First clip','Second clip']);
assert.equal(transcriptBlocks(words,[],[],8,anchoredNames)[0].name,'First clip / Second clip');
assert.deepEqual(transcriptBlocks(words,[],[{id:72,time:4}],8,anchoredNames).map(b=>b.name),['First clip','Second clip'],'Re-splitting restores each source-anchored name');
assert.deepEqual(anchoredNames.map(n=>n.id),['first-name','second-name'],'Merge projection never rewrites persisted name identities');
console.log('Clip names: merge retains both labels and re-splitting restores their original source ownership.');


const noisySpeakers:Word[]=Array.from({length:120},(_,id)=>({id,text:'commentary',start:id,end:id+.8,speaker:id,deleted:false}));
const originalSpeakers=structuredClone(noisySpeakers);
const commentaryClips=transcriptBlocks(noisySpeakers,[{start:30,end:40}],[],120);
assert.deepEqual(commentaryClips.map(b=>b.kind),['clip','deleted','clip'],'Diarization labels never create edit clips');
assert.deepEqual(noisySpeakers,originalSpeakers,'Edit projection preserves every optional speaker attribution');
console.log('Commentary structure: 120 differing speaker labels yield only edit-range boundaries and retain source metadata.');
