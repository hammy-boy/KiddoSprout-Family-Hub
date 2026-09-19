package blocker

const controlPageHTML = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>KiddoSprout Blocker</title>
  <style>
    *{box-sizing:border-box} :root{font-family:Inter,"Segoe UI",sans-serif;color:#172232;background:#effaf7}
    body{margin:0;min-height:100vh;padding:24px;background:radial-gradient(circle at 8% 4%,#ffe6a4 0,transparent 28%),radial-gradient(circle at 94% 7%,#a9eee3 0,transparent 30%),linear-gradient(145deg,#f8fff9,#edf8ff 54%,#fff9ea)}
    main{width:min(980px,100%);margin:auto}.hero,.card{border:1px solid #cfe2dc;border-radius:24px;background:#ffffffeb;box-shadow:0 18px 45px #1d41451a}
    .hero{display:flex;gap:18px;align-items:center;padding:28px;color:white;background:linear-gradient(135deg,#0f696e,#238f8a 55%,#62ae55)}
    .mark{display:grid;place-items:center;width:76px;height:76px;border:2px solid #ffffff70;border-radius:22px;background:#ffffff20;font-size:24px;font-weight:950}.hero h1{margin:0 0 5px;font-size:clamp(32px,6vw,56px);line-height:1}.hero p{margin:0;color:#efffff}
    .notice{margin:16px 0;padding:14px 18px;border:1px solid #e7d79a;border-radius:16px;background:#fff8df;color:#655629;font-weight:700}.grid{display:grid;grid-template-columns:1fr 1fr;gap:16px}.card{padding:22px}.wide{grid-column:1/-1}
    h2{margin:0 0 8px;font-size:25px}h3{margin:18px 0 8px}.muted{color:#617185;line-height:1.45}.status{display:inline-flex;margin:8px 0 16px;padding:8px 12px;border-radius:999px;background:#e4f6ef;color:#12684e;font-weight:900}.status.paused{background:#fff0db;color:#8a5220}
    form{display:grid;gap:9px;margin-top:12px}label{font-size:13px;font-weight:850;color:#35475b}input{width:100%;min-height:48px;border:2px solid #d5e2de;border-radius:13px;padding:0 13px;background:#fbfdfc;font:inherit;font-weight:750}input:focus{border-color:#168b86;outline:3px solid #168b8620}
    .row{display:flex;gap:9px;flex-wrap:wrap}button{min-height:45px;border:0;border-radius:13px;padding:0 16px;color:white;background:#168b86;cursor:pointer;font:inherit;font-weight:900}button.secondary{color:#173445;background:#edf3f1;border:1px solid #cbdad5}button.warning{background:#d56548}button:disabled{opacity:.5;cursor:not-allowed}
    .rules{display:grid;gap:8px;margin:12px 0}.rule{display:flex;justify-content:space-between;align-items:center;gap:12px;border:1px solid #dbe7e3;border-radius:13px;padding:10px 12px;background:#f9fcfb}.rule code{font-size:14px}.rule button{min-height:36px}
    .message{min-height:24px;margin:16px 0 0;font-weight:850}.message.error{color:#bd3e31}.message.success{color:#13734a}.hidden{display:none!important}ol{padding-left:23px;color:#52657a;line-height:1.55}code.path{display:block;overflow-wrap:anywhere;border-radius:10px;padding:10px;background:#eef5f3}
    @media(max-width:720px){body{padding:12px}.grid{grid-template-columns:1fr}.wide{grid-column:auto}.hero{align-items:flex-start;flex-direction:column}.card{padding:18px}}
  </style>
</head>
<body>
<main>
  <header class="hero"><div class="mark">KS</div><div><h1>KiddoSprout Blocker</h1><p>Current-user Windows colleague test</p></div></header>
  <p class="notice">This unsigned tester helps with detected games on this Windows account. It is not tamper-proof, cannot identify every game, and a user can stop or remove it.</p>
  <div class="grid">
    <section class="card">
      <h2>Protection</h2><div id="protection-status" class="status paused">Checking…</div>
      <p id="last-blocked" class="muted">Known launchers and games in common library folders are watched.</p>
      <p id="runtime-warning" class="notice runtime-warning hidden" role="alert"></p>
      <div id="start-controls" class="row"><button id="start" type="button">Start Protection</button></div>
      <form id="pause-form"><label for="pause-pin">Parent PIN to pause</label><input id="pause-pin" type="password" inputmode="numeric" autocomplete="off" minlength="4" required><button class="warning" type="submit">Pause Protection</button></form>
    </section>
    <section class="card" id="create-pin-card">
      <h2>Create parent PIN</h2><p class="muted">Choose 4–8 digits. Protection starts when the PIN is saved.</p>
      <form id="create-pin-form"><label for="new-pin">New PIN</label><input id="new-pin" type="password" inputmode="numeric" autocomplete="new-password" minlength="4" required><label for="confirm-pin">Confirm PIN</label><input id="confirm-pin" type="password" inputmode="numeric" autocomplete="new-password" minlength="4" required><button type="submit">Save PIN &amp; Start</button></form>
    </section>
    <section class="card hidden" id="change-pin-card">
      <h2>Change parent PIN</h2>
      <form id="change-pin-form"><label for="current-pin">Current PIN</label><input id="current-pin" type="password" inputmode="numeric" autocomplete="current-password" required><label for="replacement-pin">New 4–8 digit PIN</label><input id="replacement-pin" type="password" inputmode="numeric" autocomplete="new-password" required><label for="replacement-confirmation">Confirm new PIN</label><input id="replacement-confirmation" type="password" inputmode="numeric" autocomplete="new-password" required><button type="submit">Change PIN</button></form>
    </section>
    <section class="card wide hidden" id="rules-card">
      <h2>Manual app rules</h2><p class="muted">Add an exact Windows filename such as <strong>ExampleGame.exe</strong>. KiddoSprout refuses core Windows, Microsoft Defender, common browser, and its own processes.</p>
      <div class="rules" id="rules"></div>
      <form id="add-rule-form"><label for="executable-name">Exact executable name</label><input id="executable-name" type="text" maxlength="128" placeholder="ExampleGame.exe" required><label for="rule-pin">Parent PIN</label><input id="rule-pin" type="password" inputmode="numeric" autocomplete="off" required><button type="submit">Add Manual Block</button></form>
    </section>
    <section class="card wide">
      <h2>Website game protection</h2><p class="muted">Chrome and Edge require one visible extension-install step. KiddoSprout does not secretly change browser policy.</p>
      <ol><li>Select <strong>Open Extension Folder</strong>.</li><li>Open <strong>chrome://extensions</strong> or <strong>edge://extensions</strong>.</li><li>Turn on Developer mode, choose <strong>Load unpacked</strong>, and select that folder.</li></ol>
      <code class="path" id="extension-path">Checking extension folder…</code><p><button id="open-extension" type="button">Open Extension Folder</button></p>
    </section>
    <section class="card wide hidden" id="advanced-card">
      <h2>Quit or uninstall</h2><p class="muted">Both actions need the parent PIN. Quitting leaves start-at-sign-in installed. Uninstall removes the current-user startup entry, settings, extension copy, and installed app files.</p>
      <form id="quit-form"><label for="quit-pin">Parent PIN</label><input id="quit-pin" type="password" inputmode="numeric" autocomplete="off" required><div class="row"><button class="secondary" type="submit">Quit Until Next Sign-in</button><button class="warning" id="uninstall" type="button">Uninstall Current-user Tester</button></div></form>
    </section>
  </div>
  <p id="message" class="message" role="status" aria-live="polite"></p>
</main>
<script nonce="__NONCE__">
(() => {
  "use strict";
  const csrf = "__CSRF__";
  const byId = id => document.getElementById(id);
  const pendingForms = new WeakSet();
  let state = null;
  function message(text, error=false){const box=byId("message");box.textContent=text||"";box.className="message "+(error?"error":"success")}
  function cleanPIN(input){input.value=input.value.replace(/\s/g,"")}
  document.querySelectorAll('input[inputmode="numeric"]').forEach(input=>input.addEventListener("input",()=>cleanPIN(input)));
  async function api(path, body){
    const response=await fetch(path,{method:"POST",credentials:"same-origin",headers:{"Content-Type":"application/json","X-KiddoSprout-CSRF":csrf},body:JSON.stringify(body||{}),cache:"no-store"});
    const payload=await response.json().catch(()=>({error:"KiddoSprout could not read that response."}));
    if(!response.ok)throw new Error(payload.error||"That action could not be completed.");return payload;
  }
  function renderRules(names){const list=byId("rules");list.replaceChildren();if(!names.length){const empty=document.createElement("p");empty.className="muted";empty.textContent="No manual rules yet.";list.append(empty);return}names.forEach(name=>{const row=document.createElement("div");row.className="rule";const code=document.createElement("code");code.textContent=name;const remove=document.createElement("button");remove.type="button";remove.className="warning";remove.textContent="Remove";remove.addEventListener("click",async()=>{const pin=byId("rule-pin").value;if(!pin){message("Enter the parent PIN below before removing a rule.",true);byId("rule-pin").focus();return}try{message((await api("/api/rules/remove",{pin,executableName:name})).message);byId("rule-pin").value="";await refresh()}catch(error){message(error.message,true)}});row.append(code,remove);list.append(row)})}
  async function refresh(){const response=await fetch("/api/status",{credentials:"same-origin",cache:"no-store"});if(!response.ok)throw new Error("Status could not be loaded.");state=await response.json();const runtime=state.runtime||{};const configured=state.pinConfigured;byId("create-pin-card").classList.toggle("hidden",configured);byId("change-pin-card").classList.toggle("hidden",!configured);byId("rules-card").classList.toggle("hidden",!configured);byId("advanced-card").classList.toggle("hidden",!configured);byId("pause-form").classList.toggle("hidden",!configured||!state.enabled);byId("start-controls").classList.toggle("hidden",!configured||state.enabled);const status=byId("protection-status");status.textContent=state.enabled?"Protection is on":"Protection is paused";status.classList.toggle("paused",!state.enabled);byId("extension-path").textContent=runtime.extensionFolder||"Extension folder is unavailable.";byId("last-blocked").textContent=runtime.lastBlockedName?("Last blocked: "+runtime.lastBlockedName):"Known launchers and games in common library folders are watched.";const runtimeWarning=byId("runtime-warning");const warnings=[runtime.startupWarning,runtime.lastError].filter(value=>typeof value==="string"&&value.trim());runtimeWarning.textContent=warnings.join(" ");runtimeWarning.classList.toggle("hidden",warnings.length===0);renderRules(state.manualExecutableNames||[])}
  async function submit(form,path,body,refreshAfter=true){if(pendingForms.has(form))return;pendingForms.add(form);const controls=[...form.querySelectorAll("button,input")].map(control=>[control,control.disabled]);controls.forEach(([control])=>{control.disabled=true});form.setAttribute("aria-busy","true");try{message((await api(path,body)).message);form.reset();if(refreshAfter)await refresh()}catch(error){message(error.message,true)}finally{form.setAttribute("aria-busy","false");controls.forEach(([control,disabled])=>{control.disabled=disabled});pendingForms.delete(form)}}
  byId("create-pin-form").addEventListener("submit",event=>{event.preventDefault();submit(event.currentTarget,"/api/pin/create",{pin:byId("new-pin").value,confirmation:byId("confirm-pin").value})});
  byId("change-pin-form").addEventListener("submit",event=>{event.preventDefault();submit(event.currentTarget,"/api/pin/change",{current:byId("current-pin").value,replacement:byId("replacement-pin").value,confirmation:byId("replacement-confirmation").value})});
  byId("pause-form").addEventListener("submit",event=>{event.preventDefault();submit(event.currentTarget,"/api/pause",{pin:byId("pause-pin").value})});
  byId("start").addEventListener("click",async()=>{try{message((await api("/api/start",{})).message);await refresh()}catch(error){message(error.message,true)}});
  byId("add-rule-form").addEventListener("submit",event=>{event.preventDefault();submit(event.currentTarget,"/api/rules/add",{pin:byId("rule-pin").value,executableName:byId("executable-name").value})});
  byId("open-extension").addEventListener("click",async()=>{try{message((await api("/api/open-extension",{})).message)}catch(error){message(error.message,true)}});
  byId("quit-form").addEventListener("submit",event=>{event.preventDefault();submit(event.currentTarget,"/api/quit",{pin:byId("quit-pin").value},false)});
  byId("uninstall").addEventListener("click",()=>{if(!confirm("Remove the KiddoSprout current-user tester from this Windows account?"))return;const form=byId("quit-form");submit(form,"/api/uninstall",{pin:byId("quit-pin").value},false)});
  refresh().catch(error=>message(error.message,true));
})();
</script>
</body>
</html>`
