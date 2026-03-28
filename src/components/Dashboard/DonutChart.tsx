import { useMemo, useState } from 'react'
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts'
import type { Position } from '../../types'
import { usePortfolioStore } from '../../store/portfolioStore'
import { useI18n } from '../../hooks/useI18n'

interface Props {
  positions: Position[]
}

const COLORS = [
  '#6366f1', '#8b5cf6', '#a78bfa', '#c4b5fd',
  '#818cf8', '#4f46e5', '#7c3aed', '#5b21b6',
  '#3b82f6', '#60a5fa', '#93c5fd', '#bfdbfe',
]

export function DonutChart({ positions }: Props) {
  const sectors = usePortfolioStore((s) => s.sectors)
  const { t } = useI18n()
  const [viewMode, setViewMode] = useState<'ticker' | 'sector'>('ticker')

  const marketSector = useMemo(() => ({
    KRX: t('donut.domestic'),
    US:  t('donut.us'),
    ETF: 'ETF',
  }), [t])

  const tickerData = useMemo(() => {
    if (positions.length === 0) return []
    const values = positions.map((p) => ({
      name: p.name,
      ticker: p.ticker,
      value: p.totalValue > 0 ? p.totalValue : p.totalCost,
    }))
    const total = values.reduce((s, v) => s + v.value, 0)
    return values
      .filter((v) => v.value > 0)
      .map((v) => ({ ...v, percent: (v.value / total) * 100 }))
      .sort((a, b) => b.value - a.value)
  }, [positions])

  const sectorData = useMemo(() => {
    if (positions.length === 0) return []
    const byGroup = new Map<string, number>()
    for (const pos of positions) {
      const group = sectors[pos.ticker] || marketSector[pos.market] || t('donut.other')
      const val = pos.totalValue > 0 ? pos.totalValue : pos.totalCost
      byGroup.set(group, (byGroup.get(group) ?? 0) + val)
    }
    const total = [...byGroup.values()].reduce((s, v) => s + v, 0)
    return [...byGroup.entries()]
      .filter(([, v]) => v > 0)
      .map(([name, value]) => ({ name, ticker: name, value, percent: (value / total) * 100 }))
      .sort((a, b) => b.value - a.value)
  }, [positions, sectors, marketSector, t])

  const data = viewMode === 'ticker' ? tickerData : sectorData

  if (data.length === 0) {
    return (
      <div className="card p-5 flex items-center justify-center h-64">
        <p className="text-slate-500 text-sm">{t('donut.noData')}</p>
      </div>
    )
  }

  const CustomTooltip = ({ active, payload }: { active?: boolean; payload?: Array<{ payload: { name: string; ticker: string; percent: number } }> }) => {
    if (active && payload && payload.length) {
      const d = payload[0].payload
      return (
        <div className="bg-surface-800 border border-slate-700 rounded-lg px-3 py-2 text-xs shadow-xl">
          <p className="text-slate-200 font-medium">{d.name}</p>
          {viewMode === 'ticker' && <p className="text-slate-400 font-mono">{d.ticker}</p>}
          <p className="text-indigo-300 font-mono mt-1">{d.percent.toFixed(1)}%</p>
        </div>
      )
    }
    return null
  }

  return (
    <div className="card p-5">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-base font-semibold text-slate-100">{t('donut.title')}</h2>
        <button
          onClick={() => setViewMode((v) => v === 'ticker' ? 'sector' : 'ticker')}
          className="text-xs px-2.5 py-1 rounded-lg bg-slate-700 hover:bg-slate-600 text-slate-300 transition-colors"
        >
          {viewMode === 'ticker' ? t('donut.bySector') : t('donut.byTicker')}
        </button>
      </div>
      <div className="flex flex-col md:flex-row items-center gap-6">
        <div style={{ width: 200, height: 200, flexShrink: 0 }}>
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                innerRadius={55}
                outerRadius={85}
                paddingAngle={2}
                dataKey="value"
              >
                {data.map((_, i) => (
                  <Cell key={i} fill={COLORS[i % COLORS.length]} stroke="transparent" />
                ))}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
            </PieChart>
          </ResponsiveContainer>
        </div>
        <div className="flex flex-wrap gap-x-4 gap-y-2">
          {data.map((d, i) => (
            <div key={d.ticker} className="flex items-center gap-2 text-xs">
              <span
                className="w-2.5 h-2.5 rounded-sm flex-shrink-0"
                style={{ backgroundColor: COLORS[i % COLORS.length] }}
              />
              <span className="text-slate-400">{viewMode === 'ticker' ? d.ticker : d.name}</span>
              <span className="text-slate-500 font-mono">{d.percent.toFixed(1)}%</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
