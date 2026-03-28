import { useState } from 'react'
import dayjs from 'dayjs'
import { usePortfolioStore } from '../../store/portfolioStore'
import { useI18n } from '../../hooks/useI18n'

export function ReminderBanner() {
  const reminders = usePortfolioStore((s) => s.reminders)
  const dismissReminder = usePortfolioStore((s) => s.dismissReminder)
  const deleteReminder = usePortfolioStore((s) => s.deleteReminder)
  const addReminder = usePortfolioStore((s) => s.addReminder)
  const { t } = useI18n()

  const [showAdd, setShowAdd] = useState(false)
  const [newText, setNewText] = useState('')
  const [newDate, setNewDate] = useState(dayjs().add(7, 'day').format('YYYY-MM-DD'))
  const [newTicker, setNewTicker] = useState('')

  const today = dayjs().format('YYYY-MM-DD')
  const active = reminders.filter((r) => !r.dismissed && r.date <= today)
  const upcoming = reminders.filter((r) => !r.dismissed && r.date > today)

  function handleAdd() {
    if (!newText.trim()) return
    addReminder({ text: newText.trim(), date: newDate, ticker: newTicker.trim() || undefined })
    setNewText('')
    setNewTicker('')
    setNewDate(dayjs().add(7, 'day').format('YYYY-MM-DD'))
    setShowAdd(false)
  }

  if (active.length === 0 && upcoming.length === 0 && !showAdd) {
    return (
      <div className="flex justify-end">
        <button
          onClick={() => setShowAdd(true)}
          className="text-xs text-slate-600 hover:text-indigo-400 transition-colors"
        >
          {t('reminder.addBtn')}
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-2">
      {/* Active reminders */}
      {active.map((r) => (
        <div key={r.id} className="flex items-start gap-3 bg-amber-900/20 border border-amber-800/40 rounded-xl px-4 py-3">
          <span className="text-amber-400 text-base mt-0.5">🔔</span>
          <div className="flex-1 min-w-0">
            <p className="text-sm text-amber-200">{r.text}</p>
            <p className="text-xs text-amber-600 mt-0.5">
              {r.ticker && <span className="font-mono mr-2">{r.ticker}</span>}
              {dayjs(r.date).format('YYYY.MM.DD')}
            </p>
          </div>
          <div className="flex gap-2 flex-shrink-0">
            <button
              onClick={() => dismissReminder(r.id)}
              className="text-xs text-amber-600 hover:text-amber-300 transition-colors"
            >
              {t('reminder.done')}
            </button>
            <button
              onClick={() => deleteReminder(r.id)}
              className="text-xs text-slate-600 hover:text-red-400 transition-colors"
            >
              {t('reminder.delete')}
            </button>
          </div>
        </div>
      ))}

      {/* Upcoming reminders (collapsed) */}
      {upcoming.length > 0 && (
        <div className="flex items-center gap-2 px-1">
          <span className="text-xs text-slate-600">{t('reminder.upcoming', { n: upcoming.length })}</span>
          {upcoming.slice(0, 3).map((r) => (
            <span key={r.id} className="text-xs bg-slate-800 text-slate-400 px-2 py-0.5 rounded-full flex items-center gap-1">
              {r.ticker && <span className="font-mono">{r.ticker}</span>}
              {dayjs(r.date).format('MM.DD')}
              <button onClick={() => deleteReminder(r.id)} className="text-slate-600 hover:text-red-400 ml-1">×</button>
            </span>
          ))}
          {upcoming.length > 3 && <span className="text-xs text-slate-600">+{upcoming.length - 3}</span>}
        </div>
      )}

      {/* Add form */}
      {showAdd ? (
        <div className="card p-4 space-y-3">
          <p className="text-xs font-medium text-slate-400 uppercase tracking-wide">{t('reminder.newTitle')}</p>
          <input
            type="text"
            value={newText}
            onChange={(e) => setNewText(e.target.value)}
            placeholder={t('reminder.textPlaceholder')}
            className="input-field"
            autoFocus
          />
          <div className="grid grid-cols-2 gap-3">
            <input
              type="text"
              value={newTicker}
              onChange={(e) => setNewTicker(e.target.value.toUpperCase())}
              placeholder={t('reminder.tickerPlaceholder')}
              className="input-field font-mono"
            />
            <input
              type="date"
              value={newDate}
              onChange={(e) => setNewDate(e.target.value)}
              className="input-field"
            />
          </div>
          <div className="flex gap-2">
            <button onClick={handleAdd} className="btn-primary text-xs px-3 py-1.5">{t('reminder.add')}</button>
            <button onClick={() => setShowAdd(false)} className="text-xs text-slate-400 hover:text-slate-200 px-2">{t('reminder.cancel')}</button>
          </div>
        </div>
      ) : (
        <div className="flex justify-end">
          <button onClick={() => setShowAdd(true)} className="text-xs text-slate-600 hover:text-indigo-400 transition-colors">
            {t('reminder.addBtn')}
          </button>
        </div>
      )}
    </div>
  )
}
