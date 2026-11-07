import { useEffect, useMemo, useState } from 'react'
import {
  CalendarDays,
  CalendarPlus,
  ChartNoAxesColumnIncreasing,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Croissant,
  House,
  Package,
  PencilLine,
  Pill,
  ReceiptText,
  Shirt,
  ShoppingBasket,
  Sparkles,
  Target,
} from 'lucide-react'
import { Settings as SettingsIcon } from 'lucide-react'
import Mascot from './Mascot.jsx'
import Splash from './Splash.jsx'
import { PlanMark, PlanRow } from './PlanParts.jsx'
import SettingsPage from './SettingsPage.jsx'
import {
  PLANS_KEY,
  SETTINGS_KEY,
  emptyPlan,
  loadPlans,
  loadSettings,
  occurrences,
  planEntries,
} from './plans.js'

// crypto.randomUUID は http 接続のスマホでは使えないため自前で生成
const newId = () => `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`

const STORAGE_KEY = 'shopping-log-items'
const BUDGET_KEY = 'shopping-log-budget'
const CAT_BUDGET_KEY = 'shopping-log-cat-budgets'

function loadCatBudgets() {
  try {
    const v = JSON.parse(localStorage.getItem(CAT_BUDGET_KEY))
    return v && typeof v === 'object' ? v : {}
  } catch {
    return {}
  }
}

// 予算に対する使いぐあい。8割をこえたら注意、こえたらオーバー
const budgetLevelOf = (used, limit) => (used > limit ? 'over' : used >= limit * 0.8 ? 'warn' : 'ok')

// カテゴリごとのアイコンと背景色(Figmaの「最近の買い物」に合わせる)
const CATEGORY_STYLE = {
  食費: { Icon: ShoppingBasket, bg: '#eaf2e8', color: '#3f7961' },
  日用品: { Icon: Pill, bg: '#fcf0ea', color: '#c9735a' },
  外食: { Icon: Croissant, bg: '#f6f1e6', color: '#a9823f' },
  衣類: { Icon: Shirt, bg: '#eef1f6', color: '#5a6f94' },
  趣味: { Icon: Sparkles, bg: '#f3eef6', color: '#86609a' },
  その他: { Icon: Package, bg: '#f0f1ef', color: '#77837c' },
}
const CATEGORIES = Object.keys(CATEGORY_STYLE)

const pad = (n) => String(n).padStart(2, '0')
const toDateStr = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
const today = () => toDateStr(new Date())
const nowTime = () => {
  const d = new Date()
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`
}
const yen = (n) => `¥${n.toLocaleString('ja-JP')}`
const WEEK = '日月火水木金土'

// "YYYY-MM" を前後の月にずらす
const shiftMonth = (month, diff) => {
  const [y, m] = month.split('-').map(Number)
  const d = new Date(y, m - 1 + diff, 1)
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}`
}
const daysInMonth = (month) => {
  const [y, m] = month.split('-').map(Number)
  return new Date(y, m, 0).getDate()
}

const emptyForm = () => ({
  name: '',
  price: '',
  quantity: '1',
  store: '',
  category: CATEGORIES[0],
  date: today(),
  time: nowTime(),
  memo: '',
})

// キャラクターのセリフを決める。
// 今月を見ているときは、公平にくらべるため先月も「同じ日まで」の合計を使う。
// budget は「予算 − 引き落とし予定」の使えるお金。hasBudget が false なら予算の話はしない。
function mascotMessage({ cur, prev, isCurrent, hasBudget, budget, total, daysLeft }) {
  const when = isCurrent ? '先月の同じ日まで' : '先月'
  let mood = 'normal'
  let main
  if (cur === 0 && prev === 0) {
    main = '買い物を記録すると、先月とくらべて教えるね!'
  } else if (prev === 0) {
    main = '先月の記録がないから、ここからくらべていこうね!'
  } else if (prev > cur) {
    mood = 'happy'
    main = `${when}より ${yen(prev - cur)} 節約できてるよ!すごい!`
  } else if (prev === cur) {
    main = `${when}とぴったり同じくらいだよ。`
  } else {
    mood = 'worried'
    main = `${when}より ${yen(cur - prev)} 多く使ってるよ。ちょっとだけ気をつけよう!`
  }

  let sub = ''
  if (hasBudget) {
    if (total > budget) {
      mood = 'worried'
      sub = `使えるお金を ${yen(total - budget)} オーバーしちゃった…`
    } else if (isCurrent && daysLeft > 0) {
      const rest = budget - total
      sub = `使えるお金はあと ${yen(rest)}。1日 ${yen(Math.floor(rest / daysLeft))} くらいまで使えるよ。`
    } else {
      sub = `予算の中におさまったね!`
    }
  }
  return { mood, main, sub }
}

function loadItems() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY))
    if (!Array.isArray(saved)) return []
    // 以前のカテゴリ名「食料品」は「食費」に読み替える
    return saved.map((i) => (i.category === '食料品' ? { ...i, category: '食費' } : i))
  } catch {
    return []
  }
}

const itemTotal = (i) => i.price * i.quantity
const sortKey = (i) => `${i.date} ${i.time || '00:00'}`

function formatDay(s) {
  const d = new Date(s + 'T00:00:00')
  return `${d.getMonth() + 1}月${d.getDate()}日(${WEEK[d.getDay()]})`
}

