/** Describe the single byte range used by browser media playback. */
export function mediaRange(value:string|null,size:number):{status:200|206|416;start:number;end:number;length:number}{
  const invalid={status:416 as const,start:0,end:0,length:0};
  if(!value)return {status:200,start:0,end:size-1,length:size};
  const match=/^bytes=(\d*)-(\d*)$/.exec(value);
  if(!match||(!match[1]&&!match[2])||size<=0)return invalid;
  const start=match[1]?Number(match[1]):Math.max(0,size-Number(match[2]));
  const end=match[1]?(match[2]?Math.min(size-1,Number(match[2])):size-1):size-1;
  if(!Number.isSafeInteger(start)||!Number.isSafeInteger(end)||start<0||start>=size||end<start)return invalid;
  return {status:206,start,end,length:end-start+1};
}
