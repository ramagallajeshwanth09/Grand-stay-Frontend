import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react'

const UICtx = createContext(null)
export const useUI = () => useContext(UICtx)

export function UIProvider({ children }) {
  const [toasts, setToasts] = useState([])
  const [dialog, setDialog] = useState(null)
  const idRef = useRef(0)

  const toast = useCallback((text, type = 'success') => {
    const id = ++idRef.current
    setToasts((t) => [...t, { id, text, type }])
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 4500)
  }, [])

  /** confirm({ title, message?, body?, confirmText, danger }) -> Promise<boolean> */
  const confirm = useCallback((opts) => new Promise((resolve) => setDialog({ ...opts, resolve })), [])

  const close = useCallback((value) => {
    setDialog((d) => { d?.resolve(value); return null })
  }, [])

  useEffect(() => {
    if (!dialog) return
    const onKey = (e) => { if (e.key === 'Escape') close(false) }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [dialog, close])

  return (
    <UICtx.Provider value={{ toast, confirm }}>
      {children}

      <div className="toasts" aria-live="polite">
        {toasts.map((t) => (
          <div key={t.id} className={`toast ${t.type}`} onClick={() => setToasts((x) => x.filter((y) => y.id !== t.id))}>
            <span className="toast-icon">{t.type === 'success' ? '✓' : '!'}</span>
            <span>{t.text}</span>
          </div>
        ))}
      </div>

      {dialog && (
        <div className="modal-backdrop" onClick={() => close(false)}>
          <div className="modal" role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()}>
            <h3>{dialog.title}</h3>
            {dialog.message && <p className="muted">{dialog.message}</p>}
            {dialog.body}
            <div className="modal-actions">
              <button className="btn ghost" onClick={() => close(false)}>{dialog.cancelText || 'Cancel'}</button>
              <button className={`btn ${dialog.danger ? 'danger' : ''}`} autoFocus onClick={() => close(true)}>
                {dialog.confirmText || 'Confirm'}
              </button>
            </div>
          </div>
        </div>
      )}
    </UICtx.Provider>
  )
}

/** Animated number that eases up from 0. */
export function CountUp({ value, prefix = '' }) {
  const [v, setV] = useState(0)
  useEffect(() => {
    const to = Number(value) || 0
    const start = performance.now()
    let raf
    const tick = (now) => {
      const p = Math.min(1, (now - start) / 900)
      setV(Math.round(to * (1 - Math.pow(1 - p, 3))))
      if (p < 1) raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [value])
  return <>{prefix}{v.toLocaleString('en-IN')}</>
}

/** Generic glass modal (used by the admin room form). */
export function Modal({ title, onClose, children, wide = false }) {
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className={`modal ${wide ? 'wide' : ''}`} role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <h3>{title}</h3>
          <button className="chat-x" onClick={onClose} aria-label="Close">✕</button>
        </div>
        {children}
      </div>
    </div>
  )
}