// 「今日 8:32」「昨日 18:10」「11月5日」のような表示
function formatWhen(item) {
  const yesterday = new Date()
  yesterday.setDate(yesterday.getDate() - 1)
  const time = item.time ? ` ${Number(item.time.slice(0, 2))}:${item.time.slice(3)}` : ''
  if (item.date === today()) return `今日${time}`
  if (item.date === toDateStr(yesterday)) return `昨日${time}`
  const d = new Date(item.date + 'T00:00:00')
  return `${d.getMonth() + 1}月${d.getDate()}日`
}

function CategoryIcon({ category }) {
  const { Icon, bg, color } = CATEGORY_STYLE[category] || CATEGORY_STYLE['その他']
  return (
    <span className="cat-icon" style={{ background: bg, color }}>
      <Icon size={21} strokeWidth={1.8} />
    </span>
  )
}

function ItemRow({ item, onClick }) {
  return (
    <li>
      <button className="item" onClick={() => onClick(item)}>
        <CategoryIcon category={item.category} />
        <span className="item-main">
          {/* 何を買ったかがすぐわかるよう、品名を大きく出す */}
          <span className="item-name">
            {item.name}
            {item.quantity > 1 && <span className="item-qty"> × {item.quantity}</span>}
          </span>
          <span className="item-sub">
            {formatWhen(item)} ・ {item.category}
            {item.store && ` ・ ${item.store}`}
          </span>
          {item.memo && <span className="item-memo">{item.memo}</span>}
        </span>
        <span className="item-price num">{yen(itemTotal(item))}</span>
      </button>
    </li>
  )
}

function MonthSelect({ month, onChange }) {
  const [y, m] = month.split('-')
  return (
    <label className="month-select">
      <span>{y}年{Number(m)}月</span>
      <ChevronDown size={13} />
      <input type="month" value={month} onChange={(e) => e.target.value && onChange(e.target.value)} />
    </label>
  )
}

