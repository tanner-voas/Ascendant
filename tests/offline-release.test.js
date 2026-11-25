import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
const root=new URL('../',import.meta.url);
test('standalone package enables page zoom and fingerprints every offline asset',()=>{
 execFileSync('python3',['package.py'],{cwd:root});
 const html=readFileSync(new URL('dist/standalone/index.html',root),'utf8');
 assert.match(html,/maximum-scale=1, user-scalable=no/);
 const sw=readFileSync(new URL('dist/standalone/sw.js',root),'utf8');
 const assets=JSON.parse(sw.match(/const ASSETS=(.*);\n/)[1]);
 assert.ok(assets.length>5);for(const a of assets){
  const bytes=readFileSync(new URL('dist/standalone/'+a.path,root));
  assert.equal(a.size,bytes.length);assert.equal(a.sha256,createHash('sha256').update(bytes).digest('hex'));assert.deepEqual(a.groups,['shell']);
 }
});
