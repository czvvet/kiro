// Figma に取り込むための画面デザインを SVG で書き出すスクリプト
//   実行: shopping-log フォルダで  node design/make-svg.mjs
//   出力: design/svg/*.svg(Figma にドラッグ&ドロップすると、図形や文字を編集できる形で取り込める)
//
// 色・文字の大きさ・配置は src/App.css に合わせている。中のデータは見本。
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import * as Lucide from 'lucide-react'
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))
const OUT = join(here, 'svg')
mkdirSync(OUT, { recursive: true })

const W = 390
const H = 844
const C = {
  bg: '#fafbf7',
  text: '#283f36',
  sub: '#77837c',
  border: '#e8ece5',
  green: '#3f7961',
  greenLight: '#eaf2e8',
  white: '#ffffff',
  plan: '#e8913a',
  red: '#c9735a',
  warn: '#d9a441',
  warnText: '#b5852b',
}
const JP = 'Noto Sans JP'
const NUM = 'Inter'

// カテゴリごとのアイコンと色(src/App.jsx の CATEGORY_STYLE と同じ)
const CAT = {
  食費: ['ShoppingBasket', '#eaf2e8', '#3f7961'],
  日用品: ['Pill', '#fcf0ea', '#c9735a'],
  外食: ['Croissant', '#f6f1e6', '#a9823f'],
  衣類: ['Shirt', '#eef1f6', '#5a6f94'],
  趣味: ['Sparkles', '#f3eef6', '#86609a'],
  固定費: ['Landmark', '#e9f1f9', '#3b82c4'],
  その他: ['Package', '#f0f1ef', '#77837c'],
}

// ---------- 部品 ----------
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
const attrs = (o) =>
  Object.entries(o)
    .filter(([, v]) => v !== undefined && v !== null && v !== false)
    .map(([k, v]) => `${k}="${esc(v)}"`)
    .join(' ')

const yen = (n) => `¥${n.toLocaleString('ja-JP')}`

function T(x, y, s, { size = 13, weight = 400, color = C.text, anchor, family = JP, id } = {}) {
  return `<text ${attrs({ id, x, y, 'font-family': family, 'font-size': size, 'font-weight': weight, fill: color, 'text-anchor': anchor })}>${esc(s)}</text>`
}
const N = (x, y, s, o = {}) => T(x, y, s, { family: NUM, weight: 600, ...o })

function R(x, y, w, h, { fill = 'none', stroke, sw = 1, r = 0, dash, id, opacity } = {}) {
  return `<rect ${attrs({ id, x, y, width: w, height: h, rx: r || undefined, fill, stroke, 'stroke-width': stroke ? sw : undefined, 'stroke-dasharray': dash, opacity })}/>`
}
const Line = (x1, y1, x2, y2, { stroke = C.border, sw = 1, dash } = {}) =>
  `<line ${attrs({ x1, y1, x2, y2, stroke, 'stroke-width': sw, 'stroke-dasharray': dash })}/>`
const G = (id, inner, transform) => `<g ${attrs({ id, transform })}>${inner}</g>`

const iconCache = {}
function icon(name, x, y, size = 20, color = C.text, sw = 1.8) {
  const comp = Lucide[name]
  if (!comp) throw new Error(`アイコンが見つかりません: ${name}`)
  iconCache[name] ??= renderToStaticMarkup(createElement(comp)).replace(/^<svg[^>]*>/, '').replace(/<\/svg>$/, '')
  return `<g ${attrs({
    id: `アイコン ${name}`,
    transform: `translate(${x} ${y}) scale(${size / 24})`,
    fill: 'none',
    stroke: color,
    'stroke-width': sw,
    'stroke-linecap': 'round',
    'stroke-linejoin': 'round',
  })}>${iconCache[name]}</g>`
}

function catIcon(cat, x, y, box = 42, size = 21) {
  const [name, bg, color] = CAT[cat]
  return G(`カテゴリ ${cat}`, R(x, y, box, box, { fill: bg, r: 12 }) + icon(name, x + (box - size) / 2, y + (box - size) / 2, size, color))
}

const card = (id, x, y, w, h, inner) => G(id, R(x, y, w, h, { fill: C.white, stroke: C.border, r: 20 }) + inner)

