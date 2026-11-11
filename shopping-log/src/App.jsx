import { useEffect, useMemo, useState } from 'react'
import {
  CalendarDays,
  CalendarPlus,
  Landmark,
  ChartNoAxesColumnIncreasing,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  BookOpen,
  House,
  Milk,
  Package,
  PencilLine,
  Plus,
  ReceiptText,
  Shirt,
  ShoppingBasket,
  Target,
  Utensils,
} from 'lucide-react'
import { Settings as SettingsIcon } from 'lucide-react'
import Dog from './Dog.jsx'
import Splash from './Splash.jsx'
import BarChart, { shortYen } from './BarChart.jsx'
import { PlanMark, PlanRow } from './PlanParts.jsx'
import SettingsPage from './SettingsPage.jsx'
import {
  PLANS_KEY,
  SETTINGS_KEY,
  emptyPlan,
  hasAmount,
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

// カテゴリごとのアイコンと色。基本はベージュの箱にオリーブ色のアイコン、
// 日用品と固定費だけうすい赤の箱に赤いアイコン(新しいデザインに合わせる)
const SOFT = { bg: '#ede6d6', color: '#6e6a52' }
const WARM = { bg: '#f5e1da', color: '#b94a38' }
const CATEGORY_STYLE = {
  食費: { Icon: ShoppingBasket, ...SOFT },
  日用品: { Icon: Milk, ...WARM },
  外食: { Icon: Utensils, ...SOFT },
  衣類: { Icon: Shirt, ...SOFT },
  趣味: { Icon: BookOpen, ...SOFT },
  固定費: { Icon: Landmark, ...WARM }, // 家賃・光熱費・スマホ代など
  その他: { Icon: Package, ...SOFT },
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
// budget は「予算 − これからの予定」の使えるお金。hasBudget が false なら予算の話はしない。
function mascotMessage({ cur, prev, isCurrent, hasBudget, budget, total, daysLeft }) {
  const when = isCurrent ? '先月の同じ日まで' : '先月'
  // lead: 小さく出す前置き、main: 大きく出すひとこと、sub: 下に小さく出す補足
  let mood = 'normal'
  let lead = ''
  let main
  if (cur === 0 && prev === 0) {
    main = '買い物を記録すると、先月とくらべて教えるね!'
  } else if (prev === 0) {
    main = 'ここから先月とくらべていこうね!'
  } else if (prev > cur) {
    mood = 'happy'
    lead = `${when}より`
    main = `${yen(prev - cur)} 節約できてるよ!\nすごい!`
  } else if (prev === cur) {
    lead = `${when}と`
    main = 'ぴったり同じくらいだよ。'
  } else {
    mood = 'worried'
    lead = `${when}より`
    main = `${yen(cur - prev)} 多く使ってるよ。`
  }

  let sub = ''
  if (hasBudget) {
    if (total > budget) {
      mood = 'worried'
      sub = `使えるお金を ${yen(total - budget)} オーバーしちゃった…`
    } else if (isCurrent && daysLeft > 0) {
      sub = `1日 ${yen(Math.floor((budget - total) / daysLeft))} くらいまで使えるよ。`
    } else {
      sub = '予算の中におさまったね!'
    }
  }
  return { mood, lead, main, sub }
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
  const [chartSel, setChartSel] = useState(null) // グラフでタップした棒
  // グラフの種類や月を変えたら、タップした棒の選択を外す
  useEffect(() => setChartSel(null), [chartMode, month])
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
      if (d === 1 || new Date(y, m - 1, d).getDay() === 1) list.push({ start: d, end: d, total: 0, count: 0 })
      list[list.length - 1].end = d
    }
    for (const i of monthItems) {
      const d = Number(i.date.slice(8, 10))
      const w = list.find((w) => d >= w.start && d <= w.end)
      if (w) {
        w.total += itemTotal(i)
        w.count += 1
      }
    }
    return list
  }, [month, monthItems])

  // 選んだ月までの6か月分の合計(カテゴリ別の内訳つき)
  const months = useMemo(() => {
    const list = Array.from({ length: 6 }, (_, k) => ({ key: shiftMonth(month, k - 5), total: 0, count: 0, cats: {} }))
    for (const i of items) {
      const mo = list.find((x) => i.date.startsWith(x.key))
      if (!mo) continue
      mo.total += itemTotal(i)
      mo.count += 1
      mo.cats[i.category] = (mo.cats[i.category] || 0) + itemTotal(i)
    }
    return list
  }, [items, month])
  const monthCatTotals = Object.fromEntries(byCategory)
  // 記録画面のカテゴリ一覧: 使ったカテゴリ + 予算を決めたカテゴリ
  const catRows = CATEGORIES.filter((c) => monthCatTotals[c] || catBudgets[c] > 0)
    .map((c) => ({ cat: c, sum: monthCatTotals[c] || 0, limit: catBudgets[c] || 0 }))
    .sort((a, b) => b.sum - a.sum)
  const overCats = catRows.filter((r) => r.limit > 0 && r.sum > r.limit)
  const todayNum = month === today().slice(0, 7) ? Number(today().slice(8, 10)) : 0

  // 記録画面のグラフに渡すデータ
  const monthNum = Number(month.slice(5))
  const chartBars =
    chartMode === 'week'
      ? weeks.map((w) => ({
          key: `w${w.start}`,
          label: `${monthNum}/${w.start}〜`,
          tipLabel: `${monthNum}/${w.start}〜${monthNum}/${w.end}`,
          value: w.total,
          count: w.count,
          strong: todayNum >= w.start && todayNum <= w.end,
        }))
      : chartMode === 'month'
        ? months.map((x) => {
            const [y, m] = x.key.split('-').map(Number)
            return { key: x.key, label: `${m}月`, tipLabel: `${y}年${m}月`, value: x.total, count: x.count, strong: x.key === month }
          })
        : CATEGORIES.map((c) => {
            const { Icon, color } = CATEGORY_STYLE[c]
            return {
              key: c,
              label: c,
              value: monthCatTotals[c] || 0,
              count: monthItems.filter((i) => i.category === c).length,
              color,
              limit: catBudgets[c] || 0,
              icon: <Icon size={14} strokeWidth={1.8} color={color} />,
            }
          })
  // 予算の目安線: 週ごとは「月の予算 ÷ 日数 × 7日」、月ごとは月の予算
  const chartGuide =
    budget > 0 && chartMode === 'week'
      ? { value: Math.round((budget / daysInMonth(month)) * 7), label: `1週の目安 ${shortYen(Math.round((budget / daysInMonth(month)) * 7))}` }
      : budget > 0 && chartMode === 'month'
        ? { value: budget, label: `月の予算 ${shortYen(budget)}` }
        : null

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
  const entriesByDate = useMemo(() => {
    const map = {}
    for (const e of monthEntries) (map[e.date] ||= []).push(e)
    return map
  }, [monthEntries])
  const dayEntries = useMemo(
    () => planEntries(plans, selectedDay.slice(0, 7)).filter((e) => e.date === selectedDay),
    [plans, selectedDay],
  )
  // 予定が完了済みか(記録を履歴から消していたら、未完了にもどす)
  const isDone = (plan, date) => {
    const id = plan.done?.[date]
    return Boolean(id) && items.some((i) => i.id === id)
  }
  // 完了したときに買い物履歴に入れた金額
  const doneAmountOf = (plan, date) => {
    const item = items.find((i) => i.id === plan.done?.[date])
    return item ? itemTotal(item) : null
  }
  // まだ完了していない予定(金額が決まっているものの合計と、金額未定の件数)
  const pendingEntries = monthEntries.filter((e) => !isDone(e.plan, e.date))
  const upcomingTotal = pendingEntries.filter((e) => hasAmount(e.plan)).reduce((s, e) => s + Number(e.plan.amount), 0)
  const unknownCount = pendingEntries.filter((e) => !hasAmount(e.plan)).length
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

  const togglePlan = (plan, date) => {
    if (isDone(plan, date)) {
      if (!confirm('完了を取り消すと、買い物履歴からこの記録も消えます。よろしいですか?')) return
      setItems(items.filter((i) => i.id !== plan.done[date]))
      markDone(plan.id, date, null)
      return
    }
    if (hasAmount(plan)) {
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

  const openPlanNew = (date) => setPlanForm(emptyPlan(date))
  const openPlanEdit = (plan) => setPlanForm({ ...plan, amount: plan.amount ? String(plan.amount) : '' })
  const updatePlan = (key) => (e) =>
    setPlanForm({ ...planForm, [key]: e.target.type === 'checkbox' ? e.target.checked : e.target.value })

  const savePlan = (e) => {
    e.preventDefault()
    if (!planForm.name.trim()) return
    const amount = Math.max(0, Math.floor(Number(planForm.amount) || 0))
    const data = {
      name: planForm.name.trim(),
      amount: planForm.amountUnknown ? 0 : amount,
      // 「金額未定」にチェックしたか、金額を入れていなければ未定あつかい
      amountUnknown: Boolean(planForm.amountUnknown) || amount === 0,
      date: planForm.date,
      repeat: Boolean(planForm.repeat),
      category: planForm.category || 'その他',
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
  // 使えるお金 = 予算 − これからの予定(金額が決まっているもの)。使った金額は total
  const spendable = budget - upcomingTotal
  const talk = mascotMessage({
    cur: sumUntil(month),
    prev: sumUntil(shiftMonth(month, -1)),
    isCurrent: isCurrentMonth,
    hasBudget: budget > 0,
    budget: spendable,
    total,
    daysLeft: isCurrentMonth ? daysInMonth(month) - now.getDate() + 1 : 0,
  })

  // 3日以内のまだ完了していない予定をキャラクターが知らせる
  const planNotice = (() => {
    const t = today()
    const nextMonth = shiftMonth(t.slice(0, 7), 1)
    const upcoming = plans
      .flatMap((p) => [...occurrences(p, t.slice(0, 7)), ...occurrences(p, nextMonth)].map((date) => ({ p, date })))
      .filter(({ p, date }) => !isDone(p, date))
      .map(({ p, date }) => ({ p, diff: Math.round((new Date(date + 'T00:00:00') - new Date(t + 'T00:00:00')) / 86400000) }))
      .filter((x) => x.diff >= 0 && x.diff <= 3)
      .sort((a, b) => a.diff - b.diff)[0]
    if (!upcoming) return ''
    const when = ['今日', '明日', 'あさって', '3日後'][upcoming.diff]
    const amount = hasAmount(upcoming.p) ? `(${yen(upcoming.p.amount)})` : '(金額未定)'
    return `${when}は「${upcoming.p.name}」${amount}の予定があるよ。`
  })()

  // カテゴリ別の予算をこえたら、キャラクターが知らせる
  const catNotice =
    overCats.length === 0
      ? ''
      : overCats.length === 1
        ? `${overCats[0].cat}が予算を ${yen(overCats[0].sum - overCats[0].limit)} オーバーしてるよ。`
        : `${overCats.map((r) => r.cat).join('と')}が予算オーバーだよ。`
  if (catNotice) talk.mood = 'worried'

  // 使った金額 + これからの予定 が予算に対してどれくらいか
  const budgetRate = budget > 0 ? (total + upcomingTotal) / budget : 0
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
            <h1>おかいもの日記</h1>
            <button className="icon-btn settings-btn" onClick={() => setTab('settings')} aria-label="設定">
              <SettingsIcon size={22} strokeWidth={1.7} />
            </button>
          </header>

          <main className="content">
            {/* 犬のキャラクターが先月との比較を教えてくれる */}
            <section className="hero">
              <div className="hero-text">
                <div className="page-date">{now.getMonth() + 1}月{now.getDate()}日({WEEK[now.getDay()]})</div>
                {talk.lead && <p className="hero-lead">{talk.lead}</p>}
                <p className="hero-main">{talk.main}</p>
                {talk.sub && <p className="hero-sub">{talk.sub}</p>}
              </div>
              <Dog mood={talk.mood} size={112} />
            </section>

            <section className="month-card flat">
              <div className="card-head">
                <h2>今月のお買い物</h2>
                <MonthSelect month={month} onChange={setMonth} />
              </div>
              <div className="month-body">
                <div className="month-total num">
                  <span className="yen-mark">¥</span>
                  {total.toLocaleString('ja-JP')}
                </div>
                {/* 押すと、同じ月の買い物履歴を開く */}
                <button className="month-count" onClick={() => setTab('history')} aria-label="買い物履歴を見る">
                  <span className="count-value">
                    <span className="count-num num">{monthItems.length}</span> 件
                  </span>
                  <span className="count-label">記録した買い物</span>
                </button>
              </div>

              {budget > 0 ? (
                <div className={`budget level-${budgetLevel}`}>
                  <div className="budget-row">
                    <span className="budget-rest">
                      {budgetLevel === 'over' ? (
                        <>オーバー <span className="num">{yen(total + upcomingTotal - budget)}</span></>
                      ) : (
                        <>のこり <span className="num">{yen(budget - total - upcomingTotal)}</span></>
                      )}
                    </span>
                    <button className="link-btn budget-edit" onClick={() => setBudgetInput(String(budget))}>
                      予算 {yen(budget)}
                    </button>
                  </div>
                  {/* 濃い色が使った金額、うすい色がこれからの予定 */}
                  <div className="budget-bar">
                    <div style={{ width: `${Math.min(100, (total / budget) * 100)}%` }} />
                    <div
                      className="budget-bar-plan"
                      style={{ width: `${Math.max(0, Math.min(100 - (total / budget) * 100, (upcomingTotal / budget) * 100))}%` }}
                    />
                  </div>
                  {(upcomingTotal > 0 || unknownCount > 0) && (
                    <button className="budget-calc" onClick={() => setTab('calendar')}>
                      使った {yen(total)} + これからの予定 {yen(upcomingTotal)}
                      {unknownCount > 0 && (
                        <>
                          <br />
                          ほかに金額未定 {unknownCount}件
                        </>
                      )}
                    </button>
                  )}
                </div>
              ) : (
                <button className="link-btn budget-set" onClick={() => setBudgetInput('')}>
                  <Target size={14} />
                  月の予算を決める
                </button>
              )}
              {(catNotice || planNotice) && (
                <div className="notices">
                  {catNotice && <p>{catNotice}</p>}
                  {planNotice && <p>{planNotice}</p>}
                </div>
              )}
            </section>

            <button className="btn-receipt" onClick={() => openNew()}>
              <Plus size={20} strokeWidth={2} />
              買い物を記録する
            </button>

            <section>
              <div className="section-head">
                <h2>最近のお買い物</h2>
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
          <main className="content page-history">
            <section className="total-card">
              <h2>この月の合計</h2>
              <div className="total-row">
                <div className="month-total num">{yen(total)}</div>
                <div className="count-label">{monthItems.length} 件の買い物</div>
              </div>
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
          <main className="content page-calendar">
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
                        {/* 予定がいくつあっても印は1つ。全部完了していたらうすくする */}
                        {entriesByDate[c.date]?.length > 0 && (
                          <PlanMark
                            settings={settings}
                            faded={entriesByDate[c.date].every((e) => isDone(e.plan, e.date))}
                          />
                        )}
                      </span>
                    </button>
                  ) : (
                    <div key={`blank-${i}`} />
                  ),
                )}
              </div>
              <div className="cal-legend">
                <span className="legend-item">
                  <PlanMark settings={settings} /> 予定
                </span>
                {(upcomingTotal > 0 || unknownCount > 0) && (
                  <span className="legend-item">
                    これからの予定 <span className="num">{yen(upcomingTotal)}</span>
                    {unknownCount > 0 && ` + 金額未定 ${unknownCount}件`}
                  </span>
                )}
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
                        doneAmount={doneAmountOf(e.plan, e.date)}
                        settings={settings}
                        categoryIcon={<CategoryIcon category={e.plan.category || 'その他'} />}
                        onEdit={() => openPlanEdit(e.plan)}
                        onToggle={() => togglePlan(e.plan, e.date)}
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
                  <button className="link-btn" onClick={() => openPlanNew(selectedDay)}>
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

              <BarChart
                bars={chartBars}
                guide={chartGuide}
                selectedKey={chartSel}
                onSelect={setChartSel}
                amountBelow={chartMode === 'category'}
                // 週ごと・月ごとはラベルが1段なので、カテゴリ別(3段)との差の33pxぶんグラフを高くする
                height={chartMode === 'category' ? 150 : 183}
              />
              <p className="week-note">
                {chartMode === 'week' && '月曜はじまり ・ 濃い色が今週'}
                {chartMode === 'month' && '6か月分 ・ 濃い色が選んでいる月'}
                {chartMode === 'category' && '点線の枠は予算 ・ 赤字はオーバー'}
                {' ・ 棒をタップで詳しく'}
              </p>
            </section>
            <section className="card cat-card">
              <div className="card-head">
                <h2 className="card-title">カテゴリ別</h2>
                <button className="link-btn" onClick={() => setCatBudgetForm({ ...catBudgets })}>
                  <PencilLine size={13} />
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
          // 固定費は毎月くり返す予定として、カテゴリ「固定費」で追加する
          onAddFixed={() => setPlanForm({ ...emptyPlan(today()), repeat: true, category: '固定費' })}
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

            <label>
              名前 <span className="required">必須</span>
              <input
                value={planForm.name}
                onChange={updatePlan('name')}
                placeholder="例:家賃、電気代、洗剤、誕生日プレゼント"
                required
                autoFocus
              />
            </label>

            <div className="row">
              <label>
                金額(円)
                <input
                  type="number"
                  inputMode="numeric"
                  min="0"
                  value={planForm.amountUnknown ? '' : planForm.amount}
                  onChange={updatePlan('amount')}
                  placeholder={planForm.amountUnknown ? '未定' : '0'}
                  disabled={planForm.amountUnknown}
                />
              </label>
              <label>
                日付
                <input type="date" value={planForm.date} onChange={updatePlan('date')} required />
              </label>
            </div>

            <label className="toggle">
              <input type="checkbox" checked={Boolean(planForm.amountUnknown)} onChange={updatePlan('amountUnknown')} />
              <span>
                金額未定
                <small>電気代などあとで金額がわかるもの。完了するときに金額を入れます</small>
              </span>
            </label>

            <label className="toggle">
              <input type="checkbox" checked={Boolean(planForm.repeat)} onChange={updatePlan('repeat')} />
              <span>
                毎月くり返す
                <small>毎月{Number(planForm.date.slice(8, 10))}日に自動でカレンダーに出ます</small>
              </span>
            </label>

            <label>
              カテゴリ
              <select value={planForm.category || 'その他'} onChange={updatePlan('category')}>
                {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
              </select>
            </label>

            <label>
              メモ
              <textarea rows="2" maxLength="200" value={planForm.memo || ''} onChange={updatePlan('memo')} />
            </label>

            <p className="sheet-note">予定どおりに済んだら、カレンダーで「完了」を押すと買い物履歴に記録されます。</p>

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
