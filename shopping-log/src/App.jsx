import { useEffect, useMemo, useState } from 'react'

const STORAGE_KEY = 'shopping-log-items'
const CATEGORIES = ['食料品', '日用品', '衣類', '外食', '趣味', 'その他']

// 今日の日付を "YYYY-MM-DD" 形式で返す
const today = () => {
  const d = new Date()
  const pad = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

const yen = (n) => `¥${n.toLocaleString('ja-JP')}`

const emptyForm = () => ({
  name: '',
  price: '',
  quantity: '1',
  store: '',
  category: CATEGORIES[0],
  date: today(),
})

function loadItems() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY))
    return Array.isArray(saved) ? saved : []
  } catch {
    return []
  }
}

export default function App() {
  const [items, setItems] = useState(loadItems)
  const [form, setForm] = useState(emptyForm)
  const [editingId, setEditingId] = useState(null)
  const [showForm, setShowForm] = useState(false)
  const [month, setMonth] = useState(today().slice(0, 7))

  // 変更があるたびにブラウザに保存
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items))
  }, [items])

  const monthItems = useMemo(
    () => items.filter((i) => i.date.startsWith(month)),
    [items, month],
  )

  const total = monthItems.reduce((sum, i) => sum + i.price * i.quantity, 0)

  const byCategory = useMemo(() => {
    const map = {}
    for (const i of monthItems) {
      map[i.category] = (map[i.category] || 0) + i.price * i.quantity
    }
    return Object.entries(map).sort((a, b) => b[1] - a[1])
  }, [monthItems])

  // 日付ごとにまとめる(新しい日付が上)
  const groups = useMemo(() => {
    const map = {}
    for (const i of monthItems) {
      ;(map[i.date] ||= []).push(i)
    }
    return Object.entries(map).sort((a, b) => b[0].localeCompare(a[0]))
  }, [monthItems])

  const update = (key) => (e) => setForm({ ...form, [key]: e.target.value })

  const openNew = () => {
    setForm(emptyForm())
    setEditingId(null)
    setShowForm(true)
  }

  const openEdit = (item) => {
    setForm({ ...item, price: String(item.price), quantity: String(item.quantity) })
    setEditingId(item.id)
    setShowForm(true)
  }

  const closeForm = () => setShowForm(false)

  const handleSubmit = (e) => {
    e.preventDefault()
    const price = Number(form.price)
    const quantity = Number(form.quantity)
    if (!form.name.trim() || !(price >= 0) || !(quantity >= 1)) return

    const data = {
      name: form.name.trim(),
      price,
      quantity,
      store: form.store.trim(),
      category: form.category,
      date: form.date,
    }

    if (editingId) {
      setItems(items.map((i) => (i.id === editingId ? { ...i, ...data } : i)))
    } else {
      // crypto.randomUUID は http 接続のスマホでは使えないため自前で生成
      const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
      setItems([{ id, ...data }, ...items])
    }
    setMonth(form.date.slice(0, 7))
    setShowForm(false)
  }

  const handleDelete = (id) => {
    if (confirm('この記録を削除しますか?')) {
      setItems(items.filter((i) => i.id !== id))
      setShowForm(false)
    }
  }

  const formatDate = (s) => {
    const d = new Date(s + 'T00:00:00')
    const w = '日月火水木金土'[d.getDay()]
    return `${d.getMonth() + 1}月${d.getDate()}日(${w})`
  }

  return (
    <div className="app">
      <header className="header">
        <h1>買い物きろく</h1>
        <input
          type="month"
          className="month-picker"
          value={month}
          onChange={(e) => setMonth(e.target.value)}
        />
      </header>

      <section className="summary">
        <div className="summary-label">この月の合計</div>
        <div className="summary-total">{yen(total)}</div>
        <div className="summary-count">{monthItems.length} 件</div>
        {byCategory.length > 0 && (
          <ul className="category-list">
            {byCategory.map(([cat, sum]) => (
              <li key={cat}>
                <span>{cat}</span>
                <span>{yen(sum)}</span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <main className="list">
        {groups.length === 0 && (
          <p className="empty">まだ記録がありません。<br />右下の「+」から追加してください。</p>
        )}
        {groups.map(([date, list]) => (
          <section key={date} className="day">
            <h2 className="day-title">
              <span>{formatDate(date)}</span>
              <span>{yen(list.reduce((s, i) => s + i.price * i.quantity, 0))}</span>
            </h2>
            <ul>
              {list.map((item) => (
                <li key={item.id}>
                  <button className="item" onClick={() => openEdit(item)}>
                    <div className="item-main">
                      <span className="item-name">{item.name}</span>
                      <span className="item-sub">
                        {item.category}
                        {item.store && ` ・ ${item.store}`}
                        {item.quantity > 1 && ` ・ ${yen(item.price)} × ${item.quantity}`}
                      </span>
                    </div>
                    <span className="item-price">{yen(item.price * item.quantity)}</span>
                  </button>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </main>

      <button className="fab" onClick={openNew} aria-label="記録を追加">+</button>

      {showForm && (
        <div className="overlay" onClick={closeForm}>
          <form className="sheet" onClick={(e) => e.stopPropagation()} onSubmit={handleSubmit}>
            <h2>{editingId ? '記録を編集' : '記録を追加'}</h2>

            <label>
              品名 <span className="required">必須</span>
              <input value={form.name} onChange={update('name')} placeholder="例:牛乳" required autoFocus />
            </label>

            <div className="row">
              <label>
                金額(円)
                <input type="number" inputMode="numeric" min="0" value={form.price} onChange={update('price')} placeholder="0" required />
              </label>
              <label className="qty">
                個数
                <input type="number" inputMode="numeric" min="1" value={form.quantity} onChange={update('quantity')} required />
              </label>
            </div>

            <label>
              カテゴリ
              <select value={form.category} onChange={update('category')}>
                {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
              </select>
            </label>

            <label>
              お店
              <input value={form.store} onChange={update('store')} placeholder="例:〇〇スーパー" />
            </label>

            <label>
              日付
              <input type="date" value={form.date} onChange={update('date')} required />
            </label>

            <div className="actions">
              {editingId && (
                <button type="button" className="btn danger" onClick={() => handleDelete(editingId)}>削除</button>
              )}
              <button type="button" className="btn" onClick={closeForm}>キャンセル</button>
              <button type="submit" className="btn primary">保存</button>
            </div>
          </form>
        </div>
      )}
    </div>
  )
}
