import {MODELS,MODEL_ORDER,type ModelId} from './models';
const suffix:Record<string,string>={fp32:'',fp16:'_fp16',q4:'_q4',int8:'_int8',q8:'_quantized',q4f16:'_q4f16',uint8:'_uint8',bnb4:'_bnb4'};
export function requiredModelFiles(id:ModelId,gpu:boolean):string[]{
 const m=MODELS[id];
 if(m.backend==='parakeet')return [gpu?'encoder-model.fp16.onnx':'encoder-model.int8.onnx',gpu?'decoder_joint-model.onnx':'decoder_joint-model.fp16.onnx','vocab.txt','nemo128.onnx'];
 const device=m.cpuOnly||!gpu?'wasm':'webgpu';
 return ['config.json','tokenizer.json','tokenizer_config.json','preprocessor_config.json','generation_config.json',...Object.entries(m.dtype[device]).map(([part,type])=>'onnx/'+part+suffix[type]+'.onnx')];
}

export function modelFileUrl(id:ModelId,file:string):string {
 const model=MODELS[id];return 'https://huggingface.co/'+(model.backend==='whisper'?model.id:model.repoId)+'/resolve/main/'+file;
}
export function modelFileFromUrl(url:string):{id:ModelId;file:string}|null {
 for(const id of MODEL_ORDER){
  const prefix=modelFileUrl(id,'');if(!url.startsWith(prefix))continue;
  const file=url.slice(prefix.length);
  if([...requiredModelFiles(id,false),...requiredModelFiles(id,true)].includes(file))return {id,file};
 }
 return null;
}
