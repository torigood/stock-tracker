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
  const costBasisMethod = usePortfolioStore((s) => s.costBasisMethod)
  const setCostBasisMethod = usePortfolioStore((s) => s.setCostBasisMethod)
  const riskFreeRate = usePortfolioStore((s) => s.riskFreeRate)
  const setRiskFreeRate = usePortfolioStore((s) => s.setRiskFreeRate)
  const alertEmail = usePortfolioStore((s) => s.alertEmail)
  const setAlertEmail = usePortfolioStore((s) => s.setAlertEmail)
  const targetPrices = usePortfolioStore((s) => s.targetPrices)
  const { t } = useI18n()

  const [taxInput, setTaxInput] = useState(String(Math.round(taxRate * 100)))
  const [rateInput, setRateInput] = useState(String(exchangeRateOverride ?? exchangeRate))
  const [rfrInput, setRfrInput] = useState(String(riskFreeRate * 100))
  const [emailInput, setEmailInput] = useState(alertEmail)
  const [alertStatus, setAlertStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')

  useEffect(() => {
    if (open) {
      setTaxInput(String(Math.round(taxRate * 100)))
      setRateInput(String(exchangeRateOverride ?? exchangeRate))
      setRfrInput(String(riskFreeRate * 100))
      setEmailInput(alertEmail)
      setAlertStatus('idle')
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => { document.body.style.overflow = '' }
  }, [open, taxRate, exchangeRate, exchangeRateOverride, riskFreeRate, alertEmail])

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
    const rfr = parseFloat(rfrInput)
    if (!isNaN(rfr) && rfr >= 0) setRiskFreeRate(rfr / 100)
    onClose()
  }

  const targetCount = Object.keys(targetPrices).length

  async function handleSubscribe() {
    if (!emailInput.trim()) return
    if (targetCount === 0) return
    setAlertStatus('loading')
    try {
      const targets = Object.entries(targetPrices).map(([ticker, price]) => ({ ticker, targetPrice: price }))
      const res = await fetch('/api/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: emailInput.trim(), targets }),
      })
      if (!res.ok) throw new Error('Failed')
      setAlertEmail(emailInput.trim())
      setAlertStatus('success')
    } catch {
      setAlertStatus('error')
    }
  }

  async function handleUnsubscribe() {
    if (!emailInput.trim()) return
    setAlertStatus('loading')
    try {
      const res = await fetch('/api/unsubscribe', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: emailInput.trim() }),
      })
      if (!res.ok) throw new Error('Failed')
      setAlertEmail('')
      setEmailInput('')
      setAlertStatus('idle')
    } catch {
      setAlertStatus('error')
    }
  }

  return (
    <>
      <div className="fixed inset-0 bg-black/60 z-40 backdrop-blur-sm" onClick={onClose} />
      <div className="fixed inset-0 z-50 flex items-center justify-center px-4 py-6 overflow-y-auto">
        <div className="bg-surface-900 border border-slate-800 rounded-xl shadow-2xl w-full max-w-sm my-auto">
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

            {/* Cost basis method */}
            <div>
              <label className="label">{t('settings.costBasis')}</label>
              <p className="text-[11px] text-slate-600 mb-1.5">{t('settings.costBasisDesc')}</p>
              <div className="flex rounded-lg overflow-hidden border border-slate-700 mt-1.5">
                <button
                  onClick={() => setCostBasisMethod('fifo')}
                  className={`flex-1 py-2 text-sm font-medium transition-colors ${
                    costBasisMethod === 'fifo'
                      ? 'bg-indigo-600 text-white'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                  }`}
                >
                  {t('settings.fifo')}
                </button>
                <button
                  onClick={() => setCostBasisMethod('average')}
                  className={`flex-1 py-2 text-sm font-medium transition-colors ${
                    costBasisMethod === 'average'
                      ? 'bg-indigo-600 text-white'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                  }`}
                >
                  {t('settings.avgCost')}
                </button>
              </div>
            </div>

            {/* Risk-free rate */}
            <div>
              <label className="label">{t('settings.riskFreeRate')}</label>
              <p className="text-[11px] text-slate-600 mb-1.5">{t('settings.riskFreeRateDesc')}</p>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  value={rfrInput}
                  onChange={(e) => setRfrInput(e.target.value)}
                  min="0"
                  max="100"
                  step="0.1"
                  className="input-field font-mono w-24"
                />
                <span className="text-slate-400 text-sm">%</span>
              </div>
            </div>

            {/* Email alerts */}
            <div>
              <label className="label">{t('settings.emailAlert')}</label>
              <p className="text-[11px] text-slate-600 mb-1.5">{t('settings.emailAlertDesc')}</p>
              <input
                type="email"
                value={emailInput}
                onChange={(e) => setEmailInput(e.target.value)}
                placeholder={t('settings.emailPlaceholder')}
                className="input-field w-full mb-2"
              />
              {targetCount === 0 ? (
                <p className="text-[11px] text-slate-600">{t('settings.alertNoTargets')}</p>
              ) : (
                <p className="text-[11px] text-slate-500 mb-2">
                  {targetCount}개 종목 목표가 설정됨
                </p>
              )}
              {alertStatus === 'success' && (
                <p className="text-[11px] text-emerald-400 mb-2">{t('settings.alertActive')}</p>
              )}
              {alertStatus === 'error' && (
                <p className="text-[11px] text-red-400 mb-2">{t('settings.alertError')}</p>
              )}
              <div className="flex gap-2">
                <button
                  onClick={handleSubscribe}
                  disabled={alertStatus === 'loading' || targetCount === 0 || !emailInput.trim()}
                  className="btn-primary flex-1 text-sm disabled:opacity-50"
                >
                  {t('settings.alertSubscribe')}
                </button>
                {alertEmail && (
                  <button
                    onClick={handleUnsubscribe}
                    disabled={alertStatus === 'loading'}
                    className="text-sm text-red-400 hover:text-red-300 px-3 disabled:opacity-50"
                  >
                    {t('settings.alertUnsubscribe')}
                  </button>
                )}
              </div>
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
