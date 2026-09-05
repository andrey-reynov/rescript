import assert from 'node:assert/strict';
import { setTimeout as delay } from 'node:timers/promises';
import { useEditorStore } from '../lib/store';
import { scheduleProjectAutosave, flushProjectAutosave } from '../lib/autosave';

async function main() {
  const calls: Array<{name:string;resolve:()=>void;reject:(e:Error)=>void}> = [];
  const desktop = {projects:{save:(_id:string,data:{name:string})=>new Promise<void>((resolve,reject)=>calls.push({name:data.name,resolve,reject}))}};
  Object.defineProperty(globalThis,'window',{configurable:true,value:{rescriptDesktop:desktop,dispatchEvent:()=>true}});
  const file=new File(['fixture'],'commentary.mp4',{type:'video/mp4'});
  useEditorStore.setState({videoFile:file,mediaKind:'video',projectId:'test',projectName:'first',status:'ready'});
  // Continuous editing every 100 ms must still start a save within 500 ms.
  scheduleProjectAutosave();
  for(let i=0;i<6;i++){await delay(100);scheduleProjectAutosave();}
  assert.equal(calls.length,1,'Continuous input starved autosave');
  useEditorStore.setState({projectName:'second'});scheduleProjectAutosave();
  calls[0].resolve();await delay(0);
  assert.equal(useEditorStore.getState().saveState,'pending','Old acknowledgement hid unsaved edits');
  const pending=flushProjectAutosave();await delay(0);
  assert.equal(calls[1].name,'second');calls[1].resolve();await pending;
  assert.equal(useEditorStore.getState().saveState,'saved');
  const failure=flushProjectAutosave();const rejection=assert.rejects(failure,/disk full/);await delay(0);
  calls[2].reject(new Error('disk full'));await rejection;
  assert.equal(useEditorStore.getState().saveState,'error');
  assert.equal(useEditorStore.getState().saveError,'disk full');
  // A failed save must not poison the serialized queue.
  const retry=flushProjectAutosave();await delay(0);calls[3].resolve();await retry;
  assert.equal(useEditorStore.getState().saveState,'saved');
  useEditorStore.setState({jobState:'paused',projectThumbnail:'old',lastSavedAt:1});
  useEditorStore.getState().reset();
  assert.equal(useEditorStore.getState().jobState,null);
  assert.equal(useEditorStore.getState().projectName,'');
  assert.equal(useEditorStore.getState().projectThumbnail,null);
  console.log('AUTOSAVE TESTS PASSED: continuous editing, stale acknowledgement, visible failure, retry, reset');
}
void main().catch(e=>{console.error(e);process.exitCode=1;});
