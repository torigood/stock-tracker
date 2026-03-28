import { useState, useRef, useEffect } from 'react'
import { useI18n } from './useI18n'

interface PromptOptions {
  title: string
  placeholder?: string
  confirmLabel?: string
  onConfirm: (value: string) => void
}

export function usePrompt() {
  const [pending, setPending] = useState<PromptOptions | null>(null)
  const [value, setValue] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)
  const { t } = useI18n()

  useEffect(() => {
    if (pending) {
      setTimeout(() => inputRef.current?.focus(), 50)
    }
  }, [pending])

  function requestPrompt(opts: PromptOptions) {
    setValue('')
    setPending(opts)
  }

  function handleConfirm() {
    if (!value.trim()) return
    pending?.onConfirm(value.trim())
    setPending(null)
  }

  function handleCancel() {
    setPending(null)
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter') handleConfirm()
    if (e.key === 'Escape') handleCancel()
  }

  const promptDialog = pending ? (
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

          {/* Input */}
          <div className="px-4 py-3">
            <input
              ref={inputRef}
              type="text"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={pending.placeholder}
              className="w-full bg-surface-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200 placeholder-slate-600 focus:outline-none focus:border-indigo-500 transition-colors"
            />
          </div>

          {/* Footer */}
          <div className="px-4 pb-4 flex gap-2">
            <button
              onClick={handleConfirm}
              disabled={!value.trim()}
              className="flex-1 py-2 rounded-lg text-sm font-medium bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 disabled:cursor-not-allowed text-white transition-colors"
            >
              {pending.confirmLabel ?? t('nav.confirm')}
            </button>
            <button
              onClick={handleCancel}
              className="flex-1 py-2 rounded-lg text-sm font-medium bg-slate-700 hover:bg-slate-600 text-slate-300 transition-colors"
            >
              {t('nav.cancel')}
            </button>
          </div>
        </div>
      </div>
    </>
  ) : null

  return { promptDialog, requestPrompt }
}
