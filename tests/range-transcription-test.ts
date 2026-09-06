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
  console.log('Range transcription: preparation-only, exact bounds, model/language, resume, atomic publication and edit preservation passed.');
 }finally{await fs.rm(root,{recursive:true,force:true});}
}
void main();
