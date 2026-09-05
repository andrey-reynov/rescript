/** Match the desktop source identity without reading an entire legacy media blob. */
export async function fingerprintMediaBlob(blob:Blob):Promise<string>{
  const size=new TextEncoder().encode(String(blob.size));
  const first=new Uint8Array(await blob.slice(0,65536).arrayBuffer());
  const last=new Uint8Array(await blob.slice(Math.max(0,blob.size-65536)).arrayBuffer());
  const bytes=new Uint8Array(size.length+first.length+last.length);bytes.set(size);bytes.set(first,size.length);bytes.set(last,size.length+first.length);
  const digest=await crypto.subtle.digest('SHA-256',bytes);return Array.from(new Uint8Array(digest),value=>value.toString(16).padStart(2,'0')).join('');
}
