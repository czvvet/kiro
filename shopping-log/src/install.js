// 「ホーム画面に追加」のための準備
// Android の Chrome などは、追加できるときに beforeinstallprompt を送ってくる。
// 画面を開いてすぐに届くことがあるので、アプリの表示より先に受け取っておく。
let deferredPrompt = null
const listeners = new Set()
const notify = () => listeners.forEach((fn) => fn())

if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault() // ブラウザが勝手に出す案内は止めて、設定のボタンから出す
    deferredPrompt = e
    notify()
  })
  window.addEventListener('appinstalled', () => {
    deferredPrompt = null
    notify()
  })
}

export const canPrompt = () => deferredPrompt !== null

// ブラウザの「追加しますか?」を出す。追加されたら true
export async function promptInstall() {
  if (!deferredPrompt) return false
  const e = deferredPrompt
  deferredPrompt = null
  e.prompt()
  const { outcome } = await e.userChoice
  notify()
  return outcome === 'accepted'
}

export function onInstallChange(fn) {
  listeners.add(fn)
  return () => listeners.delete(fn)
}

// すでにホーム画面から開いているか
export const isStandalone = () =>
  window.matchMedia?.('(display-mode: standalone)').matches || window.navigator.standalone === true

// iPhone・iPad(iPad は Mac のふりをするので、タッチできるかでも見分ける)
export const isIOS = () =>
  /iPhone|iPad|iPod/.test(navigator.userAgent) ||
  (navigator.userAgent.includes('Macintosh') && navigator.maxTouchPoints > 1)
