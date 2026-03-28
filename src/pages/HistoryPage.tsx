import { TradeHistory } from '../components/TradeHistory/TradeHistory'
import { useI18n } from '../hooks/useI18n'

export function HistoryPage() {
  const { t } = useI18n()
  return (
    <div>
      <h1 className="text-xl font-semibold text-slate-100 mb-5">{t('history.title')}</h1>
      <TradeHistory />
    </div>
  )
}
