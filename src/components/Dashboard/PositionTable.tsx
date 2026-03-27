import type { Position } from '../../types'
import { formatPrice, formatCurrency, formatPercent, formatNumber } from '../../utils/calculations'
import { RefreshIcon } from '../Layout/Icons'

interface Props {
  positions: Position[]
  loading: boolean
  onRefresh: () => void
}

export function PositionTable({ positions, loading, onRefresh }: Props) {
  return (
    <div className="card overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800">
        <h2 className="text-base font-semibold text-slate-100">보유 종목</h2>
        <button
          onClick={onRefresh}
          disabled={loading}
          className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-slate-200 transition-colors disabled:opacity-50"
        >
          <RefreshIcon className={loading ? 'animate-spin' : ''} />
          <span>{loading ? '조회 중...' : '시세 갱신'}</span>
        </button>
      </div>

      {positions.length === 0 ? (
        <div className="py-16 text-center text-slate-500 text-sm">
          보유 종목이 없습니다. 거래를 입력해주세요.
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-xs text-slate-500 border-b border-slate-800">
                <Th align="left">종목</Th>
                <Th>보유수량</Th>
                <Th>평균단가</Th>
                <Th>현재가</Th>
                <Th>평가금액</Th>
                <Th>수익금</Th>
                <Th>수익률</Th>
              </tr>
            </thead>
            <tbody>
              {positions.map((pos) => {
                const plPos = pos.profitLoss >= 0
                const plColor = pos.currentPrice === 0
                  ? 'text-slate-400'
                  : plPos
                  ? 'text-emerald-400'
                  : 'text-red-400'
                const marketBadge = {
                  KRX: 'bg-blue-900/50 text-blue-300',
                  US: 'bg-indigo-900/50 text-indigo-300',
                  ETF: 'bg-amber-900/50 text-amber-300',
                }[pos.market]

                return (
                  <tr
                    key={pos.ticker}
                    className="border-b border-slate-800/60 hover:bg-slate-800/40 transition-colors"
                  >
                    {/* 종목명 */}
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-2">
                        <div>
                          <p className="font-medium text-slate-100 leading-tight">{pos.name}</p>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            <span className="font-mono text-xs text-slate-500">{pos.ticker}</span>
                            <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${marketBadge}`}>
                              {pos.market}
                            </span>
                          </div>
                        </div>
                      </div>
                    </td>
                    <Td>{formatNumber(pos.quantity)}</Td>
                    <Td>{formatPrice(pos.avgPrice, pos.market)}</Td>
                    <Td>
                      {pos.currentPrice === 0 ? (
                        <span className="text-slate-600">–</span>
                      ) : (
                        formatPrice(pos.currentPrice, pos.market)
                      )}
                    </Td>
                    <Td>
                      {pos.totalValue > 0
                        ? formatCurrency(pos.totalValue, pos.market)
                        : <span className="text-slate-600">–</span>}
                    </Td>
                    <Td>
                      <span className={plColor}>
                        {pos.currentPrice === 0
                          ? '–'
                          : (pos.profitLoss >= 0 ? '+' : '') + formatCurrency(pos.profitLoss, pos.market)}
                      </span>
                    </Td>
                    <Td>
                      <span className={`font-medium ${plColor}`}>
                        {pos.currentPrice === 0 ? '–' : formatPercent(pos.profitLossPercent)}
                      </span>
                    </Td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

function Th({ children, align = 'right' }: { children: React.ReactNode; align?: 'left' | 'right' }) {
  return (
    <th className={`px-5 py-3 font-medium tracking-wide text-${align === 'left' ? 'left' : 'right'}`}>
      {children}
    </th>
  )
}

function Td({ children }: { children: React.ReactNode }) {
  return (
    <td className="px-5 py-3.5 text-right text-slate-300 font-mono">{children}</td>
  )
}
