import { useState } from 'react'
import type { PinnedNote } from '../../types'
import { usePortfolioStore } from '../../store/portfolioStore'

const NOTE_COLORS: { key: PinnedNote['color']; bg: string; border: string; text: string }[] = [
  { key: 'yellow', bg: 'bg-yellow-900/30', border: 'border-yellow-700/40', text: 'text-yellow-200' },
  { key: 'green',  bg: 'bg-emerald-900/30', border: 'border-emerald-700/40', text: 'text-emerald-200' },
  { key: 'blue',   bg: 'bg-blue-900/30', border: 'border-blue-700/40', text: 'text-blue-200' },
  { key: 'purple', bg: 'bg-violet-900/30', border: 'border-violet-700/40', text: 'text-violet-200' },
]

export function PinnedNotes() {
  const pinnedNotes = usePortfolioStore((s) => s.pinnedNotes)
  const addPinnedNote = usePortfolioStore((s) => s.addPinnedNote)
  const updatePinnedNote = usePortfolioStore((s) => s.updatePinnedNote)
  const deletePinnedNote = usePortfolioStore((s) => s.deletePinnedNote)

  const [showAdd, setShowAdd] = useState(false)
  const [newText, setNewText] = useState('')
  const [newColor, setNewColor] = useState<PinnedNote['color']>('yellow')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editText, setEditText] = useState('')

  function handleAdd() {
    if (!newText.trim()) return
    addPinnedNote(newText.trim(), newColor)
    setNewText('')
    setShowAdd(false)
  }

  function startEdit(note: PinnedNote) {
    setEditingId(note.id)
    setEditText(note.text)
  }

  function saveEdit(id: string) {
    if (editText.trim()) updatePinnedNote(id, editText.trim())
    setEditingId(null)
  }

  if (pinnedNotes.length === 0 && !showAdd) {
    return (
      <div className="flex justify-end">
        <button
          onClick={() => setShowAdd(true)}
          className="text-xs text-slate-600 hover:text-indigo-400 transition-colors"
        >
          + 고정 메모 추가
        </button>
      </div>
    )
  }

  return (
    <div>
      {pinnedNotes.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 mb-3">
          {pinnedNotes.map((note) => {
            const c = NOTE_COLORS.find((x) => x.key === note.color) ?? NOTE_COLORS[0]
            return (
              <div
                key={note.id}
                className={`${c.bg} border ${c.border} rounded-xl p-3.5 relative group`}
              >
                {editingId === note.id ? (
                  <div>
                    <textarea
                      autoFocus
                      value={editText}
                      onChange={(e) => setEditText(e.target.value)}
                      onKeyDown={(e) => { if (e.key === 'Escape') setEditingId(null) }}
                      rows={3}
                      className="w-full bg-transparent text-sm text-slate-200 resize-none focus:outline-none"
                    />
                    <div className="flex gap-2 mt-2">
                      <button onClick={() => saveEdit(note.id)} className="text-xs text-indigo-400 hover:text-indigo-300">저장</button>
                      <button onClick={() => setEditingId(null)} className="text-xs text-slate-500">취소</button>
                    </div>
                  </div>
                ) : (
                  <>
                    <p className={`text-sm ${c.text} leading-relaxed whitespace-pre-wrap`}>{note.text}</p>
                    <div className="absolute top-2 right-2 hidden group-hover:flex gap-1">
                      <button
                        onClick={() => startEdit(note)}
                        className="text-slate-500 hover:text-slate-300 text-xs p-1 rounded hover:bg-slate-700/50 transition-colors"
                      >
                        ✏️
                      </button>
                      <button
                        onClick={() => deletePinnedNote(note.id)}
                        className="text-slate-500 hover:text-red-400 text-xs p-1 rounded hover:bg-red-900/20 transition-colors"
                      >
                        ×
                      </button>
                    </div>
                  </>
                )}
              </div>
            )
          })}
        </div>
      )}

      {showAdd ? (
        <div className="card p-4 space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-xs font-medium text-slate-400 uppercase tracking-wide">새 메모</p>
            <div className="flex gap-1.5">
              {NOTE_COLORS.map((c) => (
                <button
                  key={c.key}
                  onClick={() => setNewColor(c.key)}
                  className={`w-5 h-5 rounded-full border-2 transition-all ${c.bg} ${
                    newColor === c.key ? 'border-white scale-110' : 'border-transparent'
                  }`}
                />
              ))}
            </div>
          </div>
          <textarea
            autoFocus
            value={newText}
            onChange={(e) => setNewText(e.target.value)}
            placeholder="메모 내용..."
            rows={3}
            className="input-field resize-none"
          />
          <div className="flex gap-2">
            <button onClick={handleAdd} className="btn-primary text-xs px-3 py-1.5">추가</button>
            <button onClick={() => setShowAdd(false)} className="text-xs text-slate-400 hover:text-slate-200 px-2">취소</button>
          </div>
        </div>
      ) : (
        <div className="flex justify-end">
          <button onClick={() => setShowAdd(true)} className="text-xs text-slate-600 hover:text-indigo-400 transition-colors">
            + 고정 메모 추가
          </button>
        </div>
      )}
    </div>
  )
}
