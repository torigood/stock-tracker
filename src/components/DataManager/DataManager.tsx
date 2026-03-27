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
  const importTrades = usePortfolioStore((s) => s.importTrades)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // ESC to close
  useEffect(() => {
    function handler(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [onClose])

  // Scroll lock
  useEffect(() => {
    if (open) document.body.style.overflow = 'hidden'
    else document.body.style.overflow = ''
    return () => { document.body.style.overflow = '' }
  }, [open])

  if (!open) return null

  function handleExportJSON() {
    const dateStr = dayjs().format('YYYYMMDD')
    const json = JSON.stringify({ trades }, null, 2)
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

        if (
          typeof parsed !== 'object' ||
          parsed === null ||
          !('trades' in parsed) ||
          !Array.isArray((parsed as { trades: unknown }).trades)
        ) {
          alert('올바른 백업 파일이 아닙니다. trades 배열이 없습니다.')
          return
        }

        const incoming = (parsed as { trades: Trade[] }).trades

        if (!window.confirm(
          `총 ${incoming.length}건의 거래 데이터를 가져옵니다.\n기존 데이터(${trades.length}건)가 모두 덮어씌워집니다.\n계속하시겠습니까?`
        )) return

        importTrades(incoming)
        onClose()
      } catch {
        alert('JSON 파싱 오류가 발생했습니다.')
      } finally {
        // reset input so same file can be selected again
        if (fileInputRef.current) fileInputRef.current.value = ''
      }
    }
    reader.readAsText(file)
  }

  function handleExportCSV() {
    const headers = ['날짜', '티커', '종목명', '시장', '거래유형', '수량', '단가', '거래금액', '노트']
    const rows = trades.map((t) => [
      t.date,
      t.ticker,
      t.name,
      t.market,
      t.type === 'buy' ? '매수' : '매도',
      String(t.quantity),
      String(t.price),
      String(t.quantity * t.price),
      t.note,
    ])

    const csvLines = [headers, ...rows].map((row) =>
      row.map((cell) => {
        const str = String(cell)
        if (str.includes(',') || str.includes('"') || str.includes('\n')) {
          return '"' + str.replace(/"/g, '""') + '"'
        }
        return str
      }).join(',')
    )

    const csv = '\uFEFF' + csvLines.join('\r\n') // BOM for Korean Excel compatibility
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `stocktracker-trades-${dayjs().format('YYYYMMDD')}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/60 z-40 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
        <div className="bg-surface-900 border border-slate-800 rounded-xl shadow-2xl w-full max-w-sm">
          {/* Header */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800">
            <h2 className="text-base font-semibold text-slate-100">데이터 관리</h2>
            <button
              onClick={onClose}
              className="text-slate-500 hover:text-slate-300 text-2xl leading-none"
            >
              ×
            </button>
          </div>

          {/* Body */}
          <div className="px-5 py-5 space-y-3">
            <p className="text-xs text-slate-500 mb-4">
              현재 {trades.length}건의 거래 데이터가 저장되어 있습니다.
            </p>

            {/* JSON Export */}
            <ActionButton
              icon={
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                  <polyline points="7 10 12 15 17 10" />
                  <line x1="12" y1="15" x2="12" y2="3" />
                </svg>
              }
              label="JSON 내보내기"
              description="모든 거래 데이터를 JSON 파일로 저장"
              onClick={handleExportJSON}
            />

            {/* JSON Import */}
            <ActionButton
              icon={
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                  <polyline points="17 8 12 3 7 8" />
                  <line x1="12" y1="3" x2="12" y2="15" />
                </svg>
              }
              label="JSON 가져오기"
              description="백업 파일에서 거래 데이터 복원 (기존 데이터 덮어쓰기)"
              onClick={handleImportJSON}
              danger
            />

            {/* CSV Export */}
            <ActionButton
              icon={
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                  <polyline points="14 2 14 8 20 8" />
                  <line x1="16" y1="13" x2="8" y2="13" />
                  <line x1="16" y1="17" x2="8" y2="17" />
                  <polyline points="10 9 9 9 8 9" />
                </svg>
              }
              label="CSV 내보내기"
              description="엑셀에서 열 수 있는 CSV 파일로 저장"
              onClick={handleExportCSV}
            />
          </div>
        </div>
      </div>

      {/* Hidden file input */}
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
  icon,
  label,
  description,
  onClick,
  danger = false,
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
