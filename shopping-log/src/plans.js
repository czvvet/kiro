// 予定(引き落とし・買う予定をまとめたもの)と、画面の設定をあつかう処理

export const PLANS_KEY = 'shopping-log-plans'
export const SETTINGS_KEY = 'shopping-log-settings'

export const DEFAULT_SETTINGS = {
  planColor: '#e8913a', // 予定の色(オレンジ)
  markStyle: 'dot',
}

export const COLOR_CHOICES = ['#e8913a', '#3b82c4', '#3f7961', '#c9735a', '#86609a', '#d9a441', '#5a6f94', '#e0699a']

// カレンダーの印の形
export const MARK_STYLES = [
  ['dot', 'まる'],
  ['ring', 'わっか'],
  ['bar', 'せん'],
  ['star', 'ほし'],
  ['heart', 'ハート'],
  ['flag', 'はた'],
  ['pin', 'ピン'],
  ['bell', 'ベル'],
]

const pad = (n) => String(n).padStart(2, '0')
const daysInMonth = (month) => {
  const [y, m] = month.split('-').map(Number)
  return new Date(y, m, 0).getDate()
}

function loadJSON(key, fallback) {
  try {
    const v = JSON.parse(localStorage.getItem(key))
    return v ?? fallback
  } catch {
    return fallback
  }
}

// 以前の「引き落とし / 買う予定」の2種類の予定を、1種類の予定に読み替える
export function loadPlans() {
  const v = loadJSON(PLANS_KEY, [])
  if (!Array.isArray(v)) return []
  return v.map((p) => {
    const { type, ...rest } = p
    const plan = { ...rest }
    if (type === 'bill' && !plan.category) plan.category = '固定費'
    if (plan.amountUnknown === undefined) plan.amountUnknown = !(Number(plan.amount) > 0)
    return plan
  })
}

export function loadSettings() {
  const saved = loadJSON(SETTINGS_KEY, {})
  const s = { ...DEFAULT_SETTINGS, ...saved }
  // 以前の設定では「買う予定の色」を予定の色として使う
  if (!saved.planColor && saved.buyColor) s.planColor = saved.buyColor
  if (!MARK_STYLES.some(([k]) => k === s.markStyle)) s.markStyle = 'dot'
  delete s.billColor
  delete s.buyColor
  return s
}

// その月に予定が出る日付。
// 毎月くり返す予定は、登録した日の「日」に出す(31日のように月にない日は月末にずらす)。
export function occurrences(plan, month) {
  if (plan.repeat) {
    if (month < plan.date.slice(0, 7)) return []
    const day = Math.min(Number(plan.date.slice(8, 10)), daysInMonth(month))
    return [`${month}-${pad(day)}`]
  }
  return plan.date.startsWith(month) ? [plan.date] : []
}

// その月の予定を { plan, date } の形で日付順に並べる
export function planEntries(plans, month) {
  return plans
    .flatMap((plan) => occurrences(plan, month).map((date) => ({ plan, date })))
    .sort((a, b) => a.date.localeCompare(b.date))
}

// 金額が決まっている予定か
export const hasAmount = (plan) => !plan.amountUnknown && Number(plan.amount) > 0

export const emptyPlan = (date) => ({
  name: '',
  amount: '',
  amountUnknown: false,
  date,
  repeat: false,
  category: '食費',
  memo: '',
})
