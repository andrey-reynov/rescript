import assert from 'node:assert/strict';
import {readReferencedMedia} from '../lib/media-input';

async function main(){
  const original=globalThis.fetch;const size=33*1024*1024+7;
  const source=new Uint8Array(size);source[0]=11;source[32*1024*1024]=42;source[size-1]=99;
  const ranges:string[]=[];const progress:number[]=[];
  try{
    globalThis.fetch=async(_url,options)=>{
      const range=new Headers(options?.headers).get('Range')!;ranges.push(range);
      const [,from,to]=range.match(/bytes=(\d+)-(\d+)/)!;
      return new Response(source.slice(Number(from),Number(to)+1),{status:206});
    };
    const file=await readReferencedMedia({url:'app://localhost/__media/test',size,name:'source.wav',type:'audio/wav',lastModified:123},value=>progress.push(value));
    assert.equal(ranges.length,2);assert.equal(ranges[0],'bytes=0-33554431');
    assert.deepEqual(new Uint8Array(await file.arrayBuffer()),source);
    assert.equal(progress[0],0);assert.equal(progress.at(-1),1);assert.ok(progress[1]>0&&progress[1]<1);
    assert.equal(file.name,'source.wav');assert.equal(file.lastModified,123);
    globalThis.fetch=async()=>new Response(new Uint8Array(2),{status:200});
    await assert.rejects(readReferencedMedia({url:'app://localhost/__media/test',size,name:'source.wav',type:'',lastModified:0}),/requested byte range/);
    console.log('MEDIA INPUT TESTS PASSED: bounded reads, byte progress, exact content, source metadata, invalid range rejection');
  }finally{globalThis.fetch=original;}
}
void main().catch(error=>{console.error(error);process.exitCode=1;});
