/** Desktop playback uses a source URL; decoding resolves bytes only when needed. */
export interface ReferencedMedia { url:string; name:string; size:number; type:string; lastModified:number; }
export type MediaInput = File | ReferencedMedia;
export function isReferencedMedia(media:Blob|ReferencedMedia):media is ReferencedMedia { return 'url' in media; }
/** Bounded reads report real byte progress and avoid a single multi-gigabyte response. */
export async function readReferencedMedia(media:ReferencedMedia,onProgress?:(value:number)=>void):Promise<File>{
  const parts:Blob[]=[];const batch=32*1024*1024;
  onProgress?.(0);
  for(let start=0;start<media.size;start+=batch){
    const end=Math.min(media.size,start+batch)-1;
    const response=await fetch(media.url,{headers:{Range:'bytes='+start+'-'+end}});
    if(!response.ok)throw Error('Could not read original media. Relink the source and retry.');
    const blob=await response.blob();
    if(blob.size!==end-start+1)throw Error('Source did not return the requested byte range.');
    parts.push(blob);onProgress?.((end+1)/media.size);
  }
  return new File(parts,media.name,{type:media.type,lastModified:media.lastModified});
}
