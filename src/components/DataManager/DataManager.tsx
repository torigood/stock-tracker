import { useEffect, useRef } from 'react'
import dayjs from 'dayjs'
import { usePortfolioStore } from '../../store/portfolioStore'
import type { Trade } from '../../types'

interface Props {
  open: boolean
  onClose: () => void
}

export function DataManager({ open, onClose }: Props) {
  const trades = usePortfolioStore((s) => s.trades)
  const portfolios = usePortfolioStore((s) => s.portfolios)
  const portfolioData = usePortfolioStore((s) => s.portfolioData)
  const activePortfolioId = usePortfolioStore((s) => s.activePortfolioId)
  const importTrades = usePortfolioStore((s) => s.importTrades)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    function handler(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [onClose])

  useEffect(() => {
    if (open) document.body.style.overflow = 'hidden'
    else document.body.style.overflow = ''
    return () => { document.body.style.overflow = '' }
  }, [open])

  if (!open) return null

  // Get all trades across all portfolios
  function getAllTrades(): { trade: Trade; portfolioName: string }[] {
    const result: { trade: Trade; portfolioName: string }[] = []
    for (const portfolio of portfolios) {
      const data = portfolioData[portfolio.id]
      if (!data) continue
      for (const trade of data.trades) {
        result.push({ trade, portfolioName: portfolio.name })
      }
    }
    return result
  }

  function handleExportJSON() {
    const dateStr = dayjs().format('YYYYMMDD')
    // Export full portfolio data for complete backup
    const backup = {
      version: 2,
      exportedAt: new Date().toISOString(),
      portfolios,
      portfolioData: {
        ...portfolioData,
        // Ensure active portfolio data is up-to-date
        [activePortfolioId]: { trades, targetPrices: portfolioData[activePortfolioId]?.targetPrices ?? {} },
      },
    }
    const json = JSON.stringify(backup, null, 2)
    const blob = new Blob([json], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `stocktracker-backup-${dateStr}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  function handleImportJSON() {
    fileInputRef.current?.click()
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (ev) => {
      try {
        const raw = ev.target?.result as string
        const parsed = JSON.parse(raw) as unknown

        if (typeof parsed !== 'object' || parsed === null) {
          alert('올바른 백업 파일이 아닙니다.')
          return
        }

        const obj = parsed as Record<string, unknown>

        // Support both v1 (trades array) and v2 (portfolios) format
        if ('trades' in obj && Array.isArray(obj.trades)) {
          // Legacy v1 format
          const incoming = obj.trades as Trade[]
          if (!window.confirm(
            `총 ${incoming.length}건의 거래 데이터를 가져옵니다.\n현재 포트폴리오의 데이터(${trades.length}건)가 덮어씌워집니다.\n계속하시겠습니까?`
          )) return
          importTrades(incoming)
          onClose()
        } else if ('portfolioData' in obj) {
          // v2 format — only import current portfolio's trades
          const pdata = obj.portfolioData as Record<string, { trades: Trade[] }>
          const firstKey = Object.keys(pdata)[0]
          const incoming = firstKey ? (pdata[firstKey]?.trades ?? []) : []
          if (!window.confirm(
            `총 ${incoming.length}건의 거래 데이터를 가져옵니다.\n현재 포트폴리오의 데이터(${trades.length}건)가 덮어씌워집니다.\n계속하시겠습니까?`
          )) return
          importTrades(incoming)
          onClose()
        } else {
          alert('올바른 백업 파일이 아닙니다.')
        }
      } catch {
        alert('JSON 파싱 오류가 발생했습니다.')
      } finally {
        if (fileInputRef.current) fileInputRef.current.value = ''
      }
    }
    reader.readAsText(file)
  }

  function handleExportCSV() {
    const allTrades = getAllTrades()
    const headers = ['포트폴리오', '날짜', '티커', '종목명', '시장', '거래유형', '수량', '단가', '거래금액', '노트']
    const rows = allTrades.map(({ trade: t, portfolioName }) => {
      const typeLabel: Record<string, string> = { buy: '매수', sell: '매도', dividend: '배당', split: '분할' }
      return [
        portfolioName,
        t.date,
        t.ticker,
        t.name,
        t.market,
        typeLabel[t.type] ?? t.type,
        String(t.quantity),
        String(t.price),
        t.type === 'split' ? '0' : String(t.quantity * t.price),
        t.note,
      ]
    })

    const csvLines = [headers, ...rows].map((row) =>
      row.map((cell) => {
        const str = String(cell)
        if (str.includes(',') || str.includes('"') || str.includes('\n')) {
          return '"' + str.replace(/"/g, '""') + '"'
        }
        return str
      }).join(',')
    )

    const csv = '\uFEFF' + csvLines.join('\r\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `stocktracker-trades-${dayjs().format('YYYYMMDD')}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  const totalTradesAll = portfolios.reduce((sum, p) => sum + (portfolioData[p.id]?.trades.length ?? 0), 0)

  return (
    <>
      <div className="fixed inset-0 bg-black/60 z-40 backdrop-blur-sm" onClick={onClose} />

      <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
        <div className="bg-surface-900 border border-slate-800 rounded-xl shadow-2xl w-full max-w-sm">
          <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800">
            <h2 className="text-base font-semibold text-slate-100">데이터 관리</h2>
            <button onClick={onClose} className="text-slate-500 hover:text-slate-300 text-2xl leading-none">×</button>
          </div>

          <div className="px-5 py-5 space-y-3">
            <p className="text-xs text-slate-500 mb-4">
              {portfolios.length}개 포트폴리오, 총 {totalTradesAll}건 거래 데이터
            </p>

            <ActionButton
              icon={<DownloadIcon />}
              label="JSON 내보내기"
              description="모든 포트폴리오 데이터를 JSON 파일로 저장"
              onClick={handleExportJSON}
            />

            <ActionButton
              icon={<UploadIcon />}
              label="JSON 가져오기"
              description="백업 파일에서 거래 데이터 복원 (현재 포트폴리오 덮어쓰기)"
              onClick={handleImportJSON}
              danger
            />

            <ActionButton
              icon={<CsvIcon />}
              label="CSV 내보내기 (전체)"
              description="모든 포트폴리오를 엑셀에서 열 수 있는 CSV로 저장"
              onClick={handleExportCSV}
            />
          </div>
        </div>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept=".json"
        className="hidden"
        onChange={handleFileChange}
      />
    </>
  )
}

function ActionButton({
  icon, label, description, onClick, danger = false,
}: {
  icon: React.ReactNode
  label: string
  description: string
  onClick: () => void
  danger?: boolean
}) {
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-lg border transition-colors text-left ${
        danger
          ? 'border-red-900/50 bg-red-900/10 hover:bg-red-900/20 text-red-300'
          : 'border-slate-700 bg-surface-800 hover:bg-slate-800 text-slate-300'
      }`}
    >
      <span className={danger ? 'text-red-400' : 'text-indigo-400'}>{icon}</span>
      <div>
        <p className="text-sm font-medium">{label}</p>
        <p className={`text-xs mt-0.5 ${danger ? 'text-red-500/70' : 'text-slate-600'}`}>{description}</p>
      </div>
    </button>
  )
}

function DownloadIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="7 10 12 15 17 10" />
      <line x1="12" y1="15" x2="12" y2="3" />
    </svg>
  )
}

function UploadIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="17 8 12 3 7 8" />
      <line x1="12" y1="3" x2="12" y2="15" />
    </svg>
  )
}

function CsvIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
      <line x1="16" y1="13" x2="8" y2="13" />
      <line x1="16" y1="17" x2="8" y2="17" />
    </svg>
  )
}
