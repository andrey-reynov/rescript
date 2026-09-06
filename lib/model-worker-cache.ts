import {modelFileFromUrl} from './model-files';
export const managedModelUrl=(url:string)=>'app://localhost/__model?url='+encodeURIComponent(url);
/** Native models bypass browser copies. Alignment/diarization keep their existing cache. */
export function nativeModelCache(fetcher:(input:string|URL,init?:RequestInit)=>Promise<Response>){
 return {
  async match(key:string){if(modelFileFromUrl(key)){const url=managedModelUrl(key);if((await fetcher(url,{method:'HEAD'})).ok)return fetcher(url);return undefined;}return (await caches.open('transformers-cache')).match(key);},
  async put(key:string,response:Response){if(!modelFileFromUrl(key))await (await caches.open('transformers-cache')).put(key,response);},
 };
}
