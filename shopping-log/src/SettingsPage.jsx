import { ChevronLeft, ChevronRight, PencilLine, Plus } from 'lucide-react'
import { COLOR_CHOICES, DEFAULT_SETTINGS, MARK_STYLES, hasAmount } from './plans.js'
import { PlanMark } from './PlanParts.jsx'

const yen = (n) => `¥${Number(n).toLocaleString('ja-JP')}`

function ColorPicker({ label, value, onChange }) {
  return (
    <div className="setting-block">
      <div className="setting-label">{label}</div>
      <div className="swatches">
        {COLOR_CHOICES.map((c) => (
          <button
            key={c}
            className={`swatch ${c === value ? 'is-selected' : ''}`}
            style={{ background: c }}
            onClick={() => onChange(c)}
            aria-label={`色 ${c}`}
            aria-pressed={c === value}
          />
        ))}
      </div>
    </div>
  )
}

export default function SettingsPage({
  settings,
  setSettings,
  budget,
  onEditBudget,
  catBudgets,
  onEditCatBudgets,
  plans,
  onEditPlan,
  onAddFixed,
  onBack,
}) {
  const catEntries = Object.entries(catBudgets).filter(([, v]) => v > 0)
  const set = (key) => (value) => setSettings({ ...settings, [key]: value })
  const repeating = plans.filter((p) => p.repeat).sort((a, b) => a.date.slice(8).localeCompare(b.date.slice(8)))

  return (
    <>
      <header className="page-header">
        <div className="header-with-back">
          <button className="icon-btn" onClick={onBack} aria-label="もどる">
            <ChevronLeft size={18} />
          </button>
          <h1>設定</h1>
        </div>
      </header>

      <main className="content">
        <section className="card settings-card">
          <h2 className="card-title">月の予算</h2>
          <button className="setting-row" onClick={onEditBudget}>
            <span>{budget > 0 ? yen(budget) : 'まだ決めていません'}</span>
            <PencilLine size={15} />
          </button>
          <p className="setting-note">予算から、使った金額とこれからの予定(金額が決まっているもの)を引いた分が「のこり」になります。</p>
        </section>

        <section className="card settings-card">
          <h2 className="card-title">カテゴリ別の予算</h2>
          <button className="setting-row cat-budget-summary" onClick={onEditCatBudgets}>
            {catEntries.length === 0 ? (
              <span>まだ決めていません</span>
            ) : (
              // カテゴリ名と金額を1行ずつ、左右にそろえて並べる
              <ul className="cat-budget-lines">
                {catEntries.map(([c, v]) => (
                  <li key={c}>
                    <span>{c}</span>
                    <span className="num">{yen(v)}</span>
                  </li>
                ))}
              </ul>
            )}
            <PencilLine size={15} />
          </button>
          <p className="setting-note">「記録」の画面で、カテゴリごとに予算までの残りが見られます。</p>
        </section>

        <section className="card settings-card">
          <h2 className="card-title">カレンダーの印</h2>

          <div className="setting-block">
            <div className="setting-label">印の形</div>
            <div className="mark-grid">
              {MARK_STYLES.map(([key, label]) => (
                <button
                  key={key}
                  className={`mark-option ${settings.markStyle === key ? 'is-selected' : ''}`}
                  onClick={() => set('markStyle')(key)}
                  aria-pressed={settings.markStyle === key}
                >
                  <span className="mark-option-preview">
                    <PlanMark settings={settings} style={key} size={16} />
                  </span>
                  {label}
                </button>
              ))}
            </div>
          </div>

          <ColorPicker label="予定の色" value={settings.planColor} onChange={set('planColor')} />

          <button className="link-btn" onClick={() => setSettings({ ...DEFAULT_SETTINGS })}>
            はじめの設定にもどす
          </button>
        </section>

        <section className="card settings-card">
          <h2 className="card-title">毎月くり返す予定</h2>
          {repeating.length === 0 ? (
            <p className="setting-note">
              家賃や電気代などを「固定費を追加」から登録すると、毎月カレンダーに出ます。カレンダーで「毎月くり返す」を選んだ予定も、ここに並びます。
            </p>
          ) : (
            <ul className="setting-list">
              {repeating.map((p) => (
                <li key={p.id}>
                  <button className="setting-row" onClick={() => onEditPlan(p)}>
                    <span className="legend-item">
                      <PlanMark settings={settings} />
                      毎月{Number(p.date.slice(8))}日 {p.name}
                    </span>
                    <span className="setting-row-end">
                      <span className="num">{hasAmount(p) ? yen(p.amount) : '金額未定'}</span>
                      <ChevronRight size={15} />
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
          {/* 家賃・光熱費などを、毎月くり返す「固定費」の予定として追加する */}
          <button className="add-fixed-btn" onClick={onAddFixed}>
            <Plus size={16} strokeWidth={2} />
            固定費を追加
          </button>
        </section>
      </main>
    </>
  )
}
