// 入力画面で使う、アプリのデザインに合わせた選択部品
// (ブラウザ標準のリスト・カレンダー・時刻選択は見た目を変えられないため、自前で作る)
//   SelectField: カテゴリなどを選ぶリスト
//   DateField:   日付を選ぶカレンダー
//   TimeField:   時と分を選ぶ2列のリスト
import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Check, ChevronDown, ChevronLeft, ChevronRight } from 'lucide-react'

const pad = (n) => String(n).padStart(2, '0')
const WEEK = '日月火水木金土'
const todayStr = () => {
  const d = new Date()
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

// ボタンの下にパネルを出す。下に入りきらないときは上に出す
function placePanel(el, width, height) {
  const r = el.getBoundingClientRect()
  const w = width === 'trigger' ? r.width : width
  let left = Math.min(r.left, window.innerWidth - w - 12)
  left = Math.max(12, left)
  let top = r.bottom + 6
  if (top + height > window.innerHeight - 12) top = Math.max(12, r.top - 6 - height)
  return { top, left, width: w }
}

// パネルは body の直下に出す。
// 入力欄の <label> の中に置くと、外側をタップして閉じても
// ラベルのはたらきでボタンがもう一度押され、すぐ開き直してしまうため
function Panel({ pos, onClose, children, label }) {
  return createPortal(
    <div className="picker-overlay" onClick={onClose}>
      <div
        className="picker-panel"
        role="dialog"
        aria-label={label}
        style={{ top: pos.top, left: pos.left, width: pos.width }}
        onClick={(e) => e.stopPropagation()}
      >
        {children}
      </div>
    </div>,
    document.body,
  )
}

// ---------- カテゴリなどのリスト ----------
export function SelectField({ value, options, onChange, label }) {
  const [pos, setPos] = useState(null)
  const open = (e) => setPos(placePanel(e.currentTarget, 'trigger', options.length * 42 + 12))
  return (
    <>
      <button type="button" className="field-trigger" onClick={open} aria-haspopup="listbox">
        <span>{value}</span>
        <ChevronDown size={16} />
      </button>
      {pos && (
        <Panel pos={pos} onClose={() => setPos(null)} label={label}>
          <ul className="select-list" role="listbox">
            {options.map((o) => (
              <li key={o}>
                <button
                  type="button"
                  role="option"
                  aria-selected={o === value}
                  className={`select-option ${o === value ? 'is-selected' : ''}`}
                  onClick={() => {
                    onChange(o)
                    setPos(null)
                  }}
                >
                  {o}
                  {o === value && <Check size={16} strokeWidth={2.4} />}
                </button>
              </li>
            ))}
          </ul>
        </Panel>
      )}
    </>
  )
}

// ---------- 日付のカレンダー ----------
export function DateField({ value, onChange, label }) {
  const [pos, setPos] = useState(null)
  const [view, setView] = useState(value.slice(0, 7)) // 表示している月 "YYYY-MM"

  const open = (e) => {
    setView(value.slice(0, 7))
    setPos(placePanel(e.currentTarget, 300, 360))
  }
  const shift = (diff) => {
    const [y, m] = view.split('-').map(Number)
    const d = new Date(y, m - 1 + diff, 1)
    setView(`${d.getFullYear()}-${pad(d.getMonth() + 1)}`)
  }
  const pick = (date) => {
    onChange(date)
    setPos(null)
  }

  const [y, m] = view.split('-').map(Number)
  const first = new Date(y, m - 1, 1).getDay()
  const days = new Date(y, m, 0).getDate()
  const cells = [...Array(first).fill(null), ...Array.from({ length: days }, (_, i) => i + 1)]
  const t = todayStr()
  const d = new Date(value + 'T00:00:00')

  return (
    <>
      <button type="button" className="field-trigger" onClick={open} aria-haspopup="dialog">
        <span className="num">
          {value.replace(/-/g, '/')}
          <span className="field-dow">({WEEK[d.getDay()]})</span>
        </span>
        <ChevronDown size={16} />
      </button>
      {pos && (
        <Panel pos={pos} onClose={() => setPos(null)} label={label}>
          <div className="picker-head">
            <button type="button" className="icon-btn" onClick={() => shift(-1)} aria-label="前の月">
              <ChevronLeft size={16} />
            </button>
            <span className="num">{y}年{m}月</span>
            <button type="button" className="icon-btn" onClick={() => shift(1)} aria-label="次の月">
              <ChevronRight size={16} />
            </button>
          </div>
          <div className="date-grid">
            {[...WEEK].map((w, i) => (
              <span key={w} className={`date-dow dow-${i}`}>{w}</span>
            ))}
            {cells.map((day, i) => {
              if (!day) return <span key={`b${i}`} />
              const date = `${view}-${pad(day)}`
              return (
                <button
                  type="button"
                  key={date}
                  className={[
                    'date-cell',
                    `dow-${i % 7}`,
                    date === value && 'is-selected',
                    date === t && 'is-today',
                  ].filter(Boolean).join(' ')}
                  onClick={() => pick(date)}
                >
                  {day}
                </button>
              )
            })}
          </div>
          <div className="picker-foot">
            <button type="button" className="link-btn" onClick={() => pick(t)}>今日</button>
            <button type="button" className="link-btn sub" onClick={() => setPos(null)}>とじる</button>
          </div>
        </Panel>
      )}
    </>
  )
}

// ---------- 時刻(時と分の2列) ----------
export function TimeField({ value, onChange, label }) {
  const [pos, setPos] = useState(null)
  const [h, mi] = value ? value.split(':') : ['', '']
  const hourRef = useRef(null)
  const minRef = useRef(null)

  // 開いたとき、選んでいる時・分が見えるところまでリストを動かす
  useEffect(() => {
    if (!pos) return
    for (const ref of [hourRef, minRef]) {
      const sel = ref.current?.querySelector('.is-selected')
      if (sel) ref.current.scrollTop = sel.offsetTop - ref.current.clientHeight / 2 + sel.clientHeight / 2
    }
  }, [pos])

  const open = (e) => setPos(placePanel(e.currentTarget, 220, 300))
  const set = (nh, nm) => onChange(`${nh}:${nm}`)
  const nowTime = () => {
    const d = new Date()
    return `${pad(d.getHours())}:${pad(d.getMinutes())}`
  }

  return (
    <>
      <button type="button" className="field-trigger" onClick={open} aria-haspopup="dialog">
        <span className={value ? 'num' : 'field-empty'}>{value || 'なし'}</span>
        <ChevronDown size={16} />
      </button>
      {pos && (
        <Panel pos={pos} onClose={() => setPos(null)} label={label}>
          <div className="time-cols">
            <div className="time-col" ref={hourRef}>
              {Array.from({ length: 24 }, (_, i) => pad(i)).map((x) => (
                <button
                  type="button"
                  key={x}
                  className={`time-cell num ${x === h ? 'is-selected' : ''}`}
                  onClick={() => set(x, mi || '00')}
                >
                  {Number(x)}時
                </button>
              ))}
            </div>
            <div className="time-col" ref={minRef}>
              {Array.from({ length: 60 }, (_, i) => pad(i)).map((x) => (
                <button
                  type="button"
                  key={x}
                  className={`time-cell num ${x === mi ? 'is-selected' : ''}`}
                  onClick={() => set(h || '00', x)}
                >
                  {x}分
                </button>
              ))}
            </div>
          </div>
          <div className="picker-foot">
            <button type="button" className="link-btn" onClick={() => onChange(nowTime())}>今</button>
            <button type="button" className="link-btn sub" onClick={() => onChange('')}>なしにする</button>
            <button type="button" className="link-btn" onClick={() => setPos(null)}>決定</button>
          </div>
        </Panel>
      )}
    </>
  )
}
