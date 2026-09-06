/** Pack words into visual lines without creating persisted text/clip boundaries.
 * Width measurements are cached by the caller and never depend on selection.
 * A single oversized word occupies a row and may wrap naturally inside it. */
export function transcriptFlow<T extends {text:string}>(words:readonly T[],width:number,measure:(text:string)=>number):T[][] {
 const available=Math.max(1,Number.isFinite(width)?width:1),space=measure(' ');
 const rows:T[][]=[];let line:T[]=[],used=0;
 for(const word of words){
  const size=measure(word.text.replace(/[\t\n\r ]+/g,' ').trim());
  const next=used+(line.length?space:0)+size;
  if(line.length&&next>available){rows.push(line);line=[];used=0;}
  used+=(line.length?space:0)+size;line.push(word);
 }
 if(line.length)rows.push(line);return rows;
}
