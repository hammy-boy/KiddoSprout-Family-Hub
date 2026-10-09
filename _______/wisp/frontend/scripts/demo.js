// This demo has no Auth client, network, media, or live-contact dependency.
const KEY = 'wisp-fictional-demo-v1';
const contacts = [
  { id: 'parent', name: 'Demo Parent', greeting: 'Hello! This is a fictional family conversation.', reply: 'Scripted demo reply: thanks for checking in! No real person received your message.' },
  { id: 'friend', name: 'Demo Friend', greeting: 'Shall we practise a science quiz?', reply: 'Scripted demo reply: let’s explore mixtures and separation next!' },
  { id: 'study', name: 'Demo Study Buddy', greeting: 'What would you like to learn today?', reply: 'Scripted demo reply: take it one small step at a time. This contact is fictional.' }
];
const $ = id => document.getElementById(id);
let selected = 'parent';
let call = null;
function initial() { return Object.fromEntries(contacts.map(c => [c.id, [{ from: c.name, text: c.greeting }]])); }
let messages = initial();
try {
  const saved = JSON.parse(sessionStorage.getItem(KEY));
  if (saved && contacts.every(c => Array.isArray(saved[c.id]) && saved[c.id].length <= 80 && saved[c.id].every(m => typeof m.from === 'string' && typeof m.text === 'string' && m.text.length <= 600))) messages = saved;
} catch { /* Start fresh when storage is unavailable. */ }
function save() {
  try { sessionStorage.setItem(KEY, JSON.stringify(messages)); } catch { $('status').textContent = 'Storage is unavailable; this demo lasts until you leave the page.'; }
}
function bubble(m) {
  const el = document.createElement('article'); el.className = `message${m.from === 'You (demo)' ? ' mine' : ''}`;
  const name = document.createElement('strong'); name.textContent = m.from;
  const text = document.createElement('p'); text.textContent = m.text;
  el.append(name, text); return el;
}
function endCall(announce = true) { call = null; $('call-panel').hidden = true; if (announce) $('status').textContent = 'Simulation ended. No call was made.'; }
function select(id, focus = false) {
  selected = id; endCall(false);
  $('chat-title').textContent = contacts.find(c => c.id === id).name;
  $('messages').replaceChildren(...messages[id].map(bubble));
  document.querySelectorAll('.contact').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.id === id)));
  $('message').value = ''; $('status').textContent = '';
  if (focus) $('chat-title').focus();
}
for (const c of contacts) {
  const button = document.createElement('button'); button.type = 'button'; button.className = 'contact'; button.dataset.id = c.id; button.textContent = c.name;
  button.addEventListener('click', () => select(c.id, true)); $('contacts').append(button);
}
$('message-form').addEventListener('submit', e => {
  e.preventDefault(); const text = $('message').value.trim(); if (!text) return;
  if (messages[selected].length >= 80) { $('status').textContent = 'This conversation is full. Reset the demo to practise again.'; return; }
  const additions = [{ from: 'You (demo)', text: text.slice(0, 600) }, { from: contacts.find(c => c.id === selected).name, text: contacts.find(c => c.id === selected).reply }];
  messages[selected].push(...additions); additions.forEach(m => $('messages').append(bubble(m))); save();
  $('message').value = ''; $('message').focus(); $('messages').scrollTop = $('messages').scrollHeight;
  $('status').textContent = 'Demo message added. The reply is scripted.';
});
$('sample').addEventListener('click', () => { $('message').value = 'I finished my mixtures quiz. Can we practise together?'; $('message').focus(); });
function start(kind) {
  call = { kind, answered: false }; $('call-panel').hidden = false; $('answer').hidden = false; $('mute').disabled = true; $('mute').setAttribute('aria-pressed', 'false');
  $('call-state').textContent = `Simulated ${kind} call to ${contacts.find(c => c.id === selected).name}: ringing. No audio or video is used.`; $('answer').focus();
}
$('voice').addEventListener('click', () => start('voice'));
$('video').addEventListener('click', () => start('video'));
$('answer').addEventListener('click', () => { if (!call) return; call.answered = true; $('answer').hidden = true; $('mute').disabled = false; $('call-state').textContent = `Simulated ${call.kind} call connected. This is a silent simulation.`; $('mute').focus(); });
$('mute').addEventListener('click', () => { if (!call?.answered) return; const muted = $('mute').getAttribute('aria-pressed') !== 'true'; $('mute').setAttribute('aria-pressed', String(muted)); $('call-state').textContent = muted ? 'Simulation muted. No microphone is active.' : 'Simulation unmuted. No microphone is active.'; });
$('end').addEventListener('click', () => { endCall(); $('voice').focus(); });
$('reset').addEventListener('click', () => { messages = initial(); save(); select('parent'); $('status').textContent = 'Demo reset. Only the fictional Wisp conversations were cleared.'; });
select(selected);