function mascot(x, y, size, mood) {
  const ink = '#405d4b'
  const eyes =
    mood === 'happy'
      ? `<path d="M22 40Q25 36 28 40" stroke="${ink}" stroke-width="2.2" stroke-linecap="round" fill="none"/><path d="M36 40Q39 36 42 40" stroke="${ink}" stroke-width="2.2" stroke-linecap="round" fill="none"/>`
      : `<circle cx="25" cy="39" r="2.6" fill="${ink}"/><circle cx="39" cy="39" r="2.6" fill="${ink}"/><circle cx="25.8" cy="38.2" r="0.8" fill="#fff"/><circle cx="39.8" cy="38.2" r="0.8" fill="#fff"/>`
  const mouth =
    mood === 'happy'
      ? `<path d="M27 46Q32 52 37 46Z" fill="#d97f70" stroke="${ink}" stroke-width="1.6" stroke-linejoin="round"/>`
      : `<path d="M29 46Q32 49 35 46" stroke="${ink}" stroke-width="1.8" stroke-linecap="round" fill="none"/>`
  return G(
    'キャラクター',
    `<path d="M32 19C32 14 32 11 32 8" stroke="#3f7961" stroke-width="2.4" stroke-linecap="round" fill="none"/>
<path d="M32 11C26 5 19 6 17 10C22 15 29 14 32 11Z" fill="#7fae8f" stroke="${ink}" stroke-width="1.4" stroke-linejoin="round"/>
<path d="M32 10C37 3 45 4 47 8C43 13 36 13 32 10Z" fill="#a9c7b6" stroke="${ink}" stroke-width="1.4" stroke-linejoin="round"/>
<ellipse cx="32" cy="40" rx="22" ry="19" fill="#f6efd9" stroke="${ink}" stroke-width="1.8"/>
<ellipse cx="25" cy="31" rx="7" ry="3.5" fill="#fffaf0" opacity="0.8"/>
<ellipse cx="19" cy="45" rx="4" ry="2.5" fill="#f2b4a0"/>
<ellipse cx="45" cy="45" rx="4" ry="2.5" fill="#f2b4a0"/>
${eyes}${mouth}`,
    `translate(${x} ${y}) scale(${size / 64})`,
  )
}

// かごのイラスト(src/assets/basket.svg の中身をそのまま使う)
const basketInner = readFileSync(join(here, '..', 'src', 'assets', 'basket.svg'), 'utf8')
  .replace(/^[\s\S]*?<svg[^>]*>/, '')
  .replace(/<\/svg>\s*$/, '')
  .replace(/<defs>[\s\S]*?<\/defs>/, '')
  .replace(/<g clip-path="[^"]*">/, '<g>')
const basket = (x, y, width) => G('かごのイラスト', basketInner, `translate(${x} ${y}) scale(${width / 108})`)

// 画面の共通部分
function header(title, { date, settings, pill } = {}) {
  let s = ''
  if (date) s += T(22, 30, date, { size: 11, color: C.sub })
  s += T(22, date ? 63 : 58, title, { size: 26, weight: 700 })
  if (settings) {
    s += G('設定ボタン', `<circle cx="347" cy="45" r="21" fill="${C.white}" stroke="${C.border}"/>` + icon('Settings', 337, 35, 20, C.text))
  }
  if (pill) {
    s += G('月の選択', R(256, 26, 112, 36, { fill: C.white, stroke: C.border, r: 18 }) + T(272, 49, pill, { size: 13, color: C.sub }) + icon('ChevronDown', 344, 37.5, 13, C.sub))
  }
  return G('ヘッダー', s)
}

function tabbar(active) {
  const tabs = [
    ['home', 'ホーム', 'House'],
    ['history', '買い物履歴', 'ReceiptText'],
    ['calendar', 'カレンダー', 'CalendarDays'],
    ['review', '記録', 'ChartNoAxesColumnIncreasing'],
  ]
  const colW = (W - 16) / tabs.length
  let s = R(0, 780, W, 64, { fill: C.white }) + Line(0, 780.5, W, 780.5)
  tabs.forEach(([key, label, ic], i) => {
    const cx = 8 + colW * (i + 0.5)
    const on = key === active
    let t = ''
    if (on) t += R(cx - 27, 788, 54, 28, { fill: C.greenLight, r: 14 })
    t += icon(ic, cx - 10.5, 791.5, 21, on ? C.green : C.sub)
    t += T(cx, 830, label, { size: 10, weight: on ? 700 : 400, color: on ? C.green : C.sub, anchor: 'middle' })
    s += G(`タブ ${label}`, t)
  })
  return G('下のタブ', s)
}

