import assert from 'node:assert/strict';
import {promises as fs} from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import {ModelStorage} from '../electron/model-storage';
import {modelFileUrl,requiredModelFiles} from '../lib/model-files';
async function main(){
 const root=await fs.mkdtemp(path.join(os.tmpdir(),'rescript-model-store-'));let active=false,requests=0;
 const bytes=new TextEncoder().encode('model-fixture');
 const fetcher:typeof fetch=async()=>{requests++;return new Response(bytes,{headers:{'content-length':String(bytes.length)}});};
 const stateFile=path.join(root,'settings.json'),initial=path.join(root,'old','Rescript Models');
 const store=new ModelStorage(stateFile,initial,()=>active,fetcher);
 try{
  const url=modelFileUrl('tinyEn','config.json');
  await Promise.all([store.ensure(url),store.ensure(url)]);assert.equal(requests,1,'concurrent loads share a download');
  for(const file of requiredModelFiles('tinyEn',false))await store.ensure(modelFileUrl('tinyEn',file));
  assert.equal((await store.status(false)).models.tinyEn.available,true);
  active=true;await assert.rejects(store.remove('tinyEn'),/pause processing/);await assert.rejects(store.relocate(),/pause processing/);active=false;
  const destination=path.join(root,'new');await fs.mkdir(destination);await store.setFolder(destination);
  assert.equal((await store.status(false)).models.tinyEn.outsideDefault,true,'changing folder keeps old files usable');
  const old=await store.existing(url);assert.ok(old?.startsWith(initial));
  await store.relocate();const moved=await store.existing(url);assert.ok(moved?.startsWith(destination));await assert.rejects(fs.stat(old!),{code:'ENOENT'});
  const restarted=new ModelStorage(stateFile,'ignored',()=>false,async()=>{throw Error('Network must not be used');});
  assert.equal(await restarted.ensure(url),moved,'reopen from relocated storage offline');
  assert.equal((await restarted.status(false)).folder,path.join(destination,'Rescript Models'));
  const third=path.join(root,'third');await fs.mkdir(third);await restarted.setFolder(third);
  await fs.writeFile(moved!,new TextEncoder().encode('broken-fixtur'));
  await assert.rejects(restarted.relocate(),/damaged/);assert.ok(await fs.stat(moved!),'failed relocation preserves source');
  await fs.writeFile(moved!,bytes);await restarted.relocate();assert.equal((await restarted.status(false)).error,null);
  await restarted.remove('tinyEn');assert.equal((await restarted.status(false)).models.tinyEn.available,false);
  const token=await restarted.importStart('tiny','config.json',bytes.length);assert.ok(token);
  await assert.rejects(restarted.importAppend(token!,1,bytes),/Invalid/);
  await assert.rejects(restarted.importFinish(token!),/Incomplete/);
  await restarted.importAppend(token!,0,bytes);await restarted.importFinish(token!);
  assert.ok(await restarted.existing(modelFileUrl('tiny','config.json')));
  await assert.rejects(restarted.ensure('https://example.com/secret'),/Unknown/);
  await assert.rejects(restarted.importStart('tiny','../../project.rescript',1),/Unknown/);
  const project=path.join(third,'my-project.rescript');await fs.writeFile(project,'untouched');await restarted.remove('tiny');assert.equal(await fs.readFile(project,'utf8'),'untouched');
  console.log('Model storage: deduplicated downloads, availability, locked mutations, verified offline relocation/restart, failed-copy preservation, import bounds and project isolation passed.');
 }finally{await fs.rm(root,{recursive:true,force:true});}
}
void main();
