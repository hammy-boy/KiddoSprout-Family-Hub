import { readFile, lstat, mkdir, writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
const ROOT = fileURLToPath(new URL('../', import.meta.url));
// Keep the already-published static academy in the generated Pages artifact.
// An explicit inventory prevents source servers, credentials or draft files entering it.
export const CHESS_FILES = Object.freeze([
  "about.html",
  "academy-sw.js",
  "academy.webmanifest",
  "chess-extras/community.css",
  "chess-extras/community.html",
  "chess-extras/community.js",
  "chess-extras/index.html",
  "chess-extras/live-board.js",
  "chess-extras/openings.js",
  "chess-extras/study-core.js",
  "chess-extras/study.css",
  "chess-extras/study.js",
  "chess-extras/watch.css",
  "chess-extras/watch.html",
  "chess-extras/watch.js",
  "david.html",
  "index.html",
  "lib/chess-core.js",
  "lib/practice-clock.js",
  "lib/workshop-core.js",
  "public/about.html",
  "public/academy-lab.js",
  "public/app.css",
  "public/app.js",
  "public/auth-config.js",
  "public/auth.css",
  "public/auth.js",
  "public/club-features.js",
  "public/club-shell.js",
  "public/club-theme.css",
  "public/club-tools.js",
  "public/comfort.js",
  "public/endgame-sparring.js",
  "public/queen.svg",
  "public/repertoire.js",
  "public/style-studio.js",
  "public/training.js",
  "public/workshop.js"
]);
const internalCard = /<a\b[^>]*href=["']chess-academy\/["'][^>]*>[\s\S]*?<\/a>/g;
const externalCard = /<a\b[^>]*href=["']https:\/\/davidolufunmilayo1-blip\.github\.io\/advaced-chess-academy\/["'][^>]*>[\s\S]*?<\/a>/g;
export async function includePublishedChess({sourceRoot=join(ROOT,'public-site'), outputRoot=join(ROOT,'.cloudflare/public-demo')}={}) {
  const sourceChooser=await readFile(join(sourceRoot,'games/index.html'),'utf8');
  const publishedCards=[...sourceChooser.matchAll(internalCard)];
  if(publishedCards.length!==1)throw Error('Expected one published internal Chess Academy card.');
  const chooserPath=join(outputRoot,'games/index.html'),chooser=await readFile(chooserPath,'utf8');
  const oldCards=[...chooser.matchAll(externalCard)],localCards=[...chooser.matchAll(internalCard)];
  if(oldCards.length+localCards.length!==1)throw Error('Expected one Chess Academy destination in the generated chooser.');
  const updated=chooser.replace(oldCards.length?externalCard:internalCard,()=>publishedCards[0][0]);
  const assets=await Promise.all(CHESS_FILES.map(async path=>{const file=join(sourceRoot,'games/chess-academy',path);if(!(await lstat(file)).isFile())throw Error('Chess assets must be regular files: '+path);return [path,await readFile(file)]}));
  for(const [path,data] of assets){const file=join(outputRoot,'games/chess-academy',path);await mkdir(dirname(file),{recursive:true});await writeFile(file,data)}
  await writeFile(chooserPath,updated);
  return assets.length;
}
if(process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href){
  console.log('Included '+await includePublishedChess()+' published Chess Academy files in the Pages artifact.');
}
