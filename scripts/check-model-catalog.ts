/** Metadata-only verification: no model weights are fetched. */
import {MODELS,MODEL_ORDER} from '../lib/models';
const suffix:Record<string,string>={fp32:'',fp16:'_fp16',q4:'_q4',int8:'_int8',q8:'_quantized'};
async function main(){const results=[];
for(const key of MODEL_ORDER){const model=MODELS[key];const repo=model.backend==='parakeet'?model.repoId:model.id;
 const response=await fetch('https://huggingface.co/api/models/'+repo+'?blobs=true');if(!response.ok)throw Error(repo+': '+response.status);
 const metadata=await response.json();const files=new Map<string,number>(metadata.siblings.map((x:{rfilename:string;size:number})=>[x.rfilename,x.size]));
 const pairs=model.backend==='whisper'?Object.entries(model.dtype).filter(([device])=>!model.cpuOnly||device==='wasm').map(([device,dtype])=>({device,files:Object.entries(dtype).map(([part,type])=>'onnx/'+part+suffix[type]+'.onnx')})):[{device:'webgpu',files:['encoder-model.fp16.onnx','decoder_joint-model.onnx']},{device:'wasm',files:['encoder-model.int8.onnx','decoder_joint-model.fp16.onnx']}];
 for(const pair of pairs)for(const file of pair.files)if(!files.has(file))throw Error(repo+' missing '+file);
 if(model.backend==='whisper'){const cfg=await(await fetch('https://huggingface.co/'+repo+'/resolve/main/generation_config.json')).json();if(!cfg.alignment_heads?.length)throw Error(repo+' missing alignment heads');if(!model.englishOnly&&!cfg.lang_to_id?.['<|ru|>'])throw Error(repo+' missing Russian');}
 results.push({key,repo,revision:metadata.sha,pairs:pairs.map(p=>({...p,bytes:p.files.reduce((n,f)=>n+files.get(f)!,0)}))});
}
console.log(JSON.stringify(results,null,2));console.log('Verified '+results.length+' model manifests; no weights downloaded.');}
void main().catch(e=>{console.error(e);process.exitCode=1});
