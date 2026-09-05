import assert from 'node:assert/strict';
import { promises as fs } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { ProjectFiles, sourceReference } from '../electron/project-files';
import { TranscriptionJobs, mapChunkWords } from '../electron/transcription-jobs';

async function main(){
  const root=await fs.mkdtemp(path.join(os.tmpdir(),'rescript-job-test-'));
  try{
    const file=path.join(root,'source.mp4');await fs.writeFile(file,'fixture');
    const projects=new ProjectFiles(path.join(root,'config.json'),path.join(root,'projects'));
    const id=randomUUID();await projects.create({id,name:'Job',mediaKind:'video',duration:125,source:'base',transcriptLanguage:'en',words:[],showDeleted:true},await sourceReference(file));
    let jobs=new TranscriptionJobs(projects);
    let job=await jobs.start(id,'base','en',true);assert.equal(job.status,'preparing');
    await jobs.beginAudio(id);
    const pcm=new Uint8Array(125*16000*4);
    for(let offset=0;offset<pcm.length;offset+=1024*1024)await jobs.appendAudio(id,pcm.subarray(offset,offset+1024*1024));
    job=await jobs.audioReady(id,{sampleCount:125*16000,bucketSize:16000,min:Array(125).fill(-1),max:Array(125).fill(1)});
    assert.equal(job.total,3);
    const first=(await jobs.next(id))!;assert.equal(first.coreStart,0);assert.equal(first.audio.length,62*16000);
    const word={id:0,text:'kept',start:59,end:59.5,speaker:0,deleted:false};
    const {audio:_audio,...timing}=first;void _audio;
    await jobs.checkpoint(id,job.key,timing,[word]);
    // Restart the service and retry the same completion: no duplicate output.
    jobs=new TranscriptionJobs(projects);
    job=await jobs.start(id,'base','en',true);assert.deepEqual(job.completed,[0]);
    await jobs.checkpoint(id,job.key,timing,[word]);assert.equal((await jobs.words(id)).length,1);
    const second=(await jobs.next(id))!;assert.equal(second.index,1);assert.equal(second.start,58);
    const mapped=mapChunkWords(second,[{...word,start:1,end:1.5},{...word,start:2,end:2.5}]);
    assert.equal(mapped.length,1);assert.equal(mapped[0].start,60);
    await jobs.setStatus(id,'paused','Paused');assert.equal(await jobs.next(id),null);
    job=await jobs.start(id,'base','en',true);assert.equal((await jobs.next(id))!.index,1);
    await assert.rejects(jobs.checkpoint(id,'stale',timing,[word]),/Stale/);
    // Simulate death after atomic result commit but before manifest update.
    const directory=await jobs.resultDirectory(job);
    await fs.writeFile(path.join(directory,'1.json'),JSON.stringify({key:job.key,words:mapped}));
    job=await jobs.start(id,'base','en',true);assert.deepEqual(job.completed,[0,1]);
    const last=(await jobs.next(id))!;assert.equal(last.index,2);assert.equal(last.coreEnd,125);
    const {audio:_last,...lastTiming}=last;void _last;
    job=await jobs.checkpoint(id,job.key,lastTiming,[]);assert.equal(job.status,'complete');
    assert.equal((await jobs.words(id)).length,2);
    const changed=await jobs.start(id,'small','en',true);assert.notEqual(changed.key,job.key);assert.deepEqual(changed.completed,[]);
    assert.equal(changed.status,'running','Reusable PCM should not need extraction again');
    console.log('TRANSCRIPTION CHECKPOINT TESTS PASSED: bounded chunks, overlap, restart, idempotency, pause, crash boundary, settings identity');
  }finally{
    if(!path.resolve(root).startsWith(path.resolve(os.tmpdir())+path.sep)||!path.basename(root).startsWith('rescript-job-test-'))throw Error('Unsafe test cleanup');
    await fs.rm(root,{recursive:true,force:true});
  }
}
void main().catch(error=>{console.error(error);process.exitCode=1;});
