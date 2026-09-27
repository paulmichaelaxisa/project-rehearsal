const SCENARIOS = [
  { id:"board", title:"Hostile board pack", mins:8, meeting:"Steering / board review", pressure:"CFO and sponsor have already decided the forecast is fiction.", cast:"Helen (CFO), Mark (Sponsor), Priya (Ops)", win:"Named decision and trade-off.", blurb:"8 minutes. They already think the forecast is fiction." },
  { id:"scope", title:"Drive-by scope from a top account", mins:8, meeting:"Stakeholder 1:1", pressure:"Sales VP: top customer needs X by quarter end.", cast:"Dana (Sales VP)", win:"Do not defend the roadmap. Surface trade-offs.", blurb:"Sales VP walks in with a million-dollar request." },
  { id:"owner", title:"Stand-up of we'll", mins:6, meeting:"Daily stand-up", pressure:"Every action is we'll.", cast:"Alex, Jamie, Pat", win:"Every action has one name.", blurb:"6 minutes. Nobody owns the hand-off." },
  { id:"risk", title:"Risk that never made the RAID", mins:8, meeting:"Steering committee", pressure:"Pack is green. Room is not.", cast:"Chair, vendor manager, tech lead", win:"Name the risk without torching trust.", blurb:"The pack is green. The room is not." },
  { id:"resource", title:"We don't have resources", mins:8, meeting:"Planning with a VP", pressure:"No resources means fear of missed commitments.", cast:"VP Engineering", win:"Ask what they are committed to this quarter first.", blurb:"Logic will not save you. Their quarter will." }
];
const state = { view:"home", tab:"tap", artefacts:"", scenario:null, messages:[], pending:false, error:"", remaining:0, timerId:null, lastText:"" };
const $ = (s) => document.querySelector(s);
const app = document.getElementById("app");
function render(){ if(state.view==="sim") return renderSim(); if(state.view==="debrief") return renderDebrief(); renderHome(); }
function renderHome(){
  app.innerHTML = `<div class="wrap"><header class="top"><div class="kicker">Project Rehearsal</div><h1>Fail in here.<br/>Not in steering.</h1><p class="lead">Skip the wizard. Tap a room, or paste the pack.</p></header><div class="tabs"><button class="tab ${state.tab==="tap"?"on":""}" data-tab="tap">One-tap</button><button class="tab ${state.tab==="paste"?"on":""}" data-tab="paste">Paste artefacts</button></div>${state.error?`<div class="err">${escapeHtml(state.error)}</div>`:""}${state.tab==="tap"?renderTaps():renderPaste()}</div>`;
  app.querySelectorAll("[data-tab]").forEach(b=>b.onclick=()=>{state.tab=b.dataset.tab;render();});
  app.querySelectorAll("[data-start]").forEach(b=>b.onclick=()=>startScenario(b.dataset.start));
  const go=app.querySelector("[data-paste-go]"); if(go){ go.onclick=startFromPaste; app.querySelector("textarea").oninput=e=>state.artefacts=e.target.value; }
}
function renderTaps(){ return `<div class="list">${SCENARIOS.map(s=>`<button class="card" data-start="${s.id}"><h2>${s.title}</h2><div class="meta">${s.blurb}</div><div class="row"><span class="pill">${s.mins} min</span><span class="meta">${s.meeting}</span></div></button>`).join("")}</div>`; }
function renderPaste(){ return `<div class="paste"><textarea placeholder="Paste agenda, RAID, Slack, Jira, last email…">${escapeHtml(state.artefacts)}</textarea><p class="hint">We infer the meeting and what they will attack.</p><button class="cta" data-paste-go>Rehearse from this pack</button></div>`; }
function renderSim(){
  const s=state.scenario; const mm=String(Math.floor(state.remaining/60)).padStart(2,"0"); const ss=String(state.remaining%60).padStart(2,"0");
  app.innerHTML=`<div class="sim"><div class="simhead"><button class="back" id="exit">Exit</button><div><div class="kicker">${s.meeting}</div><h1>${s.title}</h1></div><div class="timer" id="clock">${mm}:${ss}</div></div><div class="thread" id="thread">${state.messages.filter(m=>m.role!=="system").map(m=>`<div class="bubble ${m.role==="user"?"me":"them"}">${escapeHtml(m.content)}</div>`).join("")}${state.pending?`<div class="sys">Room is thinking…</div>`:""}</div><div class="composer">${state.error?`<div class="err">${escapeHtml(state.error)}</div>`:""}<textarea id="say" placeholder="Your line in the room…" ${state.pending?"disabled":""}></textarea><div class="actions"><button class="cta" id="send" ${state.pending?"disabled":""}>Say it</button><button class="ghost" id="debrief">Debrief</button></div></div></div>`;
  $("#exit").onclick=()=>{stopTimer();state.view="home";render();};
  $("#send").onclick=sendLine; $("#debrief").onclick=()=>sendLine("/debrief");
  $("#say").addEventListener("keydown",e=>{ if(e.key==="Enter"&&!e.shiftKey){e.preventDefault();sendLine();}});
  const th=$("#thread"); th.scrollTop=th.scrollHeight;
}
function renderDebrief(){ app.innerHTML=`<div class="wrap debrief"><div class="kicker">After the room</div><h2>Debrief</h2><div class="md">${escapeHtml(state.lastText)}</div><p></p><button class="cta" id="again">Rehearse another</button></div>`; $("#again").onclick=()=>{state.view="home";state.messages=[];render();}; }
function startScenario(id){ begin(SCENARIOS.find(x=>x.id===id), state.artefacts); }
function startFromPaste(){ if(!state.artefacts.trim()){state.error="Paste an artefact first.";render();return;} begin({id:"custom",title:"From your artefacts",mins:8,meeting:"Inferred",pressure:"Ground attacks in the paste.",cast:"Infer from artefacts",win:"Named decision and owner."}, state.artefacts); }
function begin(scenario, artefacts){ state.scenario=scenario; state.artefacts=artefacts||""; state.messages=[]; state.error=""; state.view="sim"; state.pending=true; state.remaining=(scenario.mins||8)*60; startTimer(); render(); callApi([]).then(text=>{ state.messages.push({role:"assistant",content:text}); state.lastText=text; state.pending=false; render(); }); }
async function sendLine(forced){ const ta=$("#say"); const text=typeof forced==="string"?forced:(ta&&ta.value.trim())||""; if(!text||state.pending) return; state.messages.push({role:"user",content:text}); state.pending=true; state.error=""; render(); const reply=await callApi(state.messages); state.messages.push({role:"assistant",content:reply}); state.lastText=reply; state.pending=false; if(text==="/debrief"||/^##\s*Debrief/i.test(reply)||state.remaining<=0){ stopTimer(); state.view="debrief"; } render(); }
async function callApi(messages){ try{ const r=await fetch("/api/chat",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({messages,scenario:state.scenario,artefacts:state.artefacts,timebox:state.scenario?.mins})}); const data=await r.json(); if(!r.ok){state.error=data.error||"Model error"; return data.error||"The room dropped.";} return data.text; } catch(e){ state.error=String(e.message||e); return "Could not reach the rehearsal server."; } }
function startTimer(){ stopTimer(); state.timerId=setInterval(()=>{ state.remaining=Math.max(0,state.remaining-1); const el=document.getElementById("clock"); if(el){ const mm=String(Math.floor(state.remaining/60)).padStart(2,"0"); const ss=String(state.remaining%60).padStart(2,"0"); el.textContent=`${mm}:${ss}`; } if(state.remaining===0){ stopTimer(); if(!state.pending) sendLine("/debrief"); } },1000); }
function stopTimer(){ if(state.timerId) clearInterval(state.timerId); state.timerId=null; }
function escapeHtml(s){ return String(s||"").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;"); }
render();
