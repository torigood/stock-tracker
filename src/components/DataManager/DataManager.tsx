import { useEffect, useRef } from 'react'
import dayjs from 'dayjs'
import { usePortfolioStore } from '../../store/portfolioStore'
import { useI18n } from '../../hooks/useI18n'
import { useConfirm } from '../../hooks/useConfirm'
import { parseBrokerCSV } from '../../utils/brokerParsers'
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
  const { t } = useI18n()

  const { confirmDialog, requestConfirm } = useConfirm('import-data')

  const fileInputRef = useRef<HTMLInputElement>(null)
  const csvInputRef = useRef<HTMLInputElement>(null)
  const brokerInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    function handler(e: KeyboardEvent) { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [onClose])

  useEffect(() => {
    if (open) document.body.style.overflow = 'hidden'
    else document.body.style.overflow = ''
    return () => { document.body.style.overflow = '' }
  }, [open])

  if (!open) return null

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
    const backup = {
      version: 2,
      exportedAt: new Date().toISOString(),
      portfolios,
      portfolioData: {
        ...portfolioData,
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

  function handleImportJSON() { fileInputRef.current?.click() }
  function handleImportCSV() { csvInputRef.current?.click() }
  function handleImportBrokerCSV() { brokerInputRef.current?.click() }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => {
      try {
        const raw = ev.target?.result as string
        const parsed = JSON.parse(raw) as unknown
        if (typeof parsed !== 'object' || parsed === null) { alert(t('data.invalidFile')); return }
        const obj = parsed as Record<string, unknown>
        if ('trades' in obj && Array.isArray(obj.trades)) {
          const incoming = obj.trades as Trade[]
          requestConfirm({
            title: t('confirm.importTitle'),
            message: t('data.confirmImport', { n: incoming.length, t: trades.length }),
            variant: 'primary',
            onConfirm: () => { importTrades(incoming); onClose() },
          })
        } else if ('portfolioData' in obj) {
          const pdata = obj.portfolioData as Record<string, { trades: Trade[] }>
          const firstKey = Object.keys(pdata)[0]
          const incoming = firstKey ? (pdata[firstKey]?.trades ?? []) : []
          requestConfirm({
            title: t('confirm.importTitle'),
            message: t('data.confirmImport', { n: incoming.length, t: trades.length }),
            variant: 'primary',
            onConfirm: () => { importTrades(incoming); onClose() },
          })
        } else {
          alert(t('data.invalidFile'))
        }
      } catch { alert(t('data.jsonError')) }
      finally { if (fileInputRef.current) fileInputRef.current.value = '' }
    }
    reader.readAsText(file)
  }

  function handleCSVChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => {
      try {
        const raw = ev.target?.result as string
        // Remove BOM if present
        const text = raw.startsWith('\uFEFF') ? raw.slice(1) : raw
        const lines = text.split(/\r?\n/).filter((l) => l.trim())
        if (lines.length < 2) { alert(t('data.csvNoTrades')); return }

        // Skip header row, parse trades
        const incoming: Trade[] = []
        const TYPE_MAP: Record<string, Trade['type']> = {
          '매수': 'buy', 'buy': 'buy',
          '매도': 'sell', 'sell': 'sell',
          '배당': 'dividend', 'dividend': 'dividend',
          '분할': 'split', 'split': 'split',
        }

        for (let i = 1; i < lines.length; i++) {
          // Parse CSV properly (handle quoted fields)
          const cells = parseCSVLine(lines[i])
          if (cells.length < 8) continue
          // Format: portfolio, date, ticker, name, market, type, quantity, price, amount, note
          const [, date, ticker, name, market, typeRaw, qty, priceRaw, , note] = cells
          const tradeType = TYPE_MAP[typeRaw?.toLowerCase() ?? '']
          if (!tradeType || !ticker || !date) continue
          incoming.push({
            id: crypto.randomUUID(),
            ticker: ticker.trim().toUpperCase(),
            name: (name ?? ticker).trim(),
            market: (['KRX', 'US', 'ETF'].includes(market?.trim() ?? '') ? market.trim() : 'US') as Trade['market'],
            type: tradeType,
            quantity: parseFloat(qty) || 0,
            price: parseFloat(priceRaw) || 0,
            date: date.trim(),
            note: (note ?? '').trim(),
            createdAt: new Date().toISOString(),
          })
        }

        if (incoming.length === 0) { alert(t('data.csvNoTrades')); return }
        requestConfirm({
          title: t('confirm.importTitle'),
          message: t('data.confirmImport', { n: incoming.length, t: trades.length }),
          variant: 'primary',
          onConfirm: () => { importTrades(incoming); onClose() },
        })
      } catch { alert(t('data.csvError')) }
      finally { if (csvInputRef.current) csvInputRef.current.value = '' }
    }
    reader.readAsText(file)
  }

  const ISIN_RE = /^[A-Z]{2}[A-Z0-9]{10}$/

  async function resolveISINs(incoming: Trade[]): Promise<Trade[]> {
    const unresolvedISINs = [...new Set(
      incoming.map((t) => t.ticker).filter((tk) => ISIN_RE.test(tk))
    )]
    if (!unresolvedISINs.length) return incoming

    try {
      const res = await fetch('/api/figi', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isins: unresolvedISINs }),
      })
      if (!res.ok) return incoming
      const map = (await res.json()) as Record<string, { ticker: string; market: string }>

      return incoming.map((trade) => {
        const resolved = map[trade.ticker]
        if (!resolved) return trade
        return { ...trade, ticker: resolved.ticker, market: resolved.market as Trade['market'] }
      })
    } catch {
      return incoming
    }
  }

  function handleBrokerCSVChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = async (ev) => {
      try {
        const raw = ev.target?.result as string
        const { trades: incoming, broker, error } = parseBrokerCSV(raw)

        if (error || broker === 'unknown') {
          alert(t('data.brokerUnknown'))
          return
        }

        if (incoming.length === 0) {
          alert(t('data.csvNoTrades'))
          return
        }

        const resolved = await resolveISINs(incoming)

        const message = t('data.brokerDetected', { broker, n: resolved.length }) +
          '\n\n' + t('data.confirmImport', { n: resolved.length, t: trades.length })

        requestConfirm({
          title: t('confirm.importTitle'),
          message,
          variant: 'primary',
          onConfirm: () => { importTrades(resolved); onClose() },
        })
      } catch { alert(t('data.csvError')) }
      finally { if (brokerInputRef.current) brokerInputRef.current.value = '' }
    }
    reader.readAsText(file, 'euc-kr')
  }

  function handleExportCSV() {
    const allTrades = getAllTrades()
    const typeLabel: Record<string, string> = { buy: '매수', sell: '매도', dividend: '배당', split: '분할' }
    const headers = ['포트폴리오', '날짜', '티커', '종목명', '시장', '거래유형', '수량', '단가', '거래금액', '노트']
    const rows = allTrades.map(({ trade: tr, portfolioName }) => [
      portfolioName, tr.date, tr.ticker, tr.name, tr.market,
      typeLabel[tr.type] ?? tr.type, String(tr.quantity), String(tr.price),
      tr.type === 'split' ? '0' : String(tr.quantity * tr.price), tr.note,
    ])
    const csvLines = [headers, ...rows].map((row) =>
      row.map((cell) => {
        const str = String(cell)
        return (str.includes(',') || str.includes('"') || str.includes('\n'))
          ? '"' + str.replace(/"/g, '""') + '"'
          : str
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
      {confirmDialog}
      <div className="fixed inset-0 bg-black/60 z-40 backdrop-blur-sm" onClick={onClose} />

      <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
        <div className="bg-surface-900 border border-slate-800 rounded-xl shadow-2xl w-full max-w-sm">
          <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800">
            <h2 className="text-base font-semibold text-slate-100">{t('data.title')}</h2>
            <button onClick={onClose} className="text-slate-500 hover:text-slate-300 text-2xl leading-none">×</button>
          </div>

          <div className="px-5 py-5 space-y-3">
            <p className="text-xs text-slate-500 mb-4">
              {t('data.portfolioCount', { n: portfolios.length, t: totalTradesAll })}
            </p>

            <ActionButton icon={<DownloadIcon />} label={t('data.exportJSON')} description={t('data.exportJSONDesc')} onClick={handleExportJSON} />
            <ActionButton icon={<UploadIcon />} label={t('data.importJSON')} description={t('data.importJSONDesc')} onClick={handleImportJSON} danger />
            <ActionButton icon={<CsvIcon />} label={t('data.exportCSV')} description={t('data.exportCSVDesc')} onClick={handleExportCSV} />
            <ActionButton icon={<UploadIcon />} label={t('data.importCSV')} description={t('data.importCSVDesc')} onClick={handleImportCSV} danger />
            <ActionButton icon={<BrokerIcon />} label={t('data.importBrokerCSV')} description={t('data.importBrokerCSVDesc')} onClick={handleImportBrokerCSV} danger />
          </div>
        </div>
      </div>

      <input ref={fileInputRef} type="file" accept=".json" className="hidden" onChange={handleFileChange} />
      <input ref={csvInputRef} type="file" accept=".csv" className="hidden" onChange={handleCSVChange} />
      <input ref={brokerInputRef} type="file" accept=".csv" className="hidden" onChange={handleBrokerCSVChange} />
    </>
  )
}

function parseCSVLine(line: string): string[] {
  const cells: string[] = []
  let i = 0
  while (i < line.length) {
    if (line[i] === '"') {
      let cell = ''
      i++
      while (i < line.length) {
        if (line[i] === '"' && line[i + 1] === '"') { cell += '"'; i += 2 }
        else if (line[i] === '"') { i++; break }
        else { cell += line[i++] }
      }
      cells.push(cell)
      if (line[i] === ',') i++
    } else {
      const end = line.indexOf(',', i)
      if (end === -1) { cells.push(line.slice(i)); break }
      cells.push(line.slice(i, end))
      i = end + 1
    }
  }
  return cells
}

function ActionButton({ icon, label, description, onClick, danger = false }: {
  icon: React.ReactNode; label: string; description: string; onClick: () => void; danger?: boolean
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

function BrokerIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="7" width="20" height="14" rx="2" ry="2" />
      <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
    </svg>
  )
}
