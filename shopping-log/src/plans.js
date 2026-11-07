// 引き落とし予定・買う予定と、画面の設定をあつかう処理

export const PLANS_KEY = 'shopping-log-plans'
export const SETTINGS_KEY = 'shopping-log-settings'

export const DEFAULT_SETTINGS = {
  billColor: '#3b82c4', // 引き落とし(青)
  buyColor: '#e8913a', // 買う予定(オレンジ)
  markStyle: 'dot', // 'dot' | 'bar' | 'icon'
}

export const COLOR_CHOICES = ['#3b82c4', '#e8913a', '#3f7961', '#c9735a', '#86609a', '#d9a441', '#5a6f94', '#e0699a']

export const MARK_STYLES = [
  ['dot', 'まる'],
  ['bar', 'せん'],
  ['icon', 'アイコン'],
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

export function loadPlans() {
  const v = loadJSON(PLANS_KEY, [])
  return Array.isArray(v) ? v : []
}

export function loadSettings() {
  return { ...DEFAULT_SETTINGS, ...loadJSON(SETTINGS_KEY, {}) }
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
    .sort((a, b) => a.date.localeCompare(b.date) || (a.plan.type === 'bill' ? -1 : 1))
}

export const emptyPlan = (type, date) => ({
  type,
  name: '',
  amount: '',
  date,
  repeat: type === 'bill',
  category: '食費',
  memo: '',
})
