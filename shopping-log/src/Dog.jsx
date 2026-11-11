import dogImage from './assets/dog.png'

// お買い物バッグを持った犬のキャラクター(src/assets/dog.png の画像を使う)
// mood: 'happy'(節約できた) / 'normal' / 'worried'(使いすぎ)
//   画像は1枚なので表情は変わらない。'happy' のときだけ、ぴょこぴょこ跳ねる動きをつける
export default function Dog({ mood = 'normal', size = 120 }) {
  return (
    <img
      className={`mascot-svg mood-${mood}`}
      src={dogImage}
      width={size}
      height={Math.round((size * 243) / 224)}
      alt=""
      aria-hidden="true"
    />
  )
}
