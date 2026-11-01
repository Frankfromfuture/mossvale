import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {renderReadme} from '../src/readme.mjs';

const readme=readFileSync(new URL('../../README.md',import.meta.url),'utf8');
const {version}=JSON.parse(readFileSync(new URL('../package.json',import.meta.url),'utf8'));
test('both About languages include the full README introduction and local images',()=>{
 for(const language of ['zh','en']){
  const html=renderReadme(readme,language);
  assert.equal((html.match(/<h3>/g)||[]).length,7);
  assert.equal((html.match(/<table>/g)||[]).length,2);
  assert.match(html,/Three.js/);assert.match(html,/DeepSeek/);assert.match(html,/Qwen/);
  assert.match(html,/npm run setup\nnpm run build\nnpm start/);
  assert.match(html,/<img src="art\/about\/home.png"/);
  assert.match(html,/mossvale\/blob\/main\/mystery\/AGENTS.md/);
  assert.ok(html.includes(version));
 }
 assert.match(renderReadme(readme,'en'),/currently in Chinese/);
});

test('README rendering keeps HTML and unsafe URLs inert',()=>{
 const source='<!-- mossvale:zh -->\n## 中文\n<script>alert(1)</script>\n\n[bad](javascript:alert(1))\n\n![bad](https://untrusted.example/tracker.png)\n<!-- mossvale:en -->\n## English\nText';
 const html=renderReadme(source,'zh');
 assert.match(html,/&lt;script&gt;/);assert.doesNotMatch(html,/<script|href="javascript:|<img/);
 assert.throws(()=>renderReadme('No language sections','zh'));
});
