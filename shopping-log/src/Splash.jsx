import { useEffect, useState } from 'react'
import Dog from './Dog.jsx'

// アプリを開いたときのタイトル画面。画面のどこかをタップすると消える
export default function Splash({ onDone }) {
  const [leaving, setLeaving] = useState(false)

  // 消えるアニメーションが終わったら閉じる
  useEffect(() => {
    if (!leaving) return
    const t = setTimeout(onDone, 400)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [leaving])

  return (
    <div className={`splash ${leaving ? 'is-leaving' : ''}`} onClick={() => setLeaving(true)}>
      <div className="splash-main">
        <div className="splash-dog">
          <Dog mood="normal" size={190} />
        </div>
        <h1 className="splash-title">買い物きろく</h1>
        <p className="splash-sub">小さな記録で、暮らしを見える化。</p>
      </div>

      {/* ボタンはなし。画面のどこをタップしても始まる */}
      <div className="splash-foot">
        <p className="splash-tap">タップしてはじめる</p>
        <p className="splash-tagline">今日の買い物も、ちいさな思い出。</p>
      </div>
    </div>
  )
}
