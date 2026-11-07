import { Check, Landmark, Repeat, ShoppingCart } from 'lucide-react'

const yen = (n) => `¥${Number(n).toLocaleString('ja-JP')}`

// カレンダーのマスに付ける小さな印
export function PlanMark({ type, settings, faded = false }) {
  const color = type === 'bill' ? settings.billColor : settings.buyColor
  const style = { opacity: faded ? 0.35 : 1 }
  if (settings.markStyle === 'icon') {
    const Icon = type === 'bill' ? Landmark : ShoppingCart
    return <Icon className="mark-icon" size={11} color={color} strokeWidth={2.4} style={style} />
  }
  return <span className={`mark mark-${settings.markStyle}`} style={{ ...style, background: color }} />
}

const RepeatLabel = () => (
  <>
    {' ・ '}
    <Repeat size={10} /> 毎月
  </>
)

// 予定の1行。
// 引き落とし: 左にアイコン、右に金額。
// 買う予定: 左にカテゴリのアイコン、右に「買った」ボタン(押したあとは✓だけ)。
export function PlanRow({ plan, done, settings, categoryIcon, onEdit, onToggle }) {
  if (plan.type === 'bill') {
    const color = settings.billColor
    return (
      <li className="plan-row">
        <span className="plan-icon" style={{ background: `${color}1f`, color }}>
          <Landmark size={19} strokeWidth={1.9} />
        </span>
        <button className="plan-main" onClick={onEdit}>
          <span className="plan-name">{plan.name}</span>
          <span className="plan-sub">
            <span style={{ color }}>引き落とし</span>
            {plan.repeat && <RepeatLabel />}
          </span>
        </button>
        <span className="plan-amount num">{plan.amount > 0 ? yen(plan.amount) : '-'}</span>
      </li>
    )
  }

  const color = settings.buyColor
  return (
    <li className={`plan-row ${done ? 'is-done' : ''}`}>
      <span className="plan-cat">{categoryIcon}</span>
      <button className="plan-main" onClick={onEdit}>
        <span className="plan-name">{plan.name}</span>
        <span className="plan-sub">
          <span className="num">{plan.amount > 0 ? yen(plan.amount) : '金額未定'}</span>
          {plan.category && ` ・ ${plan.category}`}
          {plan.repeat && <RepeatLabel />}
        </span>
      </button>
      {done ? (
        <button
          className="bought-btn is-done"
          style={{ background: color, borderColor: color }}
          onClick={onToggle}
          aria-label="買ったチェックを外す"
        >
          <Check size={17} color="#fff" strokeWidth={3} />
        </button>
      ) : (
        <button className="bought-btn" style={{ borderColor: color, color }} onClick={onToggle}>
          買った
        </button>
      )}
    </li>
  )
}
