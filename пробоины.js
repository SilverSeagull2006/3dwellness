/* Пробоины — что уносит силы.

   Два отдельных шага, и путать их нельзя: сначала просто заметить утечки
   (без оценки, без «надо с этим что-то делать»), потом уже разложить на
   три кучи. Если сразу лезть с решениями, человек либо ничего не отметит
   из тревоги «а что я тогда буду обязана делать», либо отметит и бросит.

   Хранится отдельно от плана дня — это диагностика, а не задачи. */

var LEAK_PICKKEY="3dw_leaks_picked";
var LEAK_SORTKEY="3dw_leaks_sort";

function leaksPicked(){
  try{ var r=localStorage.getItem(LEAK_PICKKEY); return r?JSON.parse(r):[]; }catch(_){ return []; }
}
function leaksSavePicked(list){
  try{ localStorage.setItem(LEAK_PICKKEY, JSON.stringify(list)); }catch(_){}
}
function leaksHasPicked(text){
  return leaksPicked().some(function(x){ return x.t===text; });
}
function leaksTogglePicked(text, cat){
  var list=leaksPicked();
  var i=list.findIndex(function(x){ return x.t===text; });
  if(i>=0){
    list.splice(i,1); leaksSavePicked(list);
    var sort=leaksSort(); delete sort[text]; leaksSaveSort(sort);
    return false;
  }
  list.push({t:text, cat:cat});
  leaksSavePicked(list);
  return true;
}

function leaksSort(){
  try{ var r=localStorage.getItem(LEAK_SORTKEY); return r?JSON.parse(r):{}; }catch(_){ return {}; }
}
function leaksSaveSort(map){
  try{ localStorage.setItem(LEAK_SORTKEY, JSON.stringify(map)); }catch(_){}
}
function leaksSetPile(text, pileId){
  var m=leaksSort();
  m[text]=pileId;
  leaksSaveSort(m);
}
function leaksUnsortedCount(){
  var picked=leaksPicked(), sort=leaksSort();
  return picked.filter(function(x){ return !sort[x.t]; }).length;
}
