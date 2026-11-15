// 削除などの前に出す確認画面
// (ブラウザ標準の confirm() は見た目を変えられないため、アプリのデザインに合わせて自前で作る)
import { useEffect } from 'react'
import { createPortal } from 'react-dom'
import { RotateCcw, Trash2 } from 'lucide-react'

// ask: { title, message, okLabel, icon: 'trash' | 'undo', onOk } または null
export default function ConfirmDialog({ ask, onClose }) {
  // Esc キーでも閉じる
  useEffect(() => {
    if (!ask) return
    const onKey = (e) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [ask, onClose])

  if (!ask) return null
  const Icon = ask.icon === 'undo' ? RotateCcw : Trash2

  return createPortal(
    <div className="confirm-overlay" onClick={onClose}>
      <div
        className="confirm-box"
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="confirm-title"
        tabIndex={-1}
        ref={(el) => el?.focus()}
        onClick={(e) => e.stopPropagation()}
      >
        <span className="confirm-icon">
          <Icon size={22} strokeWidth={2.2} />
        </span>
        <h3 id="confirm-title">{ask.title}</h3>
        {ask.message && <p>{ask.message}</p>}
        <div className="confirm-actions">
          <button type="button" className="btn" onClick={onClose}>
            キャンセル
          </button>
          <button
            type="button"
            className="btn primary"
            onClick={() => {
              ask.onOk()
              onClose()
            }}
          >
            {ask.okLabel}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  )
}
