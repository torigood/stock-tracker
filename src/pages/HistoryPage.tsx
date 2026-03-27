import { TradeHistory } from '../components/TradeHistory/TradeHistory'

export function HistoryPage() {
  return (
    <div>
      <h1 className="text-xl font-semibold text-slate-100 mb-5">거래 내역</h1>
      <TradeHistory />
    </div>
  )
}
