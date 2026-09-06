import {AutoModel,Tensor,env} from '@huggingface/transformers';
import {audioRms,ANALYSIS_FRAME,ANALYSIS_RATE} from '@/lib/silence-analysis';
env.allowLocalModels=false;
if(env.backends?.onnx?.wasm)env.backends.onnx.wasm.wasmPaths='/vendor/ort/';
type Vad=(input:{input:Tensor;sr:Tensor;state:Tensor})=>Promise<{output:{data:ArrayLike<number>};stateN:Tensor}>;
let model:Promise<Vad>|null=null;
self.onmessage=async(event:MessageEvent<{audio:Float32Array;discardFrames:number}>)=>{
 try{
  if(!model)model=AutoModel.from_pretrained('onnx-community/silero-vad',{
   // @ts-expect-error Silero is a custom graph without Transformers metadata.
   config:{model_type:'custom'},dtype:'fp32',device:'wasm',
  }).then(value=>value as unknown as Vad).catch(error=>{model=null;throw error;});
  const vad=await model;const {audio,discardFrames}=event.data;const rms=audioRms(audio),speech:number[]=[];
  const sr=new Tensor('int64',[BigInt(ANALYSIS_RATE)],[]);let state=new Tensor('float32',new Float32Array(256),[2,1,128]);
  for(let i=0;i<rms.length;i++){
   const frame=new Float32Array(ANALYSIS_FRAME);frame.set(audio.subarray(i*ANALYSIS_FRAME,(i+1)*ANALYSIS_FRAME));
   const {output,stateN}=await vad({input:new Tensor('float32',frame,[1,ANALYSIS_FRAME]),sr,state});state=stateN;
   speech.push(Number(output.data[0]));if(i%64===0)self.postMessage({type:'progress',value:i/rms.length});
  }
  self.postMessage({type:'complete',rms:rms.slice(discardFrames).map(v=>Math.round(v*1e6)/1e6),speech:speech.slice(discardFrames).map(v=>Math.round(v*1e6)/1e6)});
 }catch(error){self.postMessage({type:'error',message:'Speech detection failed. No acoustic regions were replaced. '+String(error)});}
};
