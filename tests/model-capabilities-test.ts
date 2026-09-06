import assert from 'node:assert/strict';
import {MODELS,MODEL_ORDER,assertModelLanguage,modelSupportsLanguage} from '../lib/models';
import {compatibleLanguage} from '../lib/model-capabilities';
import {TranscriptionJobs} from '../electron/transcription-jobs';
import {ProjectFiles} from '../electron/project-files';
async function main(){
 assert.equal(MODELS.parakeet.capabilities.spokenLanguages.length,25);
 assert.ok(MODELS.parakeet.capabilities.spokenLanguages.includes('ru'));
 assert.ok(!MODELS.parakeet.capabilities.spokenLanguages.includes('zh'));
 for(const id of MODEL_ORDER){
  assertModelLanguage(id,'auto');
  assert.throws(()=>assertModelLanguage(id,'unknown'));
  if(MODELS[id].englishOnly){assertModelLanguage(id,'en');assert.throws(()=>assertModelLanguage(id,'ru'));}
 }
 assert.equal(modelSupportsLanguage('parakeet','ru'),false,'spoken language is not a forcing capability');
 assert.equal(compatibleLanguage(MODELS.parakeet.capabilities,'ru'),'auto');
 assert.equal(compatibleLanguage(MODELS.tinyEn.capabilities,'ru'),'en');
 assert.equal(compatibleLanguage(MODELS.base.capabilities,'ru'),'ru');
 let accessed=false;
 const projects={read:async()=>{accessed=true;throw Error('Unexpected project access');}} as unknown as ProjectFiles;
 const jobs=new TranscriptionJobs(projects);
 await assert.rejects(jobs.start('project','parakeet','ru',true),/automatically/);
 await assert.rejects(jobs.transcribeRange('project',0,1,'tinyEn','ru'),/does not support/);
 assert.equal(accessed,false,'invalid requests cannot touch projects or start preparation/downloads');
 console.log('Model capabilities: supported speech, automatic-only configuration and pre-job validation passed.');
}
void main();
