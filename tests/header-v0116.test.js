import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const src=readFileSync(new URL('../src/app.js',import.meta.url),'utf8');
const css=readFileSync(new URL('../src/styles.css',import.meta.url),'utf8');
test('battle header uses one row, compact overflow and unified final navigation',()=>{
 const head=src.slice(src.indexOf('function header(sub)'),src.indexOf('function movementOverlay'));
 assert.match(head,/v0\.1\.16/);
 assert.match(head,/data-do="headerMenu"/);
 assert.match(head,/data-do="\$\{hosted\?'home':'update'\}"/);
 assert.ok(head.indexOf('ascendant-header-menu-wrap')<head.indexOf('ascendant-host-home'));
 assert.match(css,/\.ascendant-head\{position:sticky/);
 assert.match(css,/\.ascendant-head-actions\{display:flex;flex:0 0 auto;flex-wrap:nowrap/);
 assert.match(css,/env\(safe-area-inset-top\)/);
});
