import { useMemo } from 'react'
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts'
import { Position } from '../../types'

interface Props {
  positions: Position[]
}

const COLORS = [
  '#6366f1', '#8b5cf6', '#a78bfa', '#c4b5fd',
  '#818cf8', '#4f46e5', '#7c3aed', '#5b21b6',
  '#3b82f6', '#60a5fa', '#93c5fd', '#bfdbfe',
]

export function DonutChart({ positions }: Props) {
  const data = useMemo(() => {
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

  if (data.length === 0) {
    return (
      <div className="card p-5 flex items-center justify-center h-64">
        <p className="text-slate-500 text-sm">데이터 없음</p>
      </div>
    )
  }

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const d = payload[0].payload
      return (
        <div className="bg-surface-800 border border-slate-700 rounded-lg px-3 py-2 text-xs shadow-xl">
          <p className="text-slate-200 font-medium">{d.name}</p>
          <p className="text-slate-400 font-mono">{d.ticker}</p>
          <p className="text-indigo-300 font-mono mt-1">{d.percent.toFixed(1)}%</p>
        </div>
      )
    }
    return null
  }

  return (
    <div className="card p-5">
      <h2 className="text-base font-semibold text-slate-100 mb-4">포트폴리오 비중</h2>
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

        {/* Legend */}
        <div className="flex flex-wrap gap-x-4 gap-y-2">
          {data.map((d, i) => (
            <div key={d.ticker} className="flex items-center gap-2 text-xs">
              <span
                className="w-2.5 h-2.5 rounded-sm flex-shrink-0"
                style={{ backgroundColor: COLORS[i % COLORS.length] }}
              />
              <span className="text-slate-400">{d.ticker}</span>
              <span className="text-slate-500 font-mono">{d.percent.toFixed(1)}%</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
