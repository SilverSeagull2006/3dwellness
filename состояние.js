/* Состояние дня — две оси: сколько сил и накрывает ли.

   Спрашиваем ОДИН раз, в «Моём дне». Все остальные экраны только читают,
   переспрашивать нельзя: человек не должен отвечать на один вопрос трижды за заход.

   Из двух осей получаются четыре состояния, и они решают не оформление,
   а что вообще показывать наверху:

                 накрывает        не накрывает
   силы есть     шторм            ход
   сил нет       тонешь           штиль

   Правило порядка живёт здесь и только здесь. Страницы спрашивают
   stateToday() и раскладывают карточки, ничего не вычисляя сами. */

var STATE_EKEY_PREFIX = "3dw_energy_";   /* low | mid | high — уже пишется в index.html */
var STATE_FKEY_PREFIX = "3dw_flood_";    /* yes | no */

function stateDayKey(prefix){
  return prefix + new Date().toISOString().slice(0,10);
}
function stateEnergy(){
  try{ return localStorage.getItem(stateDayKey(STATE_EKEY_PREFIX)) || null; }catch(_){ return null; }
}
function stateFlood(){
  try{
    var v = localStorage.getItem(stateDayKey(STATE_FKEY_PREFIX));
    return v === "yes" ? true : (v === "no" ? false : null);
  }catch(_){ return null; }
}
function stateSetFlood(v){
  try{ localStorage.setItem(stateDayKey(STATE_FKEY_PREFIX), v ? "yes" : "no"); }catch(_){}
}

/* восемь направлений — те самые восемь C из IFS.
   Английское слово держим на виду: по отдельности это просто восемь хороших
   слов, а вместе — набор, и терять это не хочется.
   c — как в оригинале, t — как называем по-русски. */
var DIRECTIONS = [
  {id:"pokoy",       c:"Calm",          t:"Покой",      d:"сбросить накал",                     href:"покой.html",      built:true},
  {id:"interes",     c:"Curiosity",     t:"Интерес",    d:"хотеть, замечать, наполняться",      href:"интерес.html",    built:false},
  {id:"sochuvstvie", c:"Compassion",    t:"Сочувствие", d:"к себе, как к близкому",             href:"сочувствие.html", built:false},
  {id:"yasnost",     c:"Clarity",       t:"Ясность",    d:"видеть, что происходит",             href:"ясность.html",    built:false},
  {id:"smelost",     c:"Courage",       t:"Смелость",   d:"двинуться, не дожидаясь настроения", href:"смелость.html",   built:false},
  {id:"opora",       c:"Confidence",    t:"Опора",      d:"на что можно встать",                href:"опора.html",      built:false},
  {id:"tvorchestvo", c:"Creativity",    t:"Творчество", d:"выразить без слов",                  href:"творчество.html", built:false},
  {id:"svyaz",       c:"Connectedness", t:"Связь",      d:"наружу, к людям",                    href:"связь.html",      built:false}
];

/* четыре состояния: что поднимаем наверх, что приглушаем.
   приглушить — значит опустить ниже и убавить контраст, НЕ отключить:
   мёртвых элементов в приложении быть не должно. */
var STATES = {
  drowning:{
    id:"drowning", t:"тонешь",
    line:"сегодня только пережить. ничего умственного, всё через тело.",
    up:["pokoy"],
    dim:["yasnost","smelost","opora","tvorchestvo","svyaz","interes","sochuvstvie"]
  },
  storm:{
    id:"storm", t:"шторм",
    line:"сначала сбавить, разбираться потом.",
    up:["pokoy","sochuvstvie","yasnost"],
    dim:["tvorchestvo","svyaz"]
  },
  calmflat:{
    id:"calmflat", t:"штиль",
    line:"бури нет, но и ветра нет. сейчас помогает не покой, а маленькое движение.",
    up:["smelost","interes","tvorchestvo"],
    dim:["pokoy"]
  },
  underway:{
    id:"underway", t:"ход",
    line:"хороший день, чтобы заглянуть поглубже.",
    up:[],
    dim:[]
  }
};

/* если человек ещё не отмечался — ничего не выдумываем и не подсовываем
   состояние по умолчанию, просто показываем всё поровну */
function stateToday(){
  var e = stateEnergy(), f = stateFlood();
  if(e === null && f === null) return null;
  var noPower = (e === "low");
  var flooded = (f === true);
  if(noPower && flooded)  return STATES.drowning;
  if(!noPower && flooded) return STATES.storm;
  if(noPower && !flooded) return STATES.calmflat;
  return STATES.underway;
}

/* порядок направлений под сегодняшнее состояние.
   возвращает тот же список, но отсортированный, с пометкой dim у приглушённых */
function directionsToday(){
  var s = stateToday();
  if(!s) return DIRECTIONS.map(function(d){ return {d:d, dim:false}; });
  var rank = function(d){
    if(s.up.indexOf(d.id) >= 0) return 0;
    if(s.dim.indexOf(d.id) >= 0) return 2;
    return 1;
  };
  return DIRECTIONS
    .map(function(d){ return {d:d, dim:rank(d) === 2, r:rank(d)}; })
    .sort(function(a,b){ return a.r - b.r; });
}
