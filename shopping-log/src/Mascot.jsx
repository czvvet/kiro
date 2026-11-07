// 先月との比較を話してくれる、芽の生えた小さなキャラクター
// mood: 'happy'(節約できた) / 'normal' / 'worried'(使いすぎ)
export default function Mascot({ mood = 'normal', size = 64 }) {
  const ink = '#405d4b'
  return (
    <svg
      className={`mascot-svg mood-${mood}`}
      width={size}
      height={size}
      viewBox="0 0 64 64"
      aria-hidden="true"
    >
      {/* 芽 */}
      <path d="M32 19C32 14 32 11 32 8" stroke="#3f7961" strokeWidth="2.4" strokeLinecap="round" fill="none" />
      <path d="M32 11C26 5 19 6 17 10C22 15 29 14 32 11Z" fill="#7fae8f" stroke={ink} strokeWidth="1.4" strokeLinejoin="round" />
      <path d="M32 10C37 3 45 4 47 8C43 13 36 13 32 10Z" fill="#a9c7b6" stroke={ink} strokeWidth="1.4" strokeLinejoin="round" />

      {/* 体 */}
      <ellipse cx="32" cy="40" rx="22" ry="19" fill="#f6efd9" stroke={ink} strokeWidth="1.8" />
      <ellipse cx="25" cy="31" rx="7" ry="3.5" fill="#fffaf0" opacity="0.8" />

      {/* ほっぺ */}
      <ellipse cx="19" cy="45" rx="4" ry="2.5" fill="#f2b4a0" opacity={mood === 'worried' ? 0.5 : 1} />
      <ellipse cx="45" cy="45" rx="4" ry="2.5" fill="#f2b4a0" opacity={mood === 'worried' ? 0.5 : 1} />

      {/* 目 */}
      {mood === 'happy' ? (
        <>
          <path d="M22 40Q25 36 28 40" stroke={ink} strokeWidth="2.2" strokeLinecap="round" fill="none" />
          <path d="M36 40Q39 36 42 40" stroke={ink} strokeWidth="2.2" strokeLinecap="round" fill="none" />
        </>
      ) : (
        <>
          <circle cx="25" cy="39" r="2.6" fill={ink} />
          <circle cx="39" cy="39" r="2.6" fill={ink} />
          <circle cx="25.8" cy="38.2" r="0.8" fill="#fff" />
          <circle cx="39.8" cy="38.2" r="0.8" fill="#fff" />
        </>
      )}

      {/* 困り眉 */}
      {mood === 'worried' && (
        <>
          <path d="M21 34L27 32" stroke={ink} strokeWidth="1.6" strokeLinecap="round" />
          <path d="M43 34L37 32" stroke={ink} strokeWidth="1.6" strokeLinecap="round" />
        </>
      )}

      {/* 口 */}
      {mood === 'happy' && <path d="M27 46Q32 52 37 46Z" fill="#d97f70" stroke={ink} strokeWidth="1.6" strokeLinejoin="round" />}
      {mood === 'normal' && <path d="M29 46Q32 49 35 46" stroke={ink} strokeWidth="1.8" strokeLinecap="round" fill="none" />}
      {mood === 'worried' && <path d="M28 49Q32 45 36 49" stroke={ink} strokeWidth="1.8" strokeLinecap="round" fill="none" />}
    </svg>
  )
}
