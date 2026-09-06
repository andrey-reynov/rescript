import {LogitsProcessor,LogitsProcessorList,Tensor,type AutomaticSpeechRecognitionPipeline} from '@huggingface/transformers';

/** Whisper identifies language by predicting one language token after its start token. */
class LanguageTokensOnly extends LogitsProcessor {
  constructor(private readonly allowed:Set<number>){super();}
  _call(_inputIds:bigint[][],logits:Tensor):Tensor {
    const size=logits.dims.at(-1)!;
    const values=logits.data as Float32Array;
    for(let i=0;i<values.length;i++)if(!this.allowed.has(i%size))values[i]=-Infinity;
    return logits;
  }
}

/** Run per speech region, rather than locking a bilingual project to its first language.
 * transformers.js 4.2 defaults missing language to English, so omission is not detection.
 */
export async function detectWhisperLanguage(asr:AutomaticSpeechRecognitionPipeline,audio:Float32Array):Promise<string>{
  const config=asr.model.generation_config as unknown as {lang_to_id?:Record<string,number>;decoder_start_token_id?:number};
  const entries=Object.entries(config.lang_to_id??{});
  if(!entries.length||config.decoder_start_token_id===undefined)throw Error('This Whisper model does not support language detection.');
  const features=await asr.processor(audio.slice(0,30*16000));
  const processors=new LogitsProcessorList();processors.push(new LanguageTokensOnly(new Set(entries.map(([,id])=>id))));
  const tokens=await asr.model.generate({
    inputs:features.input_features,
    decoder_input_ids:new Tensor('int64',BigInt64Array.from([BigInt(config.decoder_start_token_id)]),[1,1]),
    max_new_tokens:1,
    return_timestamps:false,
    return_dict_in_generate:false,
    suppress_tokens:[],begin_suppress_tokens:[],
    logits_processor:processors,
  });
  if(!(tokens instanceof Tensor))throw Error('Language detection returned no tokens.');
  const id=Number(tokens.data[tokens.data.length-1]);
  const token=entries.find(([,value])=>value===id)?.[0];
  if(!token)throw Error('The spoken language could not be identified.');
  return token.replace(/^<\|/,'').replace(/\|>$/,'');
}
