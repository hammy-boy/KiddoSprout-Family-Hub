import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, readFile, writeFile, rm, stat } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { CHESS_FILES, includePublishedChess } from './include-chess-academy.mjs';
const sourceRoot=fileURLToPath(new URL('../public-site/',import.meta.url));
const external='<a class="card" href="https://davidolufunmilayo1-blip.github.io/advaced-chess-academy/" target="_blank" rel="noopener noreferrer"><h3>Advaced Chess Academy</h3></a>';
test('Pages artifact retains the exact published chess files and internal link without replacing unrelated content',async()=>{
 const outputRoot=await mkdtemp(join(tmpdir(),'chess-artifact-'));
 try{
  await mkdir(join(outputRoot,'games'));await writeFile(join(outputRoot,'games/index.html'),'<h1>New learning features</h1>'+external+'<p>Other games stay here</p>');await writeFile(join(outputRoot,'learning-path.html'),'New Homeschool Hub');
  assert.equal(await includePublishedChess({sourceRoot,outputRoot}),38);
  const chooser=await readFile(join(outputRoot,'games/index.html'),'utf8');assert.match(chooser,/href="chess-academy\/"/);assert.match(chooser,/Rookavelle/);assert.match(chooser,/New learning features/);assert.match(chooser,/Other games stay here/);assert.doesNotMatch(chooser,/advaced-chess-academy/);
  for(const file of CHESS_FILES)assert.deepEqual(await readFile(join(outputRoot,'games/chess-academy',file)),await readFile(join(sourceRoot,'games/chess-academy',file)));
  assert.equal(await readFile(join(outputRoot,'learning-path.html'),'utf8'),'New Homeschool Hub');await assert.rejects(stat(join(outputRoot,'games/chess-academy/server.cjs')));
  assert.equal(await includePublishedChess({sourceRoot,outputRoot}),38);assert.equal(await readFile(join(outputRoot,'games/index.html'),'utf8'),chooser);
 }finally{await rm(outputRoot,{recursive:true,force:true})}
});
test('unexpected chooser layout fails instead of silently publishing a broken link',async()=>{
 const outputRoot=await mkdtemp(join(tmpdir(),'chess-artifact-'));
 try{await mkdir(join(outputRoot,'games'));await writeFile(join(outputRoot,'games/index.html'),'<p>No chess card</p>');await assert.rejects(includePublishedChess({sourceRoot,outputRoot}),/Expected one/);assert.equal(await readFile(join(outputRoot,'games/index.html'),'utf8'),'<p>No chess card</p>');await assert.rejects(stat(join(outputRoot,'games/chess-academy')))}finally{await rm(outputRoot,{recursive:true,force:true})}
});
