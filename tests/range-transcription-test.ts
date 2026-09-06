import {getCutRanges} from '../lib/edits';
import type {Word,ManualCut} from '../lib/types';
import assert from 'node:assert/strict';
import {promises as fs} from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import {randomUUID} from 'node:crypto';
import {ProjectFiles,sourceReference,type ProjectData} from '../electron/project-files';
import {TranscriptionJobs,type JobWord} from '../electron/transcription-jobs';
import {publishTranscriptionProgress} from '../electron/progressive-results';
async function main(){
 const root=await fs.mkdtemp(path.join(os.tmpdir(),'rescript-range-'));
 try{
  const media=path.join(root,'test.wav');await fs.writeFile(media,'test');
  const projects=new ProjectFiles(path.join(root,'index.json'),path.join(root,'projects'));
  const id=randomUUID();
  const word=(id:number,start:number,end:number):JobWord=>({id,start,end,text:'old'+id,speaker:0,deleted:false});
  const data:ProjectData={id,name:'test',mediaKind:'audio',duration:125,source:'base',transcriptLanguage:'en',words:[word(0,5,6),word(1,11,12),word(2,80,81)],manualCuts:[{id:1,start:90,end:95}],showDeleted:true};
  await projects.create(data,await sourceReference(media));const jobs=new TranscriptionJobs(projects);
  await jobs.start(id,'base','en',false);await jobs.beginAudio(id);await jobs.appendAudio(id,new Uint8Array(125*16000*4));
  const prepared=await jobs.audioReady(id,{bucketSize:16000,sampleCount:125*16000,min:[],max:[]});assert.equal(prepared.status,'complete');assert.equal(prepared.total,0);
  const beforeAlignmentRead=await jobs.read(id);
  const audio=await jobs.alignmentAudio(id,1.25,2.75);assert.equal(audio.start,1.25);assert.equal(audio.audio.length,24000);
  assert.equal(audio.fingerprint,(await projects.read(id)).media.fingerprint);assert.deepEqual(await jobs.read(id),beforeAlignmentRead,'Alignment read must not replace/resume a transcription job');
  await assert.rejects(jobs.alignmentAudio(id,-1,2));await assert.rejects(jobs.alignmentAudio(id,0,61));await assert.rejects(jobs.alignmentAudio(id,124,126));await assert.rejects(jobs.alignmentAudio(id,NaN,2));
  let job=await jobs.transcribeRange(id,10,75,'tinyEn','en');assert.equal(job.model,'tinyEn');assert.equal(job.total,2);
  let chunk=(await jobs.next(id))!;assert.equal(chunk.start,10);assert.equal(chunk.coreStart,10);assert.equal(chunk.coreEnd,70);assert.equal(chunk.audio.length,62*16000);
  job=await jobs.checkpoint(id,job.key,chunk,[{...word(0,1,2),text:'new'}]);
  assert.equal(publishTranscriptionProgress(data,job,await jobs.words(id)),data,'Do not replace a range partially');
  await jobs.setStatus(id,'paused','paused');job=await jobs.start(id,'tinyEn','en',true);assert.deepEqual(job.completed,[0]);
  chunk=(await jobs.next(id))!;assert.equal(chunk.coreStart,70);assert.equal(chunk.coreEnd,75);assert.equal(chunk.start+chunk.audio.length/16000,75);
  job=await jobs.checkpoint(id,job.key,chunk,[]);assert.equal(job.status,'complete');
  const result=publishTranscriptionProgress(data,job,await jobs.words(id));
  assert.deepEqual(result.words.map(w=>(w as JobWord).text),['old0','new','old2']);assert.deepEqual(result.manualCuts,data.manualCuts);
  assert.equal(publishTranscriptionProgress(result,job,await jobs.words(id)),result);
  job=await jobs.transcribeRange(id,10,15,'base','ru');chunk=(await jobs.next(id))!;job=await jobs.checkpoint(id,job.key,chunk,[]);
  assert.equal(publishTranscriptionProgress(result,job,[]).words.length,2,'Empty result replaces only selected range');
  await assert.rejects(jobs.transcribeRange(id,-1,2,'base','en'));
  const oldKey=job.key;
  job=await jobs.transcribeAll(id,'turbo','ru');assert.notEqual(job.key,oldKey);assert.deepEqual(job.completed,[]);assert.deepEqual(job.replacementRange,{start:0,end:125});assert.equal(job.total,3);
  assert.equal(publishTranscriptionProgress(result,job,[]),result,'Full replacement is also atomic');
  while(job.status!=='complete'){chunk=(await jobs.next(id))!;job=await jobs.checkpoint(id,job.key,chunk,[]);}
  const full=publishTranscriptionProgress(result,job,[]);assert.equal(full.words.length,0);assert.deepEqual(full.manualCuts,data.manualCuts);
  const editData={...data,words:[{...word(10,1,2),deleted:true},word(11,10,11),{...word(12,20,21),deleted:true}],phrases:[{id:'obsolete',wordIds:[10,11]}],sceneBoundaries:[{id:8,time:30}],clipNames:[{id:'name',time:40,name:'Keep name'}]};
  const cutsBefore=getCutRanges(editData.words,125,data.manualCuts as ManualCut[]);
  const emptyRangeJob={...job,key:'empty-middle',replacementRange:{start:10,end:12}};
  const emptyMiddle=publishTranscriptionProgress(editData,emptyRangeJob,[]);
  assert.deepEqual(getCutRanges(emptyMiddle.words as Word[],125,emptyMiddle.manualCuts as ManualCut[]),cutsBefore,'Empty replacement cannot join separated word-owned cuts');
  const allJob={...job,key:'full-with-cuts',replacementRange:{start:0,end:125}};
  const preserved=publishTranscriptionProgress(editData,allJob,[word(0,1,22)]);
  assert.deepEqual(getCutRanges(preserved.words as Word[],125,preserved.manualCuts as ManualCut[]),cutsBefore,'Full replacement retains deleted-word and manual cuts exactly');
  assert.deepEqual(preserved.sceneBoundaries,editData.sceneBoundaries);assert.deepEqual(preserved.clipNames,editData.clipNames);assert.deepEqual(preserved.phrases,[]);
  assert.equal(publishTranscriptionProgress(preserved,allJob,[]),preserved,'Repeated publication cannot duplicate cut ranges');
  for(const status of ['running','paused','error'] as const)assert.equal(publishTranscriptionProgress(editData,{...allJob,status},[]),editData,'Unfinished/failed replacement leaves the whole edit untouched');
  await projects.update(id,()=>preserved);
  // A renderer save queued before publication must not remove materialized cuts,
  // and an unrelated newly added manual cut must survive that same save.
  const lateCut={id:2,start:60,end:65};
  await projects.save(id,{...editData,manualCuts:[...(editData.manualCuts??[]),lateCut]});
  const afterLate=(await projects.read(id)).data;
  assert.deepEqual(getCutRanges(afterLate.words as Word[],125,afterLate.manualCuts as ManualCut[]),getCutRanges(editData.words,125,[...(editData.manualCuts as ManualCut[]),lateCut]));
  assert.deepEqual(afterLate.phrases,[],'Queued save cannot revive obsolete phrase IDs');
  const imported={...editData,source:'import',transcriptImportId:'first-import'};
  const importedResult=publishTranscriptionProgress(imported,{...allJob,key:'import-retranscribed',replacementImportId:'first-import'},[word(0,1,22)]);
  await projects.update(id,()=>importedResult);
  await projects.save(id,imported);
  assert.deepEqual((await projects.read(id)).data.words,importedResult.words,'An old imported-transcript save cannot overwrite completed retranscription');
  const freshImport={...imported,transcriptImportId:'second-import',words:[word(70,4,5)]};
  assert.equal(publishTranscriptionProgress(freshImport,{...allJob,key:'late-result',replacementImportId:'first-import'},[word(0,1,22)]),freshImport,'A job started before a deliberate import cannot overwrite it');
  await projects.save(id,freshImport);
  assert.deepEqual((await projects.read(id)).data.words,freshImport.words,'A deliberate new import still replaces the transcript');
  const legacyImported={...editData,source:'import'};
  await projects.update(id,()=>publishTranscriptionProgress(legacyImported,{...allJob,key:'legacy-import-retranscribed'},[word(0,1,22)]));
  await projects.save(id,legacyImported);
  assert.equal((await projects.read(id)).data.transcriptionResultKey,'legacy-import-retranscribed','Legacy imported projects also protect completed results');
  console.log('Range transcription: preparation-only, exact bounds, model/language, resume, atomic publication and edit preservation passed.');
 }finally{await fs.rm(root,{recursive:true,force:true});}
}
void main();
