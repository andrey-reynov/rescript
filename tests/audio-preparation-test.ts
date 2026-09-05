import assert from 'node:assert/strict';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { randomUUID } from 'node:crypto';
import { ProjectFiles, sourceReference } from '../electron/project-files';
import { TranscriptionJobs } from '../electron/transcription-jobs';
import { buildWaveformPeaks } from '../lib/waveform';

async function main(){
  const root=await fs.mkdtemp(path.join(os.tmpdir(),'rescript-preparation-test-'));
  try{
    const source=path.join(root,'source.wav');await fs.writeFile(source,'fixture');
    const projects=new ProjectFiles(path.join(root,'library.json'),path.join(root,'projects'));const id=randomUUID();
    await projects.create({id,name:'Preparation',mediaKind:'audio',duration:125,source:'base',transcriptLanguage:'en',words:[],showDeleted:true},await sourceReference(source));
    let jobs=new TranscriptionJobs(projects);await jobs.start(id,'base','en',true);
    let state=await jobs.preparation(id);assert.equal(state.index,0);
    const samples=125*16000+3,pcm=Float32Array.from({length:samples},(_,i)=>Math.sin(i/31)*.7);
    const bytes=(from:number,to:number)=>new Uint8Array(pcm.buffer,from*4,(to-from)*4);
    state=await jobs.prepareChunk(id,0,bytes(0,960000),false);assert.equal(state.index,1);
    const cache=(await projects.fileFor(id))+'.cache';const pending=path.join(cache,'audio.pending');
    await fs.appendFile(pending,Buffer.alloc(128,9));
    jobs=new TranscriptionJobs(projects);state=await jobs.preparation(id);
    assert.equal(state.index,1);assert.equal((await fs.stat(pending)).size,960000*4,'Uncommitted tail must be discarded');
    state=await jobs.prepareChunk(id,0,bytes(0,960000),false);assert.equal(state.index,1,'Duplicate delivery must not append twice');
    await assert.rejects(jobs.prepareChunk(id,2,bytes(0,960000),false),/Invalid/);
    await jobs.prepareChunk(id,1,bytes(960000,1920000),false);
    await jobs.setStatus(id,'paused','Test pause');await jobs.start(id,'base','en',true);
    state=await jobs.preparation(id);assert.equal(state.index,2,'Pause/resume lost extracted minutes');
    await jobs.prepareChunk(id,2,bytes(1920000,samples),true);
    // Death during finalization, after rename but before final audio metadata.
    await fs.rename(pending,path.join(cache,'audio.f32'));
    jobs=new TranscriptionJobs(projects);state=await jobs.preparation(id);assert.equal(state.finished,true);
    const job=await jobs.completePreparedAudio(id);assert.equal(job.sampleCount,samples);assert.equal(job.total,3);
    assert.deepEqual(await fs.readFile(await jobs.audioFile(id)),Buffer.from(pcm.buffer),'Batch boundaries changed source samples');
    const waveform=(await jobs.waveform(id))!;
    const reference=buildWaveformPeaks(pcm,Math.ceil(samples/waveform.bucketSize));
    assert.deepEqual(waveform.min,Array.from(reference.min));assert.deepEqual(waveform.max,Array.from(reference.max));
    console.log('AUDIO PREPARATION TESTS PASSED: bounded chunks, pause/resume, crash tail, duplicate delivery, finalization crash, exact samples and waveform');
  }finally{
    const resolved=path.resolve(root);if(!resolved.startsWith(path.resolve(os.tmpdir())+path.sep)||!path.basename(resolved).startsWith('rescript-preparation-test-'))throw Error('Unsafe test cleanup');
    await fs.rm(resolved,{recursive:true,force:true});
  }
}
void main().catch(error=>{console.error(error);process.exitCode=1;});
