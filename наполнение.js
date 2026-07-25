/* Свой список наполнения.

   Хранится отдельно от плана дня: это не дела и не привычки, а то, из чего
   «Мой день» потом берёт два-три предложения. Ничего не считаем и не показываем
   статистику — как только появится «ты выбрала чай двенадцать раз», наполнение
   превратится в отчётность и работать перестанет.

   Формат записи: {t: текст, sec: 1|2|3, pick: сколько раз выбиралось}
   pick нужен только для того, чтобы подсовывать почаще то, что заходит,
   и молча. Наружу это число не показывается. */

var FILLKEY="3dw_fill_mine";

function fillMine(){
  try{ var r=localStorage.getItem(FILLKEY); return r ? JSON.parse(r) : []; }catch(_){ return []; }
}
function fillSave(list){
  try{ localStorage.setItem(FILLKEY, JSON.stringify(list)); }catch(_){}
}
function fillHas(text){
  return fillMine().some(function(x){ return x.t===text; });
}
function fillToggle(text, sec){
  var list=fillMine();
  var i=list.findIndex(function(x){ return x.t===text; });
  if(i>=0){ list.splice(i,1); fillSave(list); return false; }
  list.push({t:text, sec:sec||1, pick:0});
  fillSave(list);
  return true;
}
function fillBump(text){
  var list=fillMine();
  var it=list.find(function(x){ return x.t===text; });
  if(it){ it.pick=(it.pick||0)+1; fillSave(list); }
}

/* Что предложить сегодня.
   Держим сегодняшнюю тройку в памяти на день, чтобы она не прыгала при
   каждой перерисовке экрана. При нуле сил берём только самое короткое:
   предлагать прогулку человеку, который еле встал, — это способ
   заставить его почувствовать себя ещё хуже. */
var FILLDAYKEY="3dw_fill_today_";

function fillTodayKey(){ return FILLDAYKEY + new Date().toISOString().slice(0,10); }

function fillToday(n){
  n = n || 3;
  try{
    var saved=localStorage.getItem(fillTodayKey());
    if(saved){
      var arr=JSON.parse(saved);
      if(arr && arr.length) return arr;
    }
  }catch(_){}

  var list=fillMine();
  if(!list.length) return [];

  var s = (typeof stateToday==="function") ? stateToday() : null;
  var pool=list;
  if(s && (s.id==="drowning" || s.id==="calmflat")){
    var shortOnly=list.filter(function(x){ return (x.sec||1)===1; });
    if(shortOnly.length) pool=shortOnly;
  }

  /* то, что выбирают чаще, всплывает чаще — но не вытесняет остальное совсем */
  var weighted=pool.slice().sort(function(a,b){
    return ((b.pick||0)+Math.random()*2) - ((a.pick||0)+Math.random()*2);
  });

  var pickList=weighted.slice(0, Math.min(n, weighted.length)).map(function(x){ return x.t; });
  try{ localStorage.setItem(fillTodayKey(), JSON.stringify(pickList)); }catch(_){}
  return pickList;
}

/* «сегодня никак» — четвёртая всегда доступная кнопка.
   Отказ ничем не наказывается и никуда не записывается как провал:
   он просто убирает блок до завтра. */
var FILLSKIPKEY="3dw_fill_skip_";
function fillSkipped(){
  try{ return localStorage.getItem(FILLSKIPKEY+new Date().toISOString().slice(0,10))==="1"; }catch(_){ return false; }
}
function fillSkipToday(){
  try{ localStorage.setItem(FILLSKIPKEY+new Date().toISOString().slice(0,10),"1"); }catch(_){}
}

/* отметка «сделала» — только чтобы то, что заходит, предлагалось чаще */
var FILLDONEKEY="3dw_fill_done_";
function fillDoneToday(){
  try{ var r=localStorage.getItem(FILLDONEKEY+new Date().toISOString().slice(0,10)); return r?JSON.parse(r):[]; }
  catch(_){ return []; }
}
function fillMarkDone(text){
  var d=fillDoneToday();
  if(d.indexOf(text)<0) d.push(text);
  try{ localStorage.setItem(FILLDONEKEY+new Date().toISOString().slice(0,10), JSON.stringify(d)); }catch(_){}
  fillBump(text);
}
