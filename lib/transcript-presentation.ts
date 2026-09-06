/** Compact source duration; numbering is display-only, never a block identity. */
export function intervalDuration(seconds:number,suffix='s'):string {
 const value=Math.max(0,Number.isFinite(seconds)?seconds:0);
 if(value<60)return value.toFixed(1)+' '+suffix;
 const tenths=Math.round(value*10),hours=Math.floor(tenths/36000),minutes=Math.floor(tenths/600)%60,remainder=((tenths%600)/10).toFixed(1).padStart(4,'0');
 return hours?hours+':'+String(minutes).padStart(2,'0')+':'+remainder:Math.floor(tenths/600)+':'+remainder;
}
export function hiddenSelectionCount(ids:readonly number[],selected:ReadonlySet<number>,hidden:ReadonlySet<number>):number {
 let count=0;for(const id of ids)if(selected.has(id)&&hidden.has(id))count++;return count;
}
