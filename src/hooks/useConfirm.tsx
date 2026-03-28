import { useState } from 'react'
import { useI18n } from './useI18n'

interface ConfirmOptions {
  title: string
  message: string
  confirmLabel?: string
  variant?: 'danger' | 'primary'
  onConfirm: () => void
}

export function useConfirm(suppressKey: string) {
  const [pending, setPending] = useState<ConfirmOptions | null>(null)
  const [skipDay, setSkipDay] = useState(false)
  const { t } = useI18n()

  function requestConfirm(opts: ConfirmOptions) {
    const key = `confirm-skip:${suppressKey}`
    const stored = localStorage.getItem(key)
    if (stored && Date.now() < Number(stored)) {
      opts.onConfirm()
      return
    }
    setSkipDay(false)
    setPending(opts)
  }

  function handleConfirm() {
    if (skipDay) {
      localStorage.setItem(
        `confirm-skip:${suppressKey}`,
        String(Date.now() + 24 * 60 * 60 * 1000),
      )
    }
    pending?.onConfirm()
    setPending(null)
  }

  function handleCancel() {
    setPending(null)
  }

  const isDanger = (pending?.variant ?? 'danger') === 'danger'

  const confirmDialog = pending ? (
    <>
      <div className="fixed inset-0 bg-black/60 z-40 backdrop-blur-sm" onClick={handleCancel} />
      <div className="fixed inset-0 z-50 flex items-center justify-center px-4 pointer-events-none">
        <div className="bg-surface-900 border border-slate-800 rounded-xl shadow-2xl w-full max-w-xs pointer-events-auto">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-slate-800">
            <h2 className="text-sm font-semibold text-slate-100">{pending.title}</h2>
            <button
              onClick={handleCancel}
              className="text-slate-500 hover:text-slate-300 text-xl leading-none"
            >×</button>
          </div>

          {/* Body */}
          <div className="px-4 py-3">
            <p className="text-xs text-slate-400 whitespace-pre-line leading-relaxed">
              {pending.message}
            </p>
          </div>

          {/* Footer */}
          <div className="px-4 pb-4 space-y-2.5">
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={skipDay}
                onChange={(e) => setSkipDay(e.target.checked)}
                className="w-3.5 h-3.5 rounded accent-indigo-500 cursor-pointer"
              />
              <span className="text-[11px] text-slate-600">{t('confirm.skipDay')}</span>
            </label>
            <div className="flex items-center gap-2">
              <button
                onClick={handleConfirm}
                className={`px-4 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  isDanger
                    ? 'bg-red-600 hover:bg-red-500 text-white'
                    : 'bg-indigo-600 hover:bg-indigo-500 text-white'
                }`}
              >
                {pending.confirmLabel ?? t('nav.confirm')}
              </button>
              <button
                onClick={handleCancel}
                className="text-xs text-slate-500 hover:text-slate-300 transition-colors"
              >
                {t('nav.cancel')}
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  ) : null

  return { confirmDialog, requestConfirm }
}
