import { useEffect, useState } from 'react'
import { usePortfolioStore } from '../../store/portfolioStore'
import { useI18n } from '../../hooks/useI18n'

interface Props {
  open: boolean
  onClose: () => void
}

export function SettingsModal({ open, onClose }: Props) {
  const displayCurrency = usePortfolioStore((s) => s.displayCurrency)
  const setDisplayCurrency = usePortfolioStore((s) => s.setDisplayCurrency)
  const taxRate = usePortfolioStore((s) => s.taxRate)
  const setTaxRate = usePortfolioStore((s) => s.setTaxRate)
  const exchangeRate = usePortfolioStore((s) => s.exchangeRate)
  const exchangeRateOverride = usePortfolioStore((s) => s.exchangeRateOverride)
  const setExchangeRateOverride = usePortfolioStore((s) => s.setExchangeRateOverride)
  const { t } = useI18n()

  const [taxInput, setTaxInput] = useState(String(Math.round(taxRate * 100)))
  const [rateInput, setRateInput] = useState(String(exchangeRateOverride ?? exchangeRate))

  useEffect(() => {
    if (open) {
      setTaxInput(String(Math.round(taxRate * 100)))
      setRateInput(String(exchangeRateOverride ?? exchangeRate))
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => { document.body.style.overflow = '' }
  }, [open, taxRate, exchangeRate, exchangeRateOverride])

  useEffect(() => {
    function handler(e: KeyboardEvent) { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [onClose])

  if (!open) return null

  function handleSave() {
    const tax = parseFloat(taxInput)
    if (!isNaN(tax) && tax >= 0 && tax <= 100) setTaxRate(tax / 100)
    const rate = parseFloat(rateInput)
    if (!isNaN(rate) && rate > 0) setExchangeRateOverride(rate)
    onClose()
  }

  return (
    <>
      <div className="fixed inset-0 bg-black/60 z-40 backdrop-blur-sm" onClick={onClose} />
      <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
        <div className="bg-surface-900 border border-slate-800 rounded-xl shadow-2xl w-full max-w-sm">
          <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800">
            <h2 className="text-base font-semibold text-slate-100">{t('settings.title')}</h2>
            <button onClick={onClose} className="text-slate-500 hover:text-slate-300 text-2xl leading-none">×</button>
          </div>

          <div className="px-5 py-5 space-y-5">
            {/* Display currency */}
            <div>
              <label className="label">{t('settings.currency')}</label>
              <div className="flex rounded-lg overflow-hidden border border-slate-700 mt-1.5">
                {(['KRW', 'USD'] as const).map((c) => (
                  <button
                    key={c}
                    onClick={() => setDisplayCurrency(c)}
                    className={`flex-1 py-2 text-sm font-medium transition-colors ${
                      displayCurrency === c
                        ? 'bg-indigo-600 text-white'
                        : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                    }`}
                  >
                    {c}
                  </button>
                ))}
              </div>
            </div>

            {/* Tax rate */}
            <div>
              <label className="label">{t('settings.taxRate')}</label>
              <p className="text-[11px] text-slate-600 mb-1.5">{t('settings.taxRateDesc')}</p>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  value={taxInput}
                  onChange={(e) => setTaxInput(e.target.value)}
                  min="0"
                  max="100"
                  step="1"
                  className="input-field font-mono w-24"
                />
                <span className="text-slate-400 text-sm">%</span>
              </div>
            </div>

            {/* Exchange rate override */}
            <div>
              <label className="label">{t('settings.exchangeRate')}</label>
              <p className="text-[11px] text-slate-600 mb-1.5">{t('settings.exchangeRateDesc')}</p>
              <div className="flex items-center gap-2">
                <span className="text-slate-500 text-sm">$1 =</span>
                <input
                  type="number"
                  value={rateInput}
                  onChange={(e) => setRateInput(e.target.value)}
                  min="1"
                  step="1"
                  className="input-field font-mono w-28"
                />
                <span className="text-slate-400 text-sm">₩</span>
              </div>
              {exchangeRateOverride != null && (
                <button
                  onClick={() => { setExchangeRateOverride(null); setRateInput(String(exchangeRate)) }}
                  className="text-xs text-amber-500 hover:text-amber-300 mt-1.5 transition-colors"
                >
                  {t('settings.reset')} (auto: ₩{exchangeRate.toLocaleString()})
                </button>
              )}
            </div>
          </div>

          <div className="px-5 pb-5 flex gap-2">
            <button onClick={handleSave} className="btn-primary flex-1">{t('settings.save')}</button>
            <button onClick={onClose} className="text-sm text-slate-400 hover:text-slate-200 px-4">{t('nav.cancel')}</button>
          </div>
        </div>
      </div>
    </>
  )
}
