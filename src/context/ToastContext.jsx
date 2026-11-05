import { useCallback, useRef, useState } from 'react'
import { AlertCircle, CheckCircle2, Info, X } from 'lucide-react'
import { ToastContext } from './toast'

const TOAST_STYLES = {
  success: {
    icon: CheckCircle2,
    classes: 'border-emerald-200 bg-emerald-50 text-emerald-800',
  },
  error: {
    icon: AlertCircle,
    classes: 'border-rose-200 bg-rose-50 text-rose-800',
  },
  info: {
    icon: Info,
    classes: 'border-sky-200 bg-sky-50 text-sky-800',
  },
}

let nextId = 1

export default function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([])
  const timers = useRef({})

  const dismiss = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
    if (timers.current[id]) {
      clearTimeout(timers.current[id])
      delete timers.current[id]
    }
  }, [])

  const toast = useCallback(
    (message, type = 'info') => {
      const id = nextId++
      setToasts((prev) => [...prev.slice(-2), { id, message, type }])
      timers.current[id] = setTimeout(() => dismiss(id), 3500)
    },
    [dismiss],
  )

  return (
    <ToastContext.Provider value={toast}>
      {children}
      <div className="pointer-events-none fixed bottom-4 right-4 z-[70] flex w-80 max-w-[calc(100vw-2rem)] flex-col gap-2">
        {toasts.map(({ id, message, type }) => {
          const style = TOAST_STYLES[type] || TOAST_STYLES.info
          const Icon = style.icon
          return (
            <div
              key={id}
              className={`animate-toast-in pointer-events-auto flex items-start gap-3 rounded-xl border p-3 shadow-lg backdrop-blur ${style.classes}`}
              role="status"
            >
              <Icon className="mt-0.5 h-5 w-5 shrink-0" />
              <p className="flex-1 text-sm leading-snug">{message}</p>
              <button
                type="button"
                onClick={() => dismiss(id)}
                className="rounded p-0.5 opacity-60 transition hover:opacity-100"
                aria-label="Tutup notifikasi"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          )
        })}
      </div>
    </ToastContext.Provider>
  )
}
