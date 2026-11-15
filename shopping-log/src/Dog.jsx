import dogImage from './assets/dog.png'
import dogHappyImage from './assets/dog-happy.png'
import dogWorriedImage from './assets/dog-worried.png'
import dogEmptyImage from './assets/dog-empty.png'

// 表情ごとの画像と、その縦横の大きさ(px)
// 画像ごとに余白や絵の中の犬の大きさがちがうので、「ふつうの顔」と顔の大きさ・位置がそろうように合わせる
//   scale: 大きさの倍率
//   dx, dy: 右・下へずらす量(「ふつうの顔」の高さに対する割合)
const DOG_IMAGES = {
  normal: { src: dogImage, w: 224, h: 243, scale: 1, dx: 0, dy: 0 },
  happy: { src: dogHappyImage, w: 1984, h: 2152, scale: 0.98, dx: 0, dy: 0 }, // 節約できた・予算の中
  worried: { src: dogWorriedImage, w: 1204, h: 1204, scale: 1.25, dx: 0.022, dy: 0.072 }, // 使いすぎ・予算オーバー
}

// お買い物バッグを持った犬のキャラクター
// mood: 'happy'(節約できた) / 'normal' / 'worried'(使いすぎ)
//   size は「ふつうの顔」のときの幅。表情が変わっても場所の大きさは同じにして、
//   まわりの文字などが動かないようにする
//   'happy' のときは、ぴょこぴょこ跳ねる動きもつける
export default function Dog({ mood = 'normal', size = 120 }) {
  const img = DOG_IMAGES[mood] || DOG_IMAGES.normal
  const base = (size * DOG_IMAGES.normal.h) / DOG_IMAGES.normal.w
  const height = base * img.scale
  const width = (height * img.w) / img.h
  return (
    <span className={`mascot-svg mood-${mood}`} style={{ width: size, height: base }} aria-hidden="true">
      <img
        className="mascot-img"
        src={img.src}
        alt=""
        style={{
          width,
          height,
          // 下と横まんなかを「ふつうの顔」にそろえてから、絵ごとのずれを直す
          transform: `translate(calc(-50% + ${img.dx * base}px), ${img.dy * base}px)`,
        }}
      />
    </span>
  )
}

// 記録がないときに出す、こまった顔の犬と一言(src/assets/dog-empty.png の画像を使う)
// size: 'small'(カレンダーの日の欄) / 'normal'(ホーム) / 'large'(買い物履歴など広い場所)
export function EmptyState({ title, children, size = 'normal' }) {
  return (
    <div className={`empty card empty-dog is-${size}`}>
      <img src={dogEmptyImage} alt="" aria-hidden="true" />
      {title && <p className="empty-title">{title}</p>}
      {children && <p className="empty-text">{children}</p>}
    </div>
  )
}
