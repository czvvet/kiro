// 記録画面の棒グラフ(週ごと・月ごと・カテゴリ別で共通)
//
// bars: [{ key, label, tipLabel, value, count, color, strong, limit, icon }]
//   tipLabel: タップしたときの吹き出しに出す名前(なければ label)
//   strong: 濃い色で目立たせる(今週・選んでいる月)
//   limit:  その棒だけの予算の線(カテゴリ別の予算)
// guide: { value, label } 全体に引く予算の目安線
const DEFAULT_H = 150 // 棒をかく部分の高さ(px)。height で変えられる
const LABEL_H = 18 // 棒の上の金額ぶんの余白

// 「¥8,400」「¥3.2万」のように短く表示する
export const shortYen = (n) => {
  if (n >= 10000) {
    const man = n / 10000
    return `¥${(man >= 10 ? Math.round(man) : Math.round(man * 10) / 10).toLocaleString('ja-JP')}万`
  }
  return `¥${n.toLocaleString('ja-JP')}`
}

// amountBelow: 金額を棒の上ではなく、下のラベルに出す(予算の枠と見分けやすくするため)
export default function BarChart({
  bars,
  guide,
  selectedKey,
  onSelect,
  amountBelow = false,
  height = DEFAULT_H,
  defaultColor = '#dcb69c',
  strongColor = '#b94a38',
}) {
  const CHART_H = height
  const max = Math.max(1, ...bars.map((b) => b.value), guide?.value || 0, ...bars.map((b) => b.limit || 0)) * 1.08
  const px = (v) => Math.round((v / max) * (CHART_H - LABEL_H))
  const selectedIndex = bars.findIndex((b) => b.key === selectedKey)

  return (
    <div className="bar-chart">
      <div className="bar-chart-plot" style={{ height: CHART_H }}>
        {/* うすい目盛り線と基準線 */}
        {[0.5, 1].map((r) => (
          <div key={r} className="grid-line" style={{ bottom: Math.round((CHART_H - LABEL_H) * r) }} />
        ))}
        <div className="base-line" />

        {guide?.value > 0 && (
          <div className="guide-line" style={{ bottom: px(guide.value) }}>
            <span>{guide.label}</span>
          </div>
        )}

        <div className="bar-cols">
          {bars.map((b, i) => {
            const h = px(b.value)
            const selected = b.key === selectedKey
            const over = b.limit > 0 && b.value > b.limit
            return (
              <button
                key={b.key}
                className={`bar-col ${selected ? 'is-selected' : ''}`}
                onClick={() => onSelect(selected ? null : b.key)}
                aria-label={`${b.label} ${b.value}円`}
                aria-pressed={selected}
              >
                {/* カテゴリの予算は、棒のうしろの点線の枠(ここまで使える入れ物)で表す */}
                {b.limit > 0 && <span className={`bar-limit ${over ? 'is-over' : ''}`} style={{ height: px(b.limit) }} />}
                {b.value > 0 && !selected && !amountBelow && (
                  <span className="bar-amount num" style={{ bottom: h + 4 }}>
                    {shortYen(b.value)}
                  </span>
                )}
                <span
                  className="chart-bar"
                  style={{
                    height: b.value > 0 ? Math.max(3, h) : 0,
                    background: b.color || (b.strong || selected ? strongColor : defaultColor),
                    opacity: selectedKey && !selected ? 0.55 : 1,
                  }}
                />
              </button>
            )
          })}
        </div>

        {/* タップした棒の詳しい金額 */}
        {selectedIndex >= 0 && (() => {
          const b = bars[selectedIndex]
          const colW = 100 / bars.length
          const center = colW * (selectedIndex + 0.5)
          const align = selectedIndex === 0 ? 'left' : selectedIndex === bars.length - 1 ? 'right' : 'center'
          const style = { bottom: Math.min(px(b.value) + 6, CHART_H - 44) }
          if (align === 'left') style.left = 0
          else if (align === 'right') style.right = 0
          else style.left = `${center}%`
          return (
            <div className={`bar-tip align-${align}`} style={style}>
              <strong className="num">¥{b.value.toLocaleString('ja-JP')}</strong>
              <span>
                {b.tipLabel || b.label}
                {b.count != null && ` ・ ${b.count}件`}
                {b.limit > 0 && ` ・ 予算 ¥${b.limit.toLocaleString('ja-JP')}`}
              </span>
            </div>
          )
        })()}
      </div>

      <div className="bar-labels">
        {bars.map((b) => (
          <span key={b.key} className={`bar-label ${b.strong ? 'is-strong' : ''}`}>
            {b.icon}
            {b.label}
            {amountBelow && (
              <span className={`bar-label-amount num ${b.limit > 0 && b.value > b.limit ? 'is-over' : ''}`}>
                {b.value > 0 ? shortYen(b.value) : '-'}
              </span>
            )}
          </span>
        ))}
      </div>
    </div>
  )
}
