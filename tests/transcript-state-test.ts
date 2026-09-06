import assert from 'node:assert/strict';
import {useEditorStore as store} from '../lib/store';
import {projectPayload} from '../lib/autosave';
import type {Word} from '../lib/types';
const words:Word[]=Array.from({length:8},(_,id)=>({id,text:'word'+id,start:id,end:id+.8,speaker:id%2,deleted:false}));
store.setState({words,manualCuts:[],sceneBoundaries:[],phrases:[],clipNames:[],duration:8,past:[],future:[],selectedWordIds:[],selectionAnchor:null});
store.getState().selectWordRange([2]);store.getState().selectWordRange([4],true);assert.deepEqual(store.getState().selectedWordIds,[2,3,4]);store.getState().selectWordRange([1],true);assert.deepEqual(store.getState().selectedWordIds,[1,2]);assert.equal(store.getState().selectionAnchor,2);
store.getState().groupSelectedPhrase();assert.equal(store.getState().phrases.length,1);store.getState().undo();assert.equal(store.getState().phrases.length,0);store.getState().redo();assert.equal(store.getState().phrases.length,1);
store.getState().renameClip(3,'Chapter');assert.equal(store.getState().clipNames[0].name,'Chapter');store.getState().undo();assert.equal(store.getState().clipNames.length,0);store.getState().redo();
store.getState().selectWordRange([3]);assert.equal(store.getState().splitBeforeSelection(),true);assert.equal(store.getState().splitBeforeSelection(),false);assert.equal(store.getState().sceneBoundaries.length,1);assert.equal(store.getState().currentTime,0);
store.getState().selectWordRange([0,1]);store.getState().correctWords([0,1],'replacement phrase');assert.equal(store.getState().words[0].correction?.timing,'approximate');store.getState().undo();assert.deepEqual(store.getState().words,words);
store.setState({videoFile:new File([],"test.wav"),mediaKind:"audio",skipTranscription:true});const payload=projectPayload();store.setState({videoFile:null});assert.ok(payload);assert.deepEqual(payload.clipNames,store.getState().clipNames);assert.deepEqual(payload.phrases,store.getState().phrases);
console.log('Transcript state: anchored ranges, undo/redo, explicit split, correction and persistence payload passed.');

// Drag and Shift-click share source order and the pointer-down anchor, even
// when intermediate deleted text is hidden or the drag runs backwards.
store.setState({words:words.map(w=>({...w,deleted:w.id===3})),showDeleted:false,manualCuts:[],sceneBoundaries:[],phrases:[],currentTime:6,selectedClipIndex:0,selectedCutIndex:0});
store.getState().selectWordSpan(5,1);
assert.deepEqual(store.getState().selectedWordIds,[1,2,3,4,5]);
assert.equal(store.getState().selectionAnchor,5);
assert.equal(store.getState().selectedClipIndex,null);
assert.equal(store.getState().selectedCutIndex,null);
store.getState().selectWordRange([7],true);
assert.deepEqual(store.getState().selectedWordIds,[5,6,7]);
assert.equal(store.getState().selectionAnchor,5);
store.getState().selectWordSpan(1,5);
store.getState().selectWordRange([0],true);
assert.deepEqual(store.getState().selectedWordIds,[0,1]);
assert.equal(store.getState().currentTime,6,'Selection must not seek');
assert.equal(store.getState().words[3].deleted,true,'Selecting hidden text must not restore it');
console.log('Drag selection: full hidden range, forward/backward anchor, Shift continuation and unchanged playhead passed.');
