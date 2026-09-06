import assert from 'node:assert/strict';
import {promises as fs} from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {randomUUID} from 'node:crypto';
import {ProjectFiles,sourceReference,atomicJson} from '../electron/project-files';
import {SilenceJobs} from '../electron/silence-jobs';
async function main(){
 const root=await fs.mkdtemp(path.join(os.tmpdir(),'rescript-silence-test-'));
 try{
  const file=path.join(root,'source.wav');await fs.writeFile(file,'fixture');const source=await sourceReference(file),id=randomUUID();const projects=new ProjectFiles(path.join(root,'settings.json'),root);
  const data={id,name:'Silence',mediaKind:'audio' as const,duration:61,source:'base',transcriptLanguage:'en',words:[{id:1,text:'Keep',start:2,end:3}],manualCuts:[{id:1,start:10,end:11}],showDeleted:true};await projects.create(data,source);
  const cache=(await projects.fileFor(id))+'.cache';await fs.mkdir(cache,{recursive:true});await fs.writeFile(path.join(cache,'audio.f32'),new Uint8Array(61*16000*4));await atomicJson(path.join(cache,'audio.json'),{fingerprint:source.fingerprint,sampleCount:61*16000});
  let jobs=new SilenceJobs(projects);const job=await jobs.start(id);assert.equal(job.total,2);let chunk=(await jobs.next(id))!;assert.equal(chunk.discardFrames,0);assert.equal(chunk.audio.length,60*16000);
  await assert.rejects(jobs.checkpoint(id,0,[0],[0]),/Invalid acoustic/);await jobs.checkpoint(id,0,Array(1875).fill(.1),Array(1875).fill(.5));await jobs.pause(id);assert.equal(await jobs.next(id),null);
  jobs=new SilenceJobs(projects);await jobs.start(id);chunk=(await jobs.next(id))!;assert.equal(chunk.index,1);assert.equal(chunk.discardFrames,64);assert.ok(chunk.audio.length<63*16000);
  await jobs.checkpoint(id,1,Array(32).fill(.01),Array(32).fill(.01));const result=(await jobs.result(id))!;assert.equal(result.rms.length,1907);assert.equal(result.duration,61);
  assert.deepEqual((await projects.read(id)).data.words,data.words);assert.deepEqual((await projects.read(id)).data.manualCuts,data.manualCuts);
  await fs.writeFile(path.join(cache,'silence',job.key,'1.json'),'damaged');await jobs.start(id);assert.equal((await jobs.next(id))!.index,1,'damaged checkpoint can be recomputed');
  console.log('Silence jobs: bounded source chunks, VAD context, pause/restart, corruption recovery, duration and transcript/edit preservation passed.');
 }finally{const resolved=path.resolve(root);assert.ok(resolved.startsWith(path.resolve(os.tmpdir())+path.sep));await fs.rm(resolved,{recursive:true,force:true});}
}
void main();
