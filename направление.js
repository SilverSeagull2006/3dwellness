/* Общий движок страницы направления.

   Все восемь C устроены одинаково: заголовок, строка состояния и три яруса
   глубины с карточками инструментов. Раскрыт тот ярус, который подходит под
   сегодняшнее состояние; остальные свёрнуты, но открываются одним касанием —
   ничего не заблокировано.

   Страница направления сама почти пустая: подключает этот файл и зовёт
   renderDirection("pokoy"). */

var PLANKEY="3dw_plan_v1";
var DIMBLOCK="3D · психика";
var USAGEKEY="3dw_tool_usage";

function loadPlanArr(){
  try{ var raw=localStorage.getItem(PLANKEY); var p=raw?JSON.parse(raw):[[],[],[]]; if(!p[2]) p[2]=[]; return p; }
  catch(_){ return [[],[],[]]; }
}
function isInPlan(name){
  return loadPlanArr()[2].some(function(it){ return it.t===name; });
}
function togglePlan(name){
  var p=loadPlanArr();
  var i=p[2].findIndex(function(it){ return it.t===name; });
  if(i>=0){ p[2].splice(i,1); localStorage.setItem(PLANKEY,JSON.stringify(p)); return false; }
  p[2].push({t:name, form:"", dose:"", time:"", beauty:false, anchor:false, source:{block:DIMBLOCK, kind:"dir"}});
  localStorage.setItem(PLANKEY,JSON.stringify(p));
  return true;
}
function loadUsage(){ try{ var r=localStorage.getItem(USAGEKEY); return r?JSON.parse(r):{}; }catch(_){ return {}; } }
function markUsedToday(name){
  var u=loadUsage(), today=new Date().toISOString().slice(0,10);
  if(!u[name]) u[name]=[];
  if(u[name].indexOf(today)<0) u[name].push(today);
  try{ localStorage.setItem(USAGEKEY, JSON.stringify(u)); }catch(_){}
}
function usageCount(name){ return (loadUsage()[name]||[]).length; }

/* какой ярус раскрыть: под сегодняшнее состояние.
   без отметки состояния открываем верхний — он всем подходит */
function defaultTier(){
  var s=(typeof stateToday==="function") ? stateToday() : null;
  if(!s) return 1;
  if(s.id==="drowning" || s.id==="storm") return 1;
  if(s.id==="calmflat") return 2;
  return 3;
}

function dirById(id){
  for(var i=0;i<DIRECTIONS.length;i++){ if(DIRECTIONS[i].id===id) return DIRECTIONS[i]; }
  return null;
}

/* строка состояния. если направление сегодня приглушено — говорим об этом
   прямо, но не прячем: человек сам решает, нужно ему это или нет */
function renderDirState(dirId){
  var box=document.getElementById("stateLine");
  if(!box) return;
  var s=(typeof stateToday==="function") ? stateToday() : null;
  if(!s){ box.textContent=""; box.style.display="none"; return; }
  box.style.display="";
  var d=dirById(dirId);
  var extra="";
  if(s.dim.indexOf(dirId)>=0 && d){
    extra=" «"+d.t.toLowerCase()+"» сегодня, скорее всего, не то, что нужно, — но всё тут, если пригодится.";
  }
  box.textContent="сегодня "+s.t+". "+s.line+extra;
}

function renderTiers(dirId){
  var host=document.getElementById("tiersHost");
  var tools=DIR_TOOLS[dirId]||[];
  var openT=defaultTier();
  host.innerHTML="";

  TIERS.forEach(function(t){
    var list=tools.filter(function(x){ return x.tier===t.n; });
    if(!list.length) return;

    var wrap=document.createElement("div");
    wrap.className="tier"+(t.n===openT?" open":"");

    var head=document.createElement("div");
    head.className="tierhead";
    head.setAttribute("role","button");
    head.setAttribute("tabindex","0");
    head.innerHTML='<div><div class="tiername">'+t.t+'</div><div class="tierwhen">'+t.d+'</div></div>'
      +'<span class="tierarrow">▾</span>';
    function toggle(){ wrap.classList.toggle("open"); }
    head.addEventListener("click", toggle);
    head.addEventListener("keydown", function(e){
      if(e.key==="Enter"||e.key===" "){ e.preventDefault(); toggle(); }
    });
    wrap.appendChild(head);

    var body=document.createElement("div");
    body.className="tierbody";

    list.forEach(function(tool){
      var on=isInPlan(tool.name), uses=usageCount(tool.name);
      var card=document.createElement("div");
      card.className="card";
      var noteHtml=tool.note ? '<br><br>'+tool.note : '';
      card.innerHTML=
        '<div class="toolhead"><div><div class="toolname">'+tool.name+'</div>'
        +'<div class="toolshort">'+tool.short+'</div></div>'
        +'<button class="addbtn'+(on?' on':'')+'">'+(on?"✓ в моём дне":"+ мой день")+'</button></div>'
        +'<button class="whybtn">почему и как ↓</button>'
        +'<div class="toolwhy">'+tool.why+noteHtml+'<ol>'
        + tool.steps.map(function(s){ return '<li>'+s+'</li>'; }).join('')
        +'</ol></div>'
        +'<button class="btn" style="margin-top:10px">сделано сегодня'+(uses?' ('+uses+')':'')+'</button>';

      var addBtn=card.querySelector(".addbtn");
      addBtn.addEventListener("click", function(){
        var nowOn=togglePlan(tool.name);
        addBtn.classList.toggle("on", nowOn);
        addBtn.textContent = nowOn ? "✓ в моём дне" : "+ мой день";
      });
      var whyBtn=card.querySelector(".whybtn");
      whyBtn.addEventListener("click", function(){
        var w=card.querySelector(".toolwhy");
        var open=w.classList.toggle("open");
        whyBtn.textContent = open ? "почему и как ↑" : "почему и как ↓";
      });
      card.querySelector(".btn").addEventListener("click", function(){
        markUsedToday(tool.name);
        renderTiers(dirId);
      });

      body.appendChild(card);
    });

    wrap.appendChild(body);
    host.appendChild(wrap);
  });
}

function renderDirection(dirId){
  var d=dirById(dirId);
  if(d){
    var c=document.querySelector(".cname"), h=document.querySelector("h1"), l=document.querySelector(".lead");
    if(c) c.textContent=d.c;
    if(h) h.textContent=d.t;
    if(l && !l.textContent.trim()) l.textContent=d.d;
  }
  renderDirState(dirId);
  renderTiers(dirId);
  try{ if(window.Telegram && Telegram.WebApp){ Telegram.WebApp.ready(); Telegram.WebApp.expand(); } }catch(e){}
}
