/** Best-effort disposable preview. Saving does not depend on thumbnail decoding. */
export function projectThumbnail(file: File): Promise<string | null> {
  if(!file.type.startsWith('video/') && !/\.(mp4|mov|mkv|webm|m4v)$/i.test(file.name)) return Promise.resolve(null);
  return new Promise(resolve=>{
    const video=document.createElement('video');
    const url=URL.createObjectURL(file);
    let done=false;
    const finish=(image:string|null)=>{
      if(done)return;done=true;clearTimeout(timer);video.removeAttribute('src');video.load();URL.revokeObjectURL(url);resolve(image);
    };
    const timer=setTimeout(()=>finish(null),7000);
    video.muted=true;video.preload='metadata';
    video.onloadedmetadata=()=>{video.currentTime=Math.min(1,video.duration/3);};
    video.onseeked=()=>{
      try {
        const canvas=document.createElement('canvas');canvas.width=320;canvas.height=180;
        const ctx=canvas.getContext('2d');
        if(!ctx)return finish(null);
        ctx.fillStyle='#18181b';ctx.fillRect(0,0,320,180);
        const scale=Math.min(320/video.videoWidth,180/video.videoHeight);
        const w=video.videoWidth*scale,h=video.videoHeight*scale;
        ctx.drawImage(video,(320-w)/2,(180-h)/2,w,h);
        finish(canvas.toDataURL('image/jpeg',0.72));
      } catch {finish(null);}
    };
    video.onerror=()=>finish(null);video.src=url;
  });
}
