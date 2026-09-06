import assert from 'node:assert/strict';
import {isCompositionKey} from '../lib/keyboard';
assert.equal(isCompositionKey({isComposing:true,keyCode:13}),true);
assert.equal(isCompositionKey({isComposing:false,keyCode:229}),true);
assert.equal(isCompositionKey({isComposing:false,keyCode:13}),false);
assert.equal(isCompositionKey({isComposing:false,keyCode:8}),false);
console.log('IME confirmation keys are distinct from editing/media shortcuts.');