function itemRow(y, it, first) {
  let s = ''
  if (!first) s += Line(36, y + 0.5, 354, y + 0.5)
  s += catIcon(it.cat, 36, y + 13)
  s += T(89, y + 30, it.name + (it.qty > 1 ? '' : ''), { size: 13, weight: 500 })
  if (it.qty > 1) s += T(89 + it.name.length * 13 + 2, y + 30, `× ${it.qty}`, { size: 11, color: C.sub })
  s += T(89, y + 48, `${it.when} ・ ${it.cat}${it.store ? ` ・ ${it.store}` : ''}`, { size: 10, color: C.sub })
  s += N(354, y + 40, yen(it.price), { size: 16, anchor: 'end' })
  return G(`記録 ${it.name}`, s)
}
const itemList = (id, y, list) => card(id, 22, y, 346, list.length * 68, list.map((it, i) => itemRow(y + i * 68, it, i === 0)).join(''))

function doc(name, body, { bg = C.bg, defs = '' } = {}) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
${defs ? `<defs>${defs}</defs>` : ''}
${typeof bg === 'string' && bg.startsWith('url(') ? R(0, 0, W, H, { fill: bg, id: '背景' }) : R(0, 0, W, H, { fill: bg, id: '背景' })}
${body}
</svg>
`
  writeFileSync(join(OUT, `${name}.svg`), svg, 'utf8')
  console.log(`書き出し: design/svg/${name}.svg`)
  // 確認用: --preview <フォルダ> を付けると、英数字の名前(s1.svg など)でもう1つ書き出す
  const pi = process.argv.indexOf('--preview')
  if (pi > 0) writeFileSync(join(process.argv[pi + 1], `s${name.slice(0, 2).replace(/^0/, '')}.svg`), svg, 'utf8')
}

// ---------- 見本のデータ(2026年11月7日(土)の時点) ----------
const ITEMS = [
  { date: 7, name: 'お茶', cat: '食費', price: 160, when: '今日 13:52', store: 'こんびに' },
  { date: 7, name: '野菜と牛乳', cat: '食費', price: 2380, when: '今日 8:32', store: 'まるいちスーパー' },
  { date: 6, name: '洗剤', cat: '日用品', price: 1460, qty: 2, when: '昨日 18:10', store: 'くらしドラッグ' },
  { date: 5, name: 'クロワッサン', cat: '外食', price: 680, when: '11月5日', store: 'こもれびベーカリー' },
  { date: 3, name: 'Tシャツ', cat: '衣類', price: 2990, when: '11月3日', store: '' },
  { date: 3, name: '文庫本', cat: '趣味', price: 880, when: '11月3日', store: '本屋' },
  { date: 2, name: 'ランチ', cat: '外食', price: 1200, when: '11月2日', store: '駅前カフェ' },
  { date: 1, name: 'お米', cat: '食費', price: 3090, when: '11月1日', store: 'まるいちスーパー' },
]
const TOTAL = ITEMS.reduce((s, i) => s + i.price, 0) // 12,840
const BUDGET = 120000
const UPCOMING = 68200 // 家賃 ¥68,000 + ティッシュ ¥200(電気代は金額未定)
const byDate = (d) => ITEMS.filter((i) => i.date === d)
const dayTotal = (d) => byDate(d).reduce((s, i) => s + i.price, 0)

// ---------- 01 タイトル画面 ----------
doc(
  '01 タイトル画面',
  [
    G('飾り', [
      `<circle cx="340" cy="40" r="100" fill="#dcebd6"/>`,
      `<circle cx="50" cy="804" r="110" fill="#fbe3dc"/>`,
      `<circle cx="11" cy="221" r="35" fill="#f6efd9"/>`,
      T(300, 230, '✦', { size: 22, color: '#f4c95d' }),
      T(40, 600, '✦', { size: 16, color: '#f2a7b8' }),
      T(94, 300, '✧', { size: 14, color: '#f4c95d' }),
    ].join('')),
    basket(102, 320, 150),
    mascot(218, 352, 92, 'happy'),
    G('タイトル', T(195, 500, '買い物', { size: 40, weight: 800, color: C.green, anchor: 'end', family: 'M PLUS Rounded 1c' }) + T(197, 500, 'きろく', { size: 40, weight: 800, color: '#d97f70', family: 'M PLUS Rounded 1c' })),
    T(195, 544, '小さな記録で、暮らしを見える化。', { size: 13, color: C.sub, anchor: 'middle' }),
    T(195, 790, 'タップしてはじめる', { size: 12, color: C.sub, anchor: 'middle' }),
  ].join('\n'),
  {
    bg: 'url(#splash-bg)',
    defs: `<linearGradient id="splash-bg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#eef6ea"/><stop offset="0.55" stop-color="#fafbf7"/><stop offset="1" stop-color="#fdf3f0"/></linearGradient>`,
  },
)

// ---------- 02 ホーム ----------
{
  const usedW = Math.round((310 * TOTAL) / BUDGET)
  const planW = Math.round((310 * UPCOMING) / BUDGET)
  const rest = BUDGET - TOTAL - UPCOMING
  const month = card('今月の買い物', 22, 84, 346, 200, [
    T(40, 117, '今月の買い物', { size: 13, weight: 700 }),
    T(334, 117, '2026年11月', { size: 11, color: C.sub, anchor: 'end' }),
    icon('ChevronDown', 337, 107, 13, C.sub),
    T(40, 168, '¥', { size: 22, weight: 500, family: NUM }),
    N(58, 168, TOTAL.toLocaleString('ja-JP'), { size: 32 }),
    Line(258.5, 136, 258.5, 171),
    T(278, 146, '記録した買い物', { size: 10, color: C.sub }),
    N(278, 173, String(ITEMS.length), { size: 23, color: C.green }),
    T(294, 173, '件', { size: 11 }),
    icon('ChevronRight', 305, 162, 14, C.sub),
    Line(40, 190.5, 350, 190.5),
    T(40, 222, 'のこり', { size: 12 }),
    N(82, 222, yen(rest), { size: 15 }),
    T(334, 222, `予算 ${yen(BUDGET)}`, { size: 12, color: C.sub, anchor: 'end' }),
    icon('PencilLine', 338, 212, 12, C.sub),
    G('予算のバー', R(40, 234, 310, 8, { fill: C.greenLight, r: 4 }) + R(40, 234, usedW, 8, { fill: C.green, r: 4 }) + R(40 + usedW, 234, planW, 8, { fill: '#b9d3c3' })),
    T(40, 266, `使った ${yen(TOTAL)} + これからの予定 ${yen(UPCOMING)}(ほかに金額未定 1件)`, { size: 10, color: C.sub }),
  ].join(''))

  const button = G('買い物を記録するボタン', R(22, 304, 346, 52, { fill: C.green, r: 12 }) + icon('PencilLine', 120, 320, 20, C.white) + T(148, 336, '買い物を記録する', { size: 15, weight: 700, color: C.white }))

  const bubblePath = 'M112 376H352A16 16 0 0 1 368 392V489A16 16 0 0 1 352 505H100A4 4 0 0 1 96 501V392A16 16 0 0 1 112 376Z'
  const talk = G('キャラクターの吹き出し', [
    mascot(22, 451, 64, 'happy'),
    `<path d="${bubblePath}" fill="${C.white}" stroke="${C.border}"/>`,
    T(110, 400, '先月の同じ日までより', { size: 13 }),
    T(110, 421, '¥2,360 節約できてるよ!すごい!', { size: 13 }),
    T(110, 442, '使えるお金はあと ¥38,960。', { size: 11, color: C.sub }),
    T(110, 459, '1日 ¥1,623 くらいまで使えるよ。', { size: 11, color: C.sub }),
    T(110, 480, '今日は「電気代」(金額未定)の', { size: 11, color: C.plan }),
    T(110, 497, '予定があるよ。', { size: 11, color: C.plan }),
  ].join(''))

  const recentHead = G('最近の買い物の見出し', T(22, 545, '最近の買い物', { size: 17, weight: 700 }) + T(350, 543, 'すべて見る', { size: 11, weight: 500, color: C.green, anchor: 'end' }) + icon('ChevronRight', 352, 533, 13, C.green))

  doc('02 ホーム', [
    header('ホーム', { date: '11月7日(土)', settings: true }),
    month,
    button,
    talk,
    recentHead,
    itemList('最近の買い物', 556, ITEMS.slice(0, 3)),
    tabbar('home'),
  ].join('\n'))
}

// ---------- 03 買い物履歴 ----------
{
  let y = 238
  const groups = []
  for (const d of [7, 6, 5, 3]) {
    const list = byDate(d)
    const w = '日月火水木金土'[new Date(2026, 10, d).getDay()]
    groups.push(
      G(`11月${d}日`, T(26, y + 14, `11月${d}日(${w})`, { size: 13, weight: 700, color: C.sub }) + N(364, y + 14, yen(dayTotal(d)), { size: 13, color: C.sub, anchor: 'end' }) + itemList('記録の一覧', y + 24, list)),
    )
    y += 24 + list.length * 68 + 20
  }
  doc('03 買い物履歴', [
    header('買い物履歴', { pill: '2026年11月' }),
    card('この月の合計', 22, 84, 346, 134, T(40, 117, 'この月の合計', { size: 13, weight: 700 }) + T(40, 163, '¥', { size: 22, weight: 500, family: NUM }) + N(58, 163, TOTAL.toLocaleString('ja-JP'), { size: 32 }) + T(40, 195, `${ITEMS.length} 件の買い物`, { size: 10, color: C.sub })),
    ...groups,
    tabbar('history'),
  ].join('\n'))
}

// ---------- 04 カレンダー ----------
{
  const gx = 34
  const gw = 322
  const colW = (gw - 6 * 4) / 7
  const cx = (i) => gx + i * (colW + 4)
  const dowColor = (i) => (i === 0 ? C.red : i === 6 ? '#5a6f94' : C.text)
  let grid = ''
  '日月火水木金土'.split('').forEach((w, i) => {
    grid += T(cx(i) + colW / 2, 166, w, { size: 11, color: i === 0 ? C.red : i === 6 ? '#5a6f94' : C.sub, anchor: 'middle' })
  })
  const marks = { 7: true, 9: true }
  for (let d = 1; d <= 30; d++) {
    const i = (d - 1) % 7 // 2026年11月1日は日曜日
    const row = Math.floor((d - 1) / 7)
    const x = cx(i)
    const y = 174 + row * 64
    const tot = dayTotal(d)
    let c = ''
    if (tot) c += R(x, y, colW, 60, { fill: C.greenLight, r: 10 })
    if (d === 7) c += R(x + 1, y + 1, colW - 2, 58, { stroke: C.green, sw: 2, r: 10 })
    if (d === 7) c += `<circle cx="${x + colW / 2}" cy="${y + 17}" r="11" fill="${C.green}"/>`
    c += N(x + colW / 2, y + 22, String(d), { size: 13, weight: 500, color: d === 7 ? C.white : dowColor(i), anchor: 'middle' })
    if (tot) c += N(x + colW / 2, y + 39, tot.toLocaleString('ja-JP'), { size: 9, color: C.green, anchor: 'middle' })
    if (marks[d]) c += `<circle cx="${x + colW / 2}" cy="${y + 50}" r="3" fill="${C.plan}"/>`
    grid += G(`11月${d}日`, c)
  }
  const cal = card('カレンダー', 22, 84, 346, 446, [
    `<circle cx="57" cy="118" r="18" fill="${C.white}" stroke="${C.border}"/>`,
    icon('ChevronLeft', 48, 109, 18, C.text),
    `<circle cx="333" cy="118" r="18" fill="${C.white}" stroke="${C.border}"/>`,
    icon('ChevronRight', 324, 109, 18, C.text),
    T(195, 112, 'この月の合計', { size: 10, color: C.sub, anchor: 'middle' }),
    N(195, 134, yen(TOTAL), { size: 18, anchor: 'middle' }),
    grid,
    `<circle cx="42" cy="510" r="3" fill="${C.plan}"/>`,
    T(50, 514, '予定', { size: 11, color: C.sub }),
    T(90, 514, 'これからの予定', { size: 11, color: C.sub }),
    N(170, 514, yen(UPCOMING), { size: 11 }),
    T(216, 514, '+ 金額未定 1件', { size: 11, color: C.sub }),
  ].join(''))

  const planRow = (y, name, amountText, unknown, cat, repeat, first) => {
    let s = ''
    if (!first) s += Line(36, y + 0.5, 354, y + 0.5)
    s += catIcon(cat, 36, y + 11)
    s += T(89, y + 28, name, { size: 13, weight: 500 })
    s += T(89, y + 46, amountText, { size: 10, weight: unknown ? 700 : 600, color: unknown ? C.warnText : C.sub, family: unknown ? JP : NUM })
    s += T(89 + (unknown ? 40 : amountText.length * 6), y + 46, ` ・ ${cat}${repeat ? ' ・ 毎月' : ''}`, { size: 10, color: C.sub })
    s += G('完了ボタン', R(300, y + 16, 54, 32, { fill: C.white, stroke: C.plan, sw: 1.5, r: 16 }) + T(327, y + 37, '完了', { size: 12, weight: 700, color: C.plan, anchor: 'middle' }))
    return G(`予定 ${name}`, s)
  }

  doc('04 カレンダー', [
    header('カレンダー', { pill: '2026年11月' }),
    cal,
    G('選んだ日の見出し', T(26, 564, '11月7日(土)', { size: 13, weight: 700, color: C.sub }) + N(364, 564, yen(dayTotal(7)), { size: 13, color: C.sub, anchor: 'end' })),
    card('その日の予定', 22, 574, 346, 128, planRow(574, '電気代', '金額未定', true, '固定費', true, true) + planRow(638, 'ティッシュ', '¥200', false, '日用品', false, false)),
    itemList('その日の記録', 712, byDate(7)),
    tabbar('calendar'),
  ].join('\n'))
}

// ---------- 05 記録 ----------
{
  // 週ごとのグラフ(src/BarChart.jsx と同じ計算)
  const weeks = [
    ['11/1〜', [1]],
    ['11/2〜', [2, 3, 4, 5, 6, 7, 8]],
    ['11/9〜', []],
    ['11/16〜', []],
    ['11/23〜', []],
    ['11/30〜', []],
  ].map(([label, days]) => ({ label, value: days.reduce((s, d) => s + dayTotal(d), 0) }))
  const guide = Math.round((BUDGET / 30) * 7)
  const CH = 183
  const top = 217
  const base = top + CH
  const max = Math.max(guide, ...weeks.map((w) => w.value)) * 1.08
  const px = (v) => (v / max) * (CH - 18)
  const colW = (310 - 5 * 6) / 6
  let chart = Line(40, base - (CH - 18) * 0.5, 350, base - (CH - 18) * 0.5, { stroke: '#eef1ec' }) + Line(40, base - (CH - 18), 350, base - (CH - 18), { stroke: '#eef1ec' })
  chart += Line(40, base, 350, base, { stroke: '#cfd8cc', sw: 1.5 })
  const gy = base - px(guide)
  chart += G('1週の目安の線', Line(40, gy, 350, gy, { stroke: C.warn, sw: 1.5, dash: '4 3' }) + R(262, gy - 14, 88, 13, { fill: C.white, opacity: 0.9, r: 4 }) + T(348, gy - 4, '1週の目安 ¥2.8万', { size: 10, weight: 700, color: C.warnText, anchor: 'end' }))
  weeks.forEach((w, i) => {
    const x = 40 + i * (colW + 6)
    const bw = Math.min(colW * 0.7, 34)
    const strong = i === 1
    let b = ''
    if (w.value) {
      const h = Math.max(3, px(w.value))
      b += `<path d="M${x + (colW - bw) / 2} ${base}V${base - h + 6}A6 6 0 0 1 ${x + (colW - bw) / 2 + 6} ${base - h}H${x + (colW + bw) / 2 - 6}A6 6 0 0 1 ${x + (colW + bw) / 2} ${base - h + 6}V${base}Z" fill="${strong ? C.green : '#a9c7b6'}"/>`
      b += N(x + colW / 2, base - h - 4, yen(w.value), { size: 11, anchor: 'middle' })
    }
    b += T(x + colW / 2, base + 16, w.label, { size: 10, weight: strong ? 700 : 500, color: strong ? C.green : C.sub, anchor: 'middle' })
    chart += G(`週 ${w.label}`, b)
  })

  const segment = G('グラフの切り替え', [
    R(40, 102, 310, 38, { fill: C.bg, stroke: C.border, r: 19 }),
    R(43, 105, 101, 32, { fill: C.green, r: 16 }),
    T(93.5, 125, '週ごと', { size: 12, weight: 700, color: C.white, anchor: 'middle' }),
    T(195, 125, '月ごと', { size: 12, weight: 500, color: C.sub, anchor: 'middle' }),
    T(296.5, 125, 'カテゴリ別', { size: 12, weight: 500, color: C.sub, anchor: 'middle' }),
  ].join(''))

  const monthNav = G('月の切り替え', [
    `<circle cx="125" cy="170" r="15" fill="${C.white}" stroke="${C.border}"/>`,
    icon('ChevronLeft', 117, 162, 16, C.text),
    `<circle cx="265" cy="170" r="15" fill="${C.white}" stroke="${C.border}"/>`,
    icon('ChevronRight', 257, 162, 16, C.text),
    T(195, 175, '2026年11月', { size: 14, weight: 700, anchor: 'middle' }),
  ].join(''))

  // カテゴリ別の一覧
  const catBudget = { 食費: 6000, 日用品: 1000, 外食: 3000 }
  const sums = {}
  for (const it of ITEMS) sums[it.cat] = (sums[it.cat] || 0) + it.price
  const rows = Object.entries(sums).sort((a, b) => b[1] - a[1])
  let list = ''
  let y = 540
  for (const [cat, sum] of rows) {
    const limit = catBudget[cat] || 0
    const level = limit ? (sum > limit ? 'over' : sum >= limit * 0.8 ? 'warn' : 'ok') : 'ok'
    const barColor = level === 'over' ? C.red : level === 'warn' ? C.warn : C.green
    const ratio = limit ? Math.min(1, sum / limit) : sum / TOTAL
    let r = catIcon(cat, 40, y + 6)
    r += T(95, y + 20, cat, { size: 13 })
    r += N(limit ? 300 : 350, y + 20, yen(sum), { size: 13, anchor: 'end' })
    if (limit) r += T(350, y + 20, ` / ${yen(limit)}`, { size: 11, weight: 500, color: C.sub, anchor: 'end', family: NUM })
    r += R(95, y + 28, 255, limit ? 8 : 6, { fill: C.greenLight, r: 4 }) + R(95, y + 28, Math.max(4, 255 * ratio), limit ? 8 : 6, { fill: barColor, r: 4 })
    if (limit) {
      r += T(350, y + 50, level === 'over' ? `${yen(sum - limit)} オーバー` : `のこり ${yen(limit - sum)}`, {
        size: 10,
        weight: level === 'over' ? 700 : 400,
        color: level === 'over' ? C.red : level === 'warn' ? C.warnText : C.sub,
        anchor: 'end',
      })
    }
    list += G(`カテゴリ ${cat}`, r)
    y += limit ? 64 : 56
  }

  doc('05 記録', [
    header('記録', { pill: '2026年11月' }),
    card('グラフ', 22, 84, 346, 382, segment + monthNav + chart + T(40, 438, '月曜はじまり ・ 濃い色が今週 ・ 棒をタップで詳しく', { size: 10, color: C.sub })),
    card('カテゴリ別', 22, 486, 346, y - 486 + 10, G('見出し', T(40, 519, 'カテゴリ別', { size: 13, weight: 700 }) + icon('Target', 256, 509, 13, C.green) + T(350, 519, 'カテゴリの予算', { size: 11, weight: 500, color: C.green, anchor: 'end' })) + list),
    tabbar('review'),
  ].join('\n'))
}
