import assert from 'node:assert/strict';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { randomUUID } from 'node:crypto';
import { ProjectFiles, sourceReference, type ProjectData } from '../electron/project-files';
import { publishTranscriptionProgress } from '../electron/progressive-results';
import { extendTranscriptHistory } from '../lib/progressive-transcript';
import type { JobState } from '../electron/transcription-jobs';
import type { EditSnapshot, Word } from '../lib/types';

async function main(){
 const root=await fs.mkdtemp(path.join(os.tmpdir(),'rescript-progress-test-'));
 try{
  const source=path.join(root,'source.wav');await fs.writeFile(source,'fixture');
  const projects=new ProjectFiles(path.join(root,'library.json'),path.join(root,'projects'));const id=randomUUID();
  const initial:ProjectData={id,name:'Live edit',mediaKind:'audio',duration:180,source:'base',transcriptLanguage:'en',words:[],showDeleted:true};await projects.create(initial,await sourceReference(source));
  const job:JobState={projectId:id,key:'generation1',model:'base',language:'en',transcribe:true,status:'running',completed:[0],total:3,sampleCount:180*16000,sourceFingerprint:'fixture',updatedAt:1,message:'Running'};
  const generated:Word[]=Array.from({length:3},(_,i)=>({id:i*100000,text:'batch'+i,start:i*60+1,end:i*60+2,speaker:0,deleted:false}));
  await projects.update(id,data=>publishTranscriptionProgress(data,job,generated));
  const first=(await projects.read(id)).data;assert.equal(first.words.length,1);assert.equal(first.transcriptionComplete,false);
  const edited={...first,words:(first.words as Word[]).map(word=>({...word,deleted:true})),name:'Edited during inference'};
  job.completed=[0,1];
  await projects.update(id,data=>publishTranscriptionProgress(data,job,generated));
  await projects.save(id,edited); // Save started before the next batch reached the editor.
  let current=(await projects.read(id)).data;
  assert.equal(current.words.length,2);assert.equal((current.words[0] as Word).deleted,true);assert.equal(current.name,edited.name);
  assert.deepEqual(current.transcriptionChunks,[0,1]);
  job.completed=[0,1,2];job.status='complete';
  await projects.update(id,data=>publishTranscriptionProgress(data,job,generated));current=(await projects.read(id)).data;
  assert.equal(current.words.length,3);assert.equal((current.words[0] as Word).deleted,true);
  const beforeRetry=current;
  const retry={...job,key:'generation2',status:'running' as const,completed:[0,2],replacementChunks:[1]};
  assert.equal(publishTranscriptionProgress(current,retry,generated),current,'Copied unselected batches must not overwrite edits');
  retry.completed=[0,1,2];
  current=publishTranscriptionProgress(current,retry,generated.map((word,i)=>i===1?{...word,text:'new middle'}:word));
  assert.deepEqual(current.words[0],beforeRetry.words[0]);assert.deepEqual(current.words[2],beforeRetry.words[2]);assert.equal((current.words[1] as Word).text,'new middle');
  const history=[{words:first.words,manualCuts:[],sceneBoundaries:[],speakers:[]} as EditSnapshot];
  const extended=extendTranscriptHistory(history,edited.words,current.words as Word[]);
  assert.equal(extended[0].words.length,3);assert.equal(extended[0].words[0].deleted,false,'Undo history lost its original edit state');
  console.log('PROGRESSIVE RESULTS TESTS PASSED: live edits, late autosave, incremental commit, retry scope, undo preservation');
 }finally{
  const resolved=path.resolve(root);if(!resolved.startsWith(path.resolve(os.tmpdir())+path.sep)||!path.basename(resolved).startsWith('rescript-progress-test-'))throw Error('Unsafe cleanup');await fs.rm(resolved,{recursive:true,force:true});
 }
}
void main().catch(error=>{console.error(error);process.exitCode=1;});