export default function App() {
  const [items, setItems] = useState(loadItems)
  const [tab, setTab] = useState('home')
  const [form, setForm] = useState(emptyForm)
  const [editingId, setEditingId] = useState(null)
  const [showForm, setShowForm] = useState(false)
  const [month, setMonth] = useState(today().slice(0, 7))
  const [selectedDay, setSelectedDay] = useState(today())
  const [chartMode, setChartMode] = useState('week')
  const [showSplash, setShowSplash] = useState(true)
  // 月の予算(毎月同じ金額を使う。0は未設定)
  const [budget, setBudget] = useState(() => Number(localStorage.getItem(BUDGET_KEY)) || 0)
  const [budgetInput, setBudgetInput] = useState(null)
  // 引き落とし予定・買う予定と、カレンダーの印の設定
  const [plans, setPlans] = useState(loadPlans)
  const [settings, setSettings] = useState(loadSettings)
  const [planForm, setPlanForm] = useState(null) // 予定の入力画面(null なら閉じている)
  // カテゴリ別の予算 { 食費: 30000, ... }(毎月同じ金額を使う)
  const [catBudgets, setCatBudgets] = useState(loadCatBudgets)
  const [catBudgetForm, setCatBudgetForm] = useState(null) // 入力画面(null なら閉じている)

  useEffect(() => {
    localStorage.setItem(CAT_BUDGET_KEY, JSON.stringify(catBudgets))
  }, [catBudgets])
  const [pendingCheck, setPendingCheck] = useState(null) // 金額を入れたら買ったことにする予定

  useEffect(() => {
    localStorage.setItem(PLANS_KEY, JSON.stringify(plans))
  }, [plans])

  useEffect(() => {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings))
  }, [settings])

  useEffect(() => {
    if (budget > 0) localStorage.setItem(BUDGET_KEY, String(budget))
    else localStorage.removeItem(BUDGET_KEY)
  }, [budget])

  // 変更があるたびにブラウザに保存
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items))
  }, [items])

  const monthItems = useMemo(
    () => items.filter((i) => i.date.startsWith(month)).sort((a, b) => sortKey(b).localeCompare(sortKey(a))),
    [items, month],
  )
  const total = monthItems.reduce((s, i) => s + itemTotal(i), 0)

  const recent = useMemo(
    () => [...items].sort((a, b) => sortKey(b).localeCompare(sortKey(a))).slice(0, 3),
    [items],
  )

  const byCategory = useMemo(() => {
    const map = {}
    for (const i of monthItems) map[i.category] = (map[i.category] || 0) + itemTotal(i)
    return Object.entries(map).sort((a, b) => b[1] - a[1])
  }, [monthItems])

  const groups = useMemo(() => {
    const map = {}
    for (const i of monthItems) (map[i.date] ||= []).push(i)
    return Object.entries(map).sort((a, b) => b[0].localeCompare(a[0]))
  }, [monthItems])

  // 週ごとの合計(月曜はじまり。月をまたぐ週は、その月の日だけで数える)
  const weeks = useMemo(() => {
    const [y, m] = month.split('-').map(Number)
    const list = []
    for (let d = 1; d <= daysInMonth(month); d++) {
      if (d === 1 || new Date(y, m - 1, d).getDay() === 1) list.push({ start: d, end: d, total: 0 })
      list[list.length - 1].end = d
    }
    for (const i of monthItems) {
      const d = Number(i.date.slice(8, 10))
      const w = list.find((w) => d >= w.start && d <= w.end)
      if (w) w.total += itemTotal(i)
    }
    return list
  }, [month, monthItems])
  const weekMax = Math.max(1, ...weeks.map((w) => w.total))

  // 選んだ月までの6か月分の合計(カテゴリ別の内訳つき)
  const months = useMemo(() => {
    const list = Array.from({ length: 6 }, (_, k) => ({ key: shiftMonth(month, k - 5), total: 0, cats: {} }))
    for (const i of items) {
      const mo = list.find((x) => i.date.startsWith(x.key))
      if (!mo) continue
      mo.total += itemTotal(i)
      mo.cats[i.category] = (mo.cats[i.category] || 0) + itemTotal(i)
    }
    return list
  }, [items, month])
  const monthMax = Math.max(1, ...months.map((x) => x.total))
  const monthCatTotals = Object.fromEntries(byCategory)
  // 記録画面のカテゴリ一覧: 使ったカテゴリ + 予算を決めたカテゴリ
  const catRows = CATEGORIES.filter((c) => monthCatTotals[c] || catBudgets[c] > 0)
    .map((c) => ({ cat: c, sum: monthCatTotals[c] || 0, limit: catBudgets[c] || 0 }))
    .sort((a, b) => b.sum - a.sum)
  const overCats = catRows.filter((r) => r.limit > 0 && r.sum > r.limit)
  const catMax = Math.max(1, ...byCategory.map(([, v]) => v))
  const todayNum = month === today().slice(0, 7) ? Number(today().slice(8, 10)) : 0

  // カレンダーのマス(日曜はじまり。1日の前は空白で埋める)
  const calendarCells = useMemo(() => {
    const [y, m] = month.split('-').map(Number)
    const totals = {}
    for (const i of monthItems) totals[i.date] = (totals[i.date] || 0) + itemTotal(i)
    const cells = Array(new Date(y, m - 1, 1).getDay()).fill(null)
    for (let d = 1; d <= daysInMonth(month); d++) {
      const date = `${month}-${pad(d)}`
      cells.push({ day: d, date, total: totals[date] || 0, dow: (cells.length) % 7 })
    }
    return cells
  }, [month, monthItems])

  const dayItems = useMemo(
    () => items.filter((i) => i.date === selectedDay).sort((a, b) => sortKey(b).localeCompare(sortKey(a))),
    [items, selectedDay],
  )

  // 予定まわり
  const monthEntries = useMemo(() => planEntries(plans, month), [plans, month])
  const billTotal = monthEntries.filter((e) => e.plan.type === 'bill').reduce((s, e) => s + (Number(e.plan.amount) || 0), 0)
  const entriesByDate = useMemo(() => {
    const map = {}
    for (const e of monthEntries) (map[e.date] ||= []).push(e)
    return map
  }, [monthEntries])
  const dayEntries = useMemo(
    () => planEntries(plans, selectedDay.slice(0, 7)).filter((e) => e.date === selectedDay),
    [plans, selectedDay],
  )
  // 買う予定にチェック済みか(記録を履歴から消していたら、未チェックにもどす)
  const isDone = (plan, date) => {
    const id = plan.done?.[date]
    return Boolean(id) && items.some((i) => i.id === id)
  }
  const markDone = (planId, date, itemId) =>
    setPlans((ps) =>
      ps.map((p) => {
        if (p.id !== planId) return p
        const done = { ...(p.done || {}) }
        if (itemId) done[date] = itemId
        else delete done[date]
        return { ...p, done }
      }),
    )

  const toggleBuy = (plan, date) => {
    if (isDone(plan, date)) {
      if (!confirm('チェックを外すと、買い物履歴からこの記録も消えます。よろしいですか?')) return
      setItems(items.filter((i) => i.id !== plan.done[date]))
      markDone(plan.id, date, null)
      return
    }
    if (Number(plan.amount) > 0) {
      // 金額が決まっていれば、そのまま買い物履歴に記録する
      const id = newId()
      setItems([
        {
          id,
          name: plan.name,
          price: Number(plan.amount),
          quantity: 1,
          store: '',
          category: plan.category || 'その他',
          date,
          time: '',
          memo: plan.memo || '',
        },
        ...items,
      ])
      markDone(plan.id, date, id)
    } else {
      // 金額が未定なら、入力画面で金額を入れてもらう
      setForm({ ...emptyForm(), name: plan.name, category: plan.category || 'その他', date, time: '', memo: plan.memo || '' })
      setEditingId(null)
      setPendingCheck({ planId: plan.id, date })
      setShowForm(true)
    }
  }

  const openPlanNew = (type, date) => setPlanForm(emptyPlan(type, date))
  const openPlanEdit = (plan) => setPlanForm({ ...plan, amount: plan.amount ? String(plan.amount) : '' })
  const updatePlan = (key) => (e) =>
    setPlanForm({ ...planForm, [key]: e.target.type === 'checkbox' ? e.target.checked : e.target.value })

  const savePlan = (e) => {
    e.preventDefault()
    if (!planForm.name.trim()) return
    const data = {
      type: planForm.type,
      name: planForm.name.trim(),
      amount: Math.max(0, Math.floor(Number(planForm.amount) || 0)),
      date: planForm.date,
      repeat: Boolean(planForm.repeat),
      category: planForm.type === 'buy' ? planForm.category : '',
      memo: (planForm.memo || '').trim(),
    }
    if (planForm.id) setPlans(plans.map((p) => (p.id === planForm.id ? { ...p, ...data } : p)))
    else setPlans([...plans, { id: newId(), done: {}, ...data }])
    setPlanForm(null)
  }

  const deletePlan = () => {
    const msg = planForm.repeat
      ? 'この予定を削除しますか?(毎月の予定もすべて消えます。買い物履歴に入れた記録は残ります)'
      : 'この予定を削除しますか?(買い物履歴に入れた記録は残ります)'
    if (!confirm(msg)) return
    setPlans(plans.filter((p) => p.id !== planForm.id))
    setPlanForm(null)
  }

  const update = (key) => (e) => setForm({ ...form, [key]: e.target.value })

  const openNew = (date = null) => {
    setForm(date ? { ...emptyForm(), date } : emptyForm())
    setEditingId(null)
    setShowForm(true)
  }

  const openEdit = (item) => {
    setForm({ ...emptyForm(), ...item, price: String(item.price), quantity: String(item.quantity), time: item.time || '' })
    setEditingId(item.id)
    setShowForm(true)
  }

  const closeForm = () => {
    setShowForm(false)
    setPendingCheck(null)
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    const price = Number(form.price)
    const quantity = Number(form.quantity)
    if (!form.name.trim() || !(price >= 0) || !(quantity >= 1)) return

    const data = {
      name: form.name.trim(),
      price,
      quantity,
      store: form.store.trim(),
      category: form.category,
      date: form.date,
      time: form.time,
      memo: (form.memo || '').trim(),
    }

    if (editingId) {
      setItems(items.map((i) => (i.id === editingId ? { ...i, ...data } : i)))
    } else {
      const id = newId()
      setItems([{ id, ...data }, ...items])
      // 買う予定のチェックから開いたときは、予定を「買った」にする
      if (pendingCheck) markDone(pendingCheck.planId, pendingCheck.date, id)
    }
    setMonth(form.date.slice(0, 7))
    closeForm()
  }

  const handleDelete = (id) => {
    if (confirm('この記録を削除しますか?')) {
      setItems(items.filter((i) => i.id !== id))
      closeForm()
    }
  }

  const now = new Date()

  // 先月との比較(今月を見ているときは今日の日付までで比べる)
  const isCurrentMonth = month === today().slice(0, 7)
  const limitDay = isCurrentMonth ? now.getDate() : 31
  const sumUntil = (mo) =>
    items
      .filter((i) => i.date.startsWith(mo) && Number(i.date.slice(8, 10)) <= limitDay)
      .reduce((s, i) => s + itemTotal(i), 0)
  // 使えるお金 = 予算 − その月の引き落とし予定(B案)
  const spendable = budget - billTotal
  const talk = mascotMessage({
    cur: sumUntil(month),
    prev: sumUntil(shiftMonth(month, -1)),
    isCurrent: isCurrentMonth,
    hasBudget: budget > 0,
    budget: spendable,
    total,
    daysLeft: isCurrentMonth ? daysInMonth(month) - now.getDate() + 1 : 0,
  })

  // 3日以内の引き落としをキャラクターが知らせる
  const billNotice = (() => {
    const t = today()
    const nextMonth = shiftMonth(t.slice(0, 7), 1)
    const upcoming = plans
      .filter((p) => p.type === 'bill')
      .flatMap((p) => [...occurrences(p, t.slice(0, 7)), ...occurrences(p, nextMonth)].map((date) => ({ p, date })))
      .map(({ p, date }) => ({ p, diff: Math.round((new Date(date + 'T00:00:00') - new Date(t + 'T00:00:00')) / 86400000) }))
      .filter((x) => x.diff >= 0 && x.diff <= 3)
      .sort((a, b) => a.diff - b.diff)[0]
    if (!upcoming) return ''
    const when = ['今日', '明日', 'あさって', '3日後'][upcoming.diff]
    const amount = upcoming.p.amount > 0 ? `(${yen(upcoming.p.amount)})` : ''
    return `${when}は「${upcoming.p.name}」の引き落とし${amount}だよ。`
  })()

  // カテゴリ別の予算をこえたら、キャラクターが知らせる
  const catNotice =
    overCats.length === 0
      ? ''
      : overCats.length === 1
        ? `${overCats[0].cat}が予算を ${yen(overCats[0].sum - overCats[0].limit)} オーバーしてるよ。`
        : `${overCats.map((r) => r.cat).join('と')}が予算オーバーだよ。`
  if (catNotice) talk.mood = 'worried'

  const budgetRate = budget > 0 ? (spendable > 0 ? total / spendable : 2) : 0
  const budgetLevel = budgetRate > 1 ? 'over' : budgetRate >= 0.8 ? 'warn' : 'ok'

  const saveBudget = (e) => {
    e.preventDefault()
    const v = Math.floor(Number(budgetInput))
    setBudget(v > 0 ? v : 0)
    setBudgetInput(null)
  }

  return (
    <div className="app">
      {showSplash && <Splash onDone={() => setShowSplash(false)} />}
      {tab === 'home' && (
        <>
          <header className="page-header">
            <div>
              <div className="page-date">{now.getMonth() + 1}月{now.getDate()}日({WEEK[now.getDay()]})</div>
              <h1>ホーム</h1>
            </div>
            <button className="icon-btn settings-btn" onClick={() => setTab('settings')} aria-label="設定">
              <SettingsIcon size={20} strokeWidth={1.8} />
            </button>
          </header>

          <main className="content">
            <section className="card month-card">
              <div className="card-head">
                <h2>今月の買い物</h2>
                <MonthSelect month={month} onChange={setMonth} />
              </div>
              <div className="month-body">
                <div className="month-total num">
                  <span className="yen-mark">¥</span>
                  {total.toLocaleString('ja-JP')}
                </div>
                <div className="divider" />
                {/* 押すと、同じ月の買い物履歴を開く */}
                <button className="month-count" onClick={() => setTab('history')} aria-label="買い物履歴を見る">
                  <span className="count-label">記録した買い物</span>
                  <span className="count-value">
                    <span className="count-num num">{monthItems.length}</span> 件
                    <ChevronRight size={14} />
                  </span>
                </button>
              </div>

              {budget > 0 ? (
                <div className={`budget level-${budgetLevel}`}>
                  <div className="budget-row">
                    <span>
                      {budgetLevel === 'over' ? (
                        <>オーバー <strong className="num">{yen(total - Math.max(0, spendable))}</strong></>
                      ) : (
                        <>のこり <strong className="num">{yen(spendable - total)}</strong></>
                      )}
                    </span>
                    <button className="link-btn" onClick={() => setBudgetInput(String(budget))}>
                      予算 {yen(budget)}
                      <PencilLine size={12} />
                    </button>
                  </div>
                  <div className="budget-bar">
                    <div style={{ width: `${Math.min(100, budgetRate * 100)}%` }} />
                  </div>
                  {billTotal > 0 && (
                    <button className="budget-calc" onClick={() => setTab('calendar')}>
                      予算 {yen(budget)} − 引き落とし予定 {yen(billTotal)} = 使えるお金{' '}
                      <strong className="num">{yen(spendable)}</strong>
                    </button>
                  )}
                </div>
              ) : (
                <button className="link-btn budget-set" onClick={() => setBudgetInput('')}>
                  <Target size={14} />
                  月の予算を決める
                </button>
              )}
            </section>

            <button className="btn-receipt" onClick={() => openNew()}>
              <PencilLine size={20} strokeWidth={1.8} />
              買い物を記録する
            </button>

            <section className="mascot">
              <Mascot mood={talk.mood} />
              <div className="bubble">
                <p>{talk.main}</p>
                {talk.sub && <p className="bubble-sub">{talk.sub}</p>}
                {catNotice && <p className="bubble-sub bubble-over">{catNotice}</p>}
                {billNotice && <p className="bubble-sub bubble-notice" style={{ color: settings.billColor }}>{billNotice}</p>}
              </div>
            </section>

            <section>
              <div className="section-head">
                <h2>最近の買い物</h2>
                <button className="link-btn" onClick={() => setTab('history')}>
                  すべて見る
                  <ChevronRight size={13} />
                </button>
              </div>
              {recent.length === 0 ? (
                <p className="empty card">まだ記録がありません。<br />上のボタンから記録してみましょう。</p>
              ) : (
                <ul className="card list">
                  {recent.map((item) => <ItemRow key={item.id} item={item} onClick={openEdit} />)}
                </ul>
              )}
            </section>
          </main>
        </>
      )}

      {tab === 'history' && (
        <>
          <header className="page-header">
            <h1>買い物履歴</h1>
            <MonthSelect month={month} onChange={setMonth} />
          </header>
          <main className="content">
            <section className="card month-card">
              <h2>この月の合計</h2>
              <div className="month-total num">
                <span className="yen-mark">¥</span>
                {total.toLocaleString('ja-JP')}
              </div>
              <div className="count-label">{monthItems.length} 件の買い物</div>
            </section>
            {groups.length === 0 && <p className="empty card">この月の記録はありません。</p>}
            {groups.map(([date, list]) => (
              <section key={date}>
                <div className="day-head">
                  <span>{formatDay(date)}</span>
                  <span className="num">{yen(list.reduce((s, i) => s + itemTotal(i), 0))}</span>
                </div>
                <ul className="card list">
                  {list.map((item) => <ItemRow key={item.id} item={item} onClick={openEdit} />)}
                </ul>
              </section>
            ))}
            <button className="link-btn manual" onClick={() => openNew()}>
              <PencilLine size={15} />
              買い物を記録する
            </button>
          </main>
        </>
      )}

      {tab === 'calendar' && (
        <>
          <header className="page-header">
            <h1>カレンダー</h1>
            <MonthSelect month={month} onChange={setMonth} />
          </header>
          <main className="content">
            <section className="card calendar">
              <div className="cal-head">
                <button className="icon-btn" onClick={() => setMonth(shiftMonth(month, -1))} aria-label="前の月">
                  <ChevronLeft size={18} />
                </button>
                <div className="cal-title">
                  <span>この月の合計</span>
                  <span className="num">{yen(total)}</span>
                </div>
                <button className="icon-btn" onClick={() => setMonth(shiftMonth(month, 1))} aria-label="次の月">
                  <ChevronRight size={18} />
                </button>
              </div>
              <div className="cal-grid">
                {[...WEEK].map((w, i) => (
                  <div key={w} className={`cal-dow dow-${i}`}>{w}</div>
                ))}
                {calendarCells.map((c, i) =>
                  c ? (
                    <button
                      key={c.date}
                      className={[
                        'cal-cell',
                        `dow-${c.dow}`,
                        c.date === today() && 'is-today',
                        c.date === selectedDay && 'is-selected',
                        c.total > 0 && 'has-total',
                      ].filter(Boolean).join(' ')}
                      onClick={() => setSelectedDay(c.date)}
                    >
                      <span className="cal-day num">{c.day}</span>
                      <span className="cal-total num">{c.total > 0 ? c.total.toLocaleString('ja-JP') : ''}</span>
                      <span className="cal-marks">
                        {(entriesByDate[c.date] || []).slice(0, 3).map((e) => (
                          <PlanMark
                            key={e.plan.id}
                            type={e.plan.type}
                            settings={settings}
                            faded={e.plan.type === 'buy' && isDone(e.plan, e.date)}
                          />
                        ))}
                      </span>
                    </button>
                  ) : (
                    <div key={`blank-${i}`} />
                  ),
                )}
              </div>
              <div className="cal-legend">
                <span className="legend-item">
                  <PlanMark type="bill" settings={settings} /> 引き落とし
                  {billTotal > 0 && <span className="num">{yen(billTotal)}</span>}
                </span>
                <span className="legend-item">
                  <PlanMark type="buy" settings={settings} /> 買う予定
                </span>
              </div>
            </section>

            {selectedDay.startsWith(month) && (
              <section>
                <div className="day-head">
                  <span>{formatDay(selectedDay)}</span>
                  <span className="num">{yen(dayItems.reduce((s, i) => s + itemTotal(i), 0))}</span>
                </div>
                {dayEntries.length > 0 && (
                  <ul className="card list plan-list">
                    {dayEntries.map((e) => (
                      <PlanRow
                        key={e.plan.id}
                        plan={e.plan}
                        done={isDone(e.plan, e.date)}
                        settings={settings}
                        categoryIcon={<CategoryIcon category={e.plan.category || 'その他'} />}
                        onEdit={() => openPlanEdit(e.plan)}
                        onToggle={() => toggleBuy(e.plan, e.date)}
                      />
                    ))}
                  </ul>
                )}
                {dayItems.length > 0 && (
                  <ul className="card list day-items">
                    {dayItems.map((item) => <ItemRow key={item.id} item={item} onClick={openEdit} />)}
                  </ul>
                )}
                {dayItems.length === 0 && dayEntries.length === 0 && (
                  <p className="empty card">この日の記録や予定はありません。</p>
                )}
                <div className="day-actions">
                  <button className="link-btn" onClick={() => openNew(selectedDay)}>
                    <PencilLine size={15} />
                    買い物を記録
                  </button>
                  <button className="link-btn" onClick={() => openPlanNew('buy', selectedDay)}>
                    <CalendarPlus size={15} />
                    予定を追加
                  </button>
                </div>
              </section>
            )}
          </main>
        </>
      )}

      {tab === 'review' && (
        <>
          <header className="page-header">
            <h1>記録</h1>
            <MonthSelect month={month} onChange={setMonth} />
          </header>
          <main className="content">
            <section className="card week-card">
              <div className="segment" role="tablist">
                {[
                  ['week', '週ごと'],
                  ['month', '月ごと'],
                  ['category', 'カテゴリ別'],
                ].map(([key, label]) => (
                  <button
                    key={key}
                    role="tab"
                    aria-selected={chartMode === key}
                    className={chartMode === key ? 'active' : ''}
                    onClick={() => setChartMode(key)}
                  >
                    {label}
                  </button>
                ))}
              </div>

              {/* 3種類のグラフ共通の月切り替え。月ごとは選んだ月までの6か月を表示する */}
              <div className="chart-month">
                <button className="icon-btn" onClick={() => setMonth(shiftMonth(month, -1))} aria-label="前の月">
                  <ChevronLeft size={16} />
                </button>
                <span>
                  {chartMode === 'month'
                    ? (() => {
                        const [fy, fm] = months[0].key.split('-').map(Number)
                        const [ly, lm] = month.split('-').map(Number)
                        return fy === ly ? `${fy}年${fm}月〜${lm}月` : `${fy}年${fm}月〜${ly}年${lm}月`
                      })()
                    : `${month.slice(0, 4)}年${Number(month.slice(5))}月`}
                </span>
                <button className="icon-btn" onClick={() => setMonth(shiftMonth(month, 1))} aria-label="次の月">
                  <ChevronRight size={16} />
                </button>
              </div>

              {chartMode === 'month' && (
                <>
                  <div className="week-chart">
                    {months.map((x) => {
                      const [y, m] = x.key.split('-').map(Number)
                      return (
                        <button
                          key={x.key}
                          className={`week-col month-col ${x.key === month ? 'is-now' : ''}`}
                          onClick={() => setMonth(x.key)}
                        >
                          <span className="week-amount num">{x.total > 0 ? yen(x.total) : '-'}</span>
                          <div className="week-bar-area">
                            <div className="week-bar" style={{ height: `${(x.total / monthMax) * 100}%` }} />
                          </div>
                          <span className="week-label num">
                            {m}月
                            <br />
                            <span className="year-label">{m === 1 || x === months[0] ? y : '\u00a0'}</span>
                          </span>
                        </button>
                      )
                    })}
                  </div>
                  <p className="week-note">6か月分 ・ 棒をタップするとその月を表示</p>
                </>
              )}

              {chartMode === 'category' && (
                <>
                  <div className="week-chart">
                    {CATEGORIES.map((c) => {
                      const sum = monthCatTotals[c] || 0
                      const { Icon, color, bg } = CATEGORY_STYLE[c]
                      return (
                        <div key={c} className="week-col">
                          <span className="week-amount num">{sum > 0 ? yen(sum) : '-'}</span>
                          <div className="week-bar-area">
                            <div className="week-bar" style={{ height: `${(sum / catMax) * 100}%`, background: color }} />
                          </div>
                          <span className="cat-chart-icon" style={{ background: bg, color }}>
                            <Icon size={15} strokeWidth={1.8} />
                          </span>
                          <span className="week-label">{c}</span>
                        </div>
                      )
                    })}
                  </div>

                </>
              )}

              {chartMode === 'week' && (
              <>
              <div className="week-chart">
                {weeks.map((w) => {
                  const isNow = todayNum >= w.start && todayNum <= w.end
                  return (
                    <div key={w.start} className={`week-col ${isNow ? 'is-now' : ''}`}>
                      <span className="week-amount num">{w.total > 0 ? yen(w.total) : '-'}</span>
                      <div className="week-bar-area">
                        <div className="week-bar" style={{ height: `${(w.total / weekMax) * 100}%` }} />
                      </div>
                      <span className="week-label num">
                        {Number(month.slice(5))}/{w.start}
                        <br />〜{w.end}
                      </span>
                    </div>
                  )
                })}
              </div>
              <p className="week-note">月曜はじまり ・ 濃い色が今週</p>
              </>
              )}
            </section>
            <section className="card">
              <div className="card-head">
                <h2 className="card-title">カテゴリ別</h2>
                <button className="link-btn" onClick={() => setCatBudgetForm({ ...catBudgets })}>
                  <Target size={13} />
                  カテゴリの予算
                </button>
              </div>
              {catRows.length === 0 && <p className="empty-inline">この月の記録はありません。</p>}
              <ul className="cat-list">
                {catRows.map(({ cat, sum, limit }) => {
                  const level = limit > 0 ? budgetLevelOf(sum, limit) : 'ok'
                  return (
                    <li key={cat} className={limit > 0 ? `has-limit level-${level}` : ''}>
                      <CategoryIcon category={cat} />
                      <div className="cat-main">
                        <div className="cat-row">
                          <span>{cat}</span>
                          <span className="num">
                            {yen(sum)}
                            {limit > 0 && <span className="cat-limit"> / {yen(limit)}</span>}
                          </span>
                        </div>
                        <div className="bar">
                          <div
                            style={{
                              width: `${limit > 0 ? Math.min(100, (sum / limit) * 100) : total > 0 ? (sum / total) * 100 : 0}%`,
                            }}
                          />
                        </div>
                        {limit > 0 && (
                          <div className="cat-rest">
                            {level === 'over' ? `${yen(sum - limit)} オーバー` : `のこり ${yen(limit - sum)}`}
                          </div>
                        )}
                      </div>
                    </li>
                  )
                })}
              </ul>
            </section>
          </main>
        </>
      )}

      {tab === 'settings' && (
        <SettingsPage
          settings={settings}
          setSettings={setSettings}
          budget={budget}
          onEditBudget={() => setBudgetInput(budget > 0 ? String(budget) : '')}
          catBudgets={catBudgets}
          onEditCatBudgets={() => setCatBudgetForm({ ...catBudgets })}
          plans={plans}
          onEditPlan={openPlanEdit}
          onBack={() => setTab('home')}
        />
      )}

      <nav className="tabbar">
        {[
          ['home', 'ホーム', House],
          ['history', '買い物履歴', ReceiptText],
          ['calendar', 'カレンダー', CalendarDays],
          ['review', '記録', ChartNoAxesColumnIncreasing],
        ].map(([key, label, Icon]) => (
          <button key={key} className={`tab ${tab === key ? 'active' : ''}`} onClick={() => setTab(key)}>
            <span className="tab-icon"><Icon size={21} strokeWidth={1.8} /></span>
            {label}
          </button>
        ))}
      </nav>

      {showForm && (
        <div className="overlay" onClick={closeForm}>
          <form className="sheet" onClick={(e) => e.stopPropagation()} onSubmit={handleSubmit}>
            <div className="handle" />
            <h2>{editingId ? '記録を編集' : '記録を追加'}</h2>

            <label>
              品名 <span className="required">必須</span>
              <input value={form.name} onChange={update('name')} placeholder="例:牛乳" required autoFocus />
            </label>

            <div className="row">
              <label>
                金額(円)
                <input type="number" inputMode="numeric" min="0" value={form.price} onChange={update('price')} placeholder="0" required />
              </label>
              <label className="qty">
                個数
                <input type="number" inputMode="numeric" min="1" value={form.quantity} onChange={update('quantity')} required />
              </label>
            </div>

            <label>
              カテゴリ
              <select value={form.category} onChange={update('category')}>
                {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
              </select>
            </label>

            <label>
              お店
              <input value={form.store} onChange={update('store')} placeholder="例:〇〇スーパー" />
            </label>

            <div className="row">
              <label>
                日付
                <input type="date" value={form.date} onChange={update('date')} required />
              </label>
              <label className="time">
                時刻
                <input type="time" value={form.time} onChange={update('time')} />
              </label>
            </div>

            <label>
              メモ
              <textarea
                rows="2"
                maxLength="200"
                value={form.memo || ''}
                onChange={update('memo')}
                placeholder="例:特売だった、プレゼント用"
              />
            </label>

            <div className="actions">
              {editingId && (
                <button type="button" className="btn danger" onClick={() => handleDelete(editingId)}>削除</button>
              )}
              <button type="button" className="btn" onClick={closeForm}>キャンセル</button>
              <button type="submit" className="btn primary">保存</button>
            </div>
          </form>
        </div>
      )}

      {planForm && (
        <div className="overlay" onClick={() => setPlanForm(null)}>
          <form className="sheet" onClick={(e) => e.stopPropagation()} onSubmit={savePlan}>
            <div className="handle" />
            <h2>{planForm.id ? '予定を編集' : '予定を追加'}</h2>

            <div className="segment plan-type">
              {[
                ['bill', '引き落とし'],
                ['buy', '買う予定'],
              ].map(([key, label]) => (
                <button
                  key={key}
                  type="button"
                  className={planForm.type === key ? 'active' : ''}
                  style={planForm.type === key ? { background: key === 'bill' ? settings.billColor : settings.buyColor } : undefined}
                  onClick={() =>
                    // 新しい予定では、引き落としは毎月くり返すのを初期値にする
                    setPlanForm({ ...planForm, type: key, repeat: planForm.id ? planForm.repeat : key === 'bill' })
                  }
                >
                  {label}
                </button>
              ))}
            </div>

            <label>
              {planForm.type === 'bill' ? '名前' : '買う物'} <span className="required">必須</span>
              <input
                value={planForm.name}
                onChange={updatePlan('name')}
                placeholder={planForm.type === 'bill' ? '例:家賃、電気代、スマホ代' : '例:洗剤、誕生日プレゼント'}
                required
                autoFocus
              />
            </label>

            <div className="row">
              <label>
                {planForm.type === 'bill' ? '金額(円)' : '予算の目安(円)'}
                <input
                  type="number"
                  inputMode="numeric"
                  min="0"
                  value={planForm.amount}
                  onChange={updatePlan('amount')}
                  placeholder={planForm.type === 'bill' ? '目安でOK' : '未定でもOK'}
                />
              </label>
              <label>
                日付
                <input type="date" value={planForm.date} onChange={updatePlan('date')} required />
              </label>
            </div>

            <label className="toggle">
              <input type="checkbox" checked={planForm.repeat} onChange={updatePlan('repeat')} />
              <span>
                毎月くり返す
                <small>毎月{Number(planForm.date.slice(8, 10))}日に自動でカレンダーに出ます</small>
              </span>
            </label>

            {planForm.type === 'buy' && (
              <label>
                カテゴリ
                <select value={planForm.category} onChange={updatePlan('category')}>
                  {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
                </select>
              </label>
            )}

            <label>
              メモ
              <textarea rows="2" maxLength="200" value={planForm.memo || ''} onChange={updatePlan('memo')} />
            </label>

            {planForm.type === 'buy' && (
              <p className="sheet-note">買ったらカレンダーでチェックを付けると、買い物履歴に記録されます。</p>
            )}

            <div className="actions">
              {planForm.id && (
                <button type="button" className="btn danger" onClick={deletePlan}>削除</button>
              )}
              <button type="button" className="btn" onClick={() => setPlanForm(null)}>キャンセル</button>
              <button type="submit" className="btn primary">保存</button>
            </div>
          </form>
        </div>
      )}

      {catBudgetForm && (
        <div className="overlay" onClick={() => setCatBudgetForm(null)}>
          <form
            className="sheet"
            onClick={(e) => e.stopPropagation()}
            onSubmit={(e) => {
              e.preventDefault()
              // 空欄や0のカテゴリは「予算なし」として保存しない
              const next = {}
              for (const c of CATEGORIES) {
                const v = Math.floor(Number(catBudgetForm[c]) || 0)
                if (v > 0) next[c] = v
              }
              setCatBudgets(next)
              setCatBudgetForm(null)
            }}
          >
            <div className="handle" />
            <h2>カテゴリの予算</h2>
            <p className="sheet-note">カテゴリごとに、1か月に使う金額の上限を決められます。決めないカテゴリは空欄のままでOKです。</p>
            <ul className="cat-budget-list">
              {CATEGORIES.map((c) => (
                <li key={c}>
                  <CategoryIcon category={c} />
                  <span className="cat-budget-name">{c}</span>
                  <input
                    type="number"
                    inputMode="numeric"
                    min="0"
                    placeholder="なし"
                    value={catBudgetForm[c] ?? ''}
                    onChange={(e) => setCatBudgetForm({ ...catBudgetForm, [c]: e.target.value })}
                    aria-label={`${c}の予算`}
                  />
                  <span className="cat-budget-unit">円</span>
                </li>
              ))}
            </ul>
            {(() => {
              const sum = CATEGORIES.reduce((s, c) => s + (Math.floor(Number(catBudgetForm[c]) || 0)), 0)
              return (
                <p className="sheet-note cat-budget-sum">
                  合計 <strong className="num">{yen(sum)}</strong>
                  {budget > 0 && `(月の予算 ${yen(budget)})`}
                </p>
              )
            })()}
            <div className="actions">
              <button type="button" className="btn" onClick={() => setCatBudgetForm(null)}>キャンセル</button>
              <button type="submit" className="btn primary">保存</button>
            </div>
          </form>
        </div>
      )}

      {budgetInput !== null && (
        <div className="overlay" onClick={() => setBudgetInput(null)}>
          <form className="sheet" onClick={(e) => e.stopPropagation()} onSubmit={saveBudget}>
            <div className="handle" />
            <h2>月の予算</h2>
            <p className="sheet-note">
              1か月に使う金額の目安を決めましょう。毎月この金額で計算します。
              引き落とし予定の分は、この予算から自動で引かれます。
            </p>
            <label>
              予算(円)
              <input
                type="number"
                inputMode="numeric"
                min="1"
                value={budgetInput}
                onChange={(e) => setBudgetInput(e.target.value)}
                placeholder="例:30000"
                required
                autoFocus
              />
            </label>
            <div className="actions">
              {budget > 0 && (
                <button
                  type="button"
                  className="btn danger"
                  onClick={() => {
                    setBudget(0)
                    setBudgetInput(null)
                  }}
                >
                  予算をなくす
                </button>
              )}
              <button type="button" className="btn" onClick={() => setBudgetInput(null)}>キャンセル</button>
              <button type="submit" className="btn primary">保存</button>
            </div>
          </form>
        </div>
      )}
    </div>
  )
}
