/* Проверка библиотеки анализов на ложные совпадения названий.
   Запуск:  node проверка-анализов.js

   Зачем: в лабораторных названиях сплошь и рядом общий корень при совершенно разном смысле —
   «Гемоглобин» (г/л, анемия) и «Гликированный гемоглобин HbA1c» (%, сахар), «Кальций общий» и
   «ионизированный», «Тестостерон общий» и «свободный», «Альбумин» и «Микроальбумин мочи».
   Если сопоставлять названия по вхождению подстроки, приложение засчитывает один анализ за другой
   и может показать красное «повышено» по анализу, который человек не сдавал.

   Скрипт падает с кодом 1, если:
     1) два разных анализа из библиотеки засчитываются друг за друга,
     2) строка рекомендации распадается на анализы, которых в ней нет по смыслу,
     3) у анализа с числовым диапазоном не указана единица измерения.
   Добавили новый анализ — прогоните этот скрипт. */

const fs = require('fs');
const vm = require('vm');
const path = require('path');

const src = fs.readFileSync(path.join(__dirname, 'опросник-данные.js'), 'utf8');
const ctx = { console, localStorage: { getItem: () => null, setItem: () => {} } };
vm.createContext(ctx);
/* const/let из скрипта не попадают в объект контекста — выносим нужное явно */
vm.runInContext(src + '\nglobalThis.__api={LABTESTS,LABRANGES,RECS,CYCLE_REFERENCE,labNameMatches,labCoversLine,labStatus,findLabMatches,interpretLabValue};', ctx);

const { LABTESTS, LABRANGES, RECS, CYCLE_REFERENCE, labNameMatches, labCoversLine, labStatus, findLabMatches, interpretLabValue } = ctx.__api;

let errors = 0;
const fail = (msg) => { errors++; console.log('  ✗ ' + msg); };

/* --- 1. ни один анализ не должен засчитываться за другой --- */
console.log('1. взаимные ложные совпадения названий');
const names = [...new Set(LABTESTS)];
let collisions = 0;
names.forEach(entered => {
  names.forEach(other => {
    if (entered === other) return;
    if (labNameMatches(other, entered)) {
      collisions++;
      fail('внесён «' + entered + '» → засчитывается как «' + other + '»');
    }
  });
});
if (!collisions) console.log('  ✓ чисто (' + names.length + ' анализов, ' + (names.length * (names.length - 1)) + ' пар)');

/* --- 2. разбор составных строк рекомендаций --- */
console.log('');
console.log('2. разбор составных строк на атомарные анализы');
/* строка → анализы, которых в ней быть не должно (проверяем самые опасные случаи явно) */
const MUST_NOT = {
  'Гликированный гемоглобин (HbA1c)': ['Гемоглобин'],
  'СРБ высокочувствительный (hs-CRP)': ['СРБ (С-реактивный белок)'],
  'Микроальбумин мочи / uACR (ранний маркер поражения почек)': ['Альбумин', 'Креатинин']
};
let split = 0;
Object.keys(MUST_NOT).forEach(line => {
  const got = findLabMatches(line);
  MUST_NOT[line].forEach(bad => {
    if (got.indexOf(bad) !== -1) { split++; fail('«' + line + '» ошибочно распадается на «' + bad + '»'); }
  });
});
/* каждая строка рекомендаций должна распадаться хотя бы во что-то осмысленное или ни во что */
RECS.forEach((r, i) => {
  r.labs.forEach(l => {
    const got = findLabMatches(l);
    got.forEach(k => {
      if (!LABRANGES[k] && !CYCLE_REFERENCE[k]) { split++; fail('блок ' + i + ': «' + l + '» → неизвестный ключ «' + k + '»'); }
    });
  });
});
if (!split) console.log('  ✓ чисто');

/* --- 3. панель закрывает свои составляющие, но не приписывает им своё значение --- */
console.log('');
console.log('3. панели анализов');
let panels = 0;
const ЛИПИД = 'Липидограмма (холестерин, ЛПНП, ЛПВП, триглицериды)';
if (!labCoversLine(ЛИПИД, 'ЛПНП')) { panels++; fail('сданная липидограмма не засчитывает ЛПНП'); }
if (labCoversLine('ЛПНП', ЛИПИД)) { panels++; fail('сданный ЛПНП засчитывает всю липидограмму'); }
const stPanel = labStatus('ЛПНП', [{ name: ЛИПИД, value: '5.2', unit: 'ммоль/л', date: '2026-01-01' }], []);
if (stPanel.status !== 'done') { panels++; fail('липидограмма не закрывает строку ЛПНП'); }
if (stPanel.value != null) { panels++; fail('значение липидограммы приписывается конкретному показателю ЛПНП'); }
if (!panels) console.log('  ✓ чисто');

/* --- 4. у каждого числового диапазона есть единица, и без единицы вердикт не выносится --- */
console.log('');
console.log('4. единицы измерения');
let units = 0;
Object.keys(LABRANGES).forEach(k => {
  // безразмерные показатели (индексы вроде HOMA-IR) помечаются явно
  if (!LABRANGES[k].unit && !LABRANGES[k].unitless) { units++; fail('«' + k + '» — есть диапазон, но не указана единица'); }
});
const noUnit = interpretLabValue('Гликированный гемоглобин (HbA1c)', '135', '', 'f', '35');
if (!noUnit || !noUnit.needUnit) {
  units++;
  fail('значение без единиц интерпретируется как вердикт — так гемоглобин 135 г/л превращается в «HbA1c повышено»');
}
const wrongUnit = interpretLabValue('Гликированный гемоглобин (HbA1c)', '135', 'г/л', 'f', '35');
if (wrongUnit !== null) { units++; fail('значение в чужих единицах всё равно интерпретируется'); }
if (!units) console.log('  ✓ чисто');

console.log('');
if (errors) { console.log('ПРОВАЛЕНО: ' + errors + ' проблем(ы)'); process.exit(1); }
console.log('всё чисто');
