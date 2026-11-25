import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const css=readFileSync(new URL('../src/styles.css',import.meta.url),'utf8');
test('UI-01: headers use the intended scroll container',()=>{
 assert.match(css,/body\.ascendant-mode\{[^}]*overflow-x:clip/);
 assert.match(css,/\.ascendant-head\{position:sticky;top:0/);
 assert.match(css,/\.ascendant-lab-head\{position:sticky;top:0/);
});
