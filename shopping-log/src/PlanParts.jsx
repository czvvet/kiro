import { Bell, Check, Flag, Heart, MapPin, Repeat, Star } from 'lucide-react'
import { hasAmount } from './plans.js'

const yen = (n) => `¥${Number(n).toLocaleString('ja-JP')}`

const ICON_MARKS = { star: Star, heart: Heart, flag: Flag, pin: MapPin, bell: Bell }

// カレンダーのマスに付ける小さな印
export function PlanMark({ settings, style: markStyle, faded = false, size = 11 }) {
  const color = settings.planColor
  const kind = markStyle || settings.markStyle
  const opacity = faded ? 0.35 : 1
  const Icon = ICON_MARKS[kind]
  if (Icon) {
    return <Icon className="mark-icon" size={size} color={color} fill={color} strokeWidth={1.5} style={{ opacity }} />
  }
  if (kind === 'ring') return <span className="mark mark-ring" style={{ opacity, borderColor: color }} />
  return <span className={`mark mark-${kind}`} style={{ opacity, background: color }} />
}

// 予定の1行。左にカテゴリのアイコン、右に「完了」ボタン(押したあとは✓だけ)
export function PlanRow({ plan, done, doneAmount, settings, categoryIcon, onEdit, onToggle }) {
  const color = settings.planColor
  let amountText = hasAmount(plan) ? yen(plan.amount) : '金額未定'
  if (done && doneAmount != null) amountText = yen(doneAmount)
  return (
    <li className={`plan-row ${done ? 'is-done' : ''}`}>
      <span className="plan-cat">{categoryIcon}</span>
      <button className="plan-main" onClick={onEdit}>
        <span className="plan-name">{plan.name}</span>
        <span className="plan-sub">
          <span className={`num ${!hasAmount(plan) && !done ? 'is-unknown' : ''}`}>{amountText}</span>
          {plan.category && ` ・ ${plan.category}`}
          {plan.repeat && (
            <>
              {' ・ '}
              <Repeat size={10} /> 毎月
            </>
          )}
        </span>
      </button>
      {done ? (
        <button
          className="bought-btn is-done"
          style={{ background: color, borderColor: color }}
          onClick={onToggle}
          aria-label="完了のチェックを外す"
        >
          <Check size={17} color="#fff" strokeWidth={3} />
        </button>
      ) : (
        <button className="bought-btn" style={{ borderColor: color, color }} onClick={onToggle}>
          完了
        </button>
      )}
    </li>
  )
}
