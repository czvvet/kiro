import { useEffect, useState } from 'react'
import basketIllust from './assets/basket.svg'
import Mascot from './Mascot.jsx'

// アプリを開いたときのタイトル画面。少したつか、タップすると消える
export default function Splash({ onDone }) {
  const [leaving, setLeaving] = useState(false)

  useEffect(() => {
    const t = setTimeout(() => setLeaving(true), 2200)
    return () => clearTimeout(t)
  }, [])

  // 消えるアニメーションが終わったら閉じる
  useEffect(() => {
    if (!leaving) return
    const t = setTimeout(onDone, 450)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [leaving])

  return (
    <div className={`splash ${leaving ? 'is-leaving' : ''}`} onClick={() => setLeaving(true)} role="button" aria-label="タップしてはじめる">
      <div className="splash-bg" aria-hidden="true">
        <span className="bubble-deco b1" />
        <span className="bubble-deco b2" />
        <span className="bubble-deco b3" />
        <span className="sparkle s1">✦</span>
        <span className="sparkle s2">✦</span>
        <span className="sparkle s3">✧</span>
      </div>

      <div className="splash-art">
        <img src={basketIllust} alt="" className="splash-basket" />
        <div className="splash-mascot">
          <Mascot mood="happy" size={92} />
        </div>
      </div>

      <h1 className="splash-title">
        <span className="t1">買い物</span>
        <span className="t2">きろく</span>
      </h1>
      <p className="splash-sub">小さな記録で、暮らしを見える化。</p>

      <p className="splash-tap">タップしてはじめる</p>
    </div>
  )
}
