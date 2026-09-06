import assert from 'node:assert/strict';
import {promises as fs} from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import {spawn} from 'node:child_process';
import {once} from 'node:events';
import {ModelStorage} from '../electron/model-storage';
import {modelFileUrl} from '../lib/model-files';

const url=modelFileUrl('tinyEn','config.json');
const offline:typeof fetch=async()=>{throw Error('Recovery must not download models');};
async function worker(root:string){
 const storage=new ModelStorage(path.join(root,'state.json'),'unused',()=>false,offline);
 fs.copyFile=async(_source,target)=>{
  await fs.writeFile(target,'incomplete copy');
  process.stdout.write('COPY_STARTED\n');
  await new Promise<void>(()=>{setInterval(()=>{},1000);});
 };
 await storage.relocate();
}
async function main(){
 const tempRoot=path.resolve(os.tmpdir());
 const root=await fs.mkdtemp(path.join(tempRoot,'rescript-relocation-crash-'));
 let child:ReturnType<typeof spawn>|undefined;
 try{
  const stateFile=path.join(root,'state.json');
  const storage=new ModelStorage(stateFile,path.join(root,'original'),()=>false,async()=>new Response('original model'));
  const original=await storage.ensure(url);
  const destination=path.join(root,'destination');await fs.mkdir(destination);await storage.setFolder(destination);
  child=spawn(process.execPath,['--import','tsx',path.resolve('tests/model-storage-crash-test.ts'),'--worker',root],{stdio:['ignore','pipe','pipe']});
  let errors='';child.stderr!.on('data',chunk=>{errors+=chunk;});
  await new Promise<void>((resolve,reject)=>{
   const timer=setTimeout(()=>reject(Error('Copy did not start: '+errors)),15000);
   child!.once('error',error=>{clearTimeout(timer);reject(error);});
   child!.once('exit',code=>{clearTimeout(timer);reject(Error('Worker exited early '+code+': '+errors));});
   child!.stdout!.on('data',chunk=>{if(String(chunk).includes('COPY_STARTED')){clearTimeout(timer);resolve();}});
  });
  const closed=once(child,'close');child.kill('SIGKILL');await closed;child=undefined;
  const checkpoint=JSON.parse(await fs.readFile(stateFile,'utf8'));
  assert.equal(checkpoint.relocationInProgress,true);
  assert.ok(checkpoint.relocationTemp,'Copy ownership must persist before copying');
  const partial=path.join(checkpoint.relocationTemp.root,'tinyEn','config.json.'+checkpoint.relocationTemp.token+'.part');
  assert.equal(await fs.readFile(partial,'utf8'),'incomplete copy');
  const unrelated=path.join(path.dirname(partial),'unrelated.part');await fs.writeFile(unrelated,'keep');
  const restarted=new ModelStorage(stateFile,'unused',()=>false,offline);
  assert.match((await restarted.status(false)).error??'',/interrupted/);
  assert.equal(await restarted.ensure(url),original);
  assert.equal(await fs.readFile(original,'utf8'),'original model');
  await restarted.relocate();
  assert.equal((await restarted.status(false)).error,null);
  const moved=await restarted.ensure(url);assert.ok(moved.startsWith(destination));
  assert.equal(await fs.readFile(moved,'utf8'),'original model');
  await assert.rejects(fs.stat(original),{code:'ENOENT'});
  await assert.rejects(fs.stat(partial),{code:'ENOENT'});
  assert.equal(await fs.readFile(unrelated,'utf8'),'keep');
  const final=JSON.parse(await fs.readFile(stateFile,'utf8'));
  assert.equal(final.relocationInProgress,false);assert.equal(final.relocationTemp,undefined);assert.deepEqual(final.cleanup,[]);
  console.log('Killed relocation: restart reports interruption, preserves original model, retries offline and removes only its recorded partial copy.');
 }finally{
  if(child){const closed=once(child,'close');child.kill('SIGKILL');await closed;}
  const relative=path.relative(tempRoot,root);assert.ok(relative&&!relative.startsWith('..')&&!path.isAbsolute(relative));
  await fs.rm(root,{recursive:true,force:true});
 }
}
void (process.argv[2]==='--worker'?worker(process.argv[3]):main()).catch(error=>{console.error(error);process.exitCode=1;});
