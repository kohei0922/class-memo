import { useState, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import { motion, AnimatePresence } from 'framer-motion'
import { db, type Memo, type Material } from '../db'
import { extractTextFromFile } from '../services/fileParser'
import { summarizeText } from '../services/ai'

export default function SubjectDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const subjectId = Number(id)

  const subject = useLiveQuery(() => db.subjects.get(subjectId), [subjectId])
  const memos = useLiveQuery(() => db.memos.where('subjectId').equals(subjectId).toArray(), [subjectId]) ?? []
  const materials = useLiveQuery(() => db.materials.where('subjectId').equals(subjectId).toArray(), [subjectId]) ?? []

  const [expandedSession, setExpandedSession] = useState<number | null>(null)
  const [editingMemo, setEditingMemo] = useState<{ session: number; memo?: Memo } | null>(null)
  const [memoTitle, setMemoTitle] = useState('')
  const [memoContent, setMemoContent] = useState('')
  const [summarizing, setSummarizing] = useState(false)
  const [includeMaterials, setIncludeMaterials] = useState(false)
  const [advancedMode, setAdvancedMode] = useState(false)
  const [uploading, setUploading] = useState<number | null>(null)
  const [uploadProgress, setUploadProgress] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)
  const [uploadSession, setUploadSession] = useState<number | null>(null)

  if (!subject) {
    return (
      <div className="max-w-3xl mx-auto px-6 py-24 text-center">
        <p className="text-stone-800 font-light">科目が見つかりません</p>
        <button onClick={() => navigate('/')} className="text-xs text-stone-700 mt-4 tracking-widest hover:text-stone-800 transition-colors">
          BACK
        </button>
      </div>
    )
  }

  const sessionCount = subject.sessionCount || 14
  const sessions = Array.from({ length: sessionCount }, (_, i) => i + 1)

  function getMemosForSession(s: number) { return memos.filter((m) => m.session === s) }
  function getMaterialsForSession(s: number) { return materials.filter((m) => m.session === s) }

  function openMemoEditor(session: number, memo?: Memo) {
    setEditingMemo({ session, memo })
    setMemoTitle(memo?.title ?? '')
    setMemoContent(memo?.content ?? '')
    setIncludeMaterials(false)
    setAdvancedMode(false)
  }

  async function saveMemo() {
    if (!editingMemo) return
    const now = Date.now()
    if (editingMemo.memo?.id) {
      await db.memos.update(editingMemo.memo.id, { title: memoTitle, content: memoContent, updatedAt: now })
    } else {
      await db.memos.add({ subjectId, session: editingMemo.session, title: memoTitle, content: memoContent, createdAt: now, updatedAt: now })
    }
    setEditingMemo(null)
  }

  async function deleteMemo(memoId: number) { await db.memos.delete(memoId) }

  async function handleSummarizeMemo() {
    if (!editingMemo || !memoContent.trim()) return
    setSummarizing(true)
    try {
      const summary = await summarizeText(memoContent, '以下の授業メモを整理して、重要ポイントと復習用のまとめを作成してください。', { includeMaterials, advanced: advancedMode, subjectId, session: editingMemo.session })
      setMemoContent(memoContent + '\n\n—\nAI Summary:\n' + summary)
    } catch (err) { alert(err instanceof Error ? err.message : 'Error') }
    finally { setSummarizing(false) }
  }

  function triggerFileUpload(session: number) {
    setUploadSession(session)
    setTimeout(() => fileRef.current?.click(), 0)
  }

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file || uploadSession === null) return
    setUploading(uploadSession)
    try {
      setUploadProgress('Extracting...')
      const text = await extractTextFromFile(file)
      if (!text.trim()) { alert('テキストを抽出できませんでした'); return }
      setUploadProgress('Summarizing...')
      let summary = ''
      try { summary = await summarizeText(text) }
      catch (err) { summary = '(Failed: ' + (err instanceof Error ? err.message : 'Error') + ')' }
      await db.materials.add({ subjectId, session: uploadSession, fileName: file.name, fileType: file.name.split('.').pop() || '', extractedText: text, summary, createdAt: Date.now() })
    } catch (err) { alert(err instanceof Error ? err.message : 'Error') }
    finally { setUploading(null); setUploadProgress(''); setUploadSession(null); if (fileRef.current) fileRef.current.value = '' }
  }

  async function deleteMaterial(materialId: number) { await db.materials.delete(materialId) }
  async function addSession() { await db.subjects.update(subjectId, { sessionCount: sessionCount + 1 }) }

  const currentSessionMaterials = editingMemo ? getMaterialsForSession(editingMemo.session) : []

  return (
    <div className="max-w-3xl mx-auto px-6 py-12">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
        <button
          onClick={() => navigate('/')}
          className="text-[10px] tracking-[0.25em] uppercase text-stone-800 hover:text-stone-800 transition-colors duration-300 mb-8 block"
        >
          &larr; Timetable
        </button>

        <div className="flex items-center gap-3">
          <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: subject.color }} />
          <h2 className="font-serif text-3xl font-medium tracking-wide text-stone-800">
            {subject.name}
          </h2>
        </div>
        {(subject.teacher || subject.room) && (
          <p className="text-xs text-stone-800 tracking-wider font-light">
            {[subject.teacher, subject.room].filter(Boolean).join('  /  ')}
          </p>
        )}
        <div className="w-8 h-px bg-stone-300 mt-4 mb-12" />
      </motion.div>

      <input ref={fileRef} type="file" accept=".pdf,.docx,.pptx,.txt,.md,.csv,.png,.jpg,.jpeg,.webp,.bmp" onChange={handleFileUpload} className="hidden" />

      {/* Sessions */}
      <div className="space-y-0">
        {sessions.map((session, idx) => {
          const sessionMemos = getMemosForSession(session)
          const sessionMaterials = getMaterialsForSession(session)
          const isExpanded = expandedSession === session
          const isUploading = uploading === session

          return (
            <motion.div
              key={session}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: idx * 0.03 }}
              className="border-t border-hair border-stone-300"
            >
              <button
                onClick={() => setExpandedSession(isExpanded ? null : session)}
                className="w-full py-5 flex items-center gap-6 text-left group"
              >
                <span className="font-display text-2xl text-stone-700 italic w-8 text-right group-hover:text-stone-700 transition-colors duration-500">
                  {session}
                </span>
                <span className="flex-1 text-sm font-light text-stone-800 tracking-wider group-hover:text-stone-900 transition-colors duration-500">
                  第{session}回
                </span>
                <div className="flex items-center gap-3">
                  {sessionMemos.length > 0 && (
                    <span className="text-[10px] text-stone-800 tracking-wider">{sessionMemos.length} memo</span>
                  )}
                  {sessionMaterials.length > 0 && (
                    <span className="text-[10px] text-stone-800 tracking-wider">{sessionMaterials.length} file</span>
                  )}
                  {isUploading && (
                    <span className="text-[10px] text-stone-800 tracking-wider animate-pulse">{uploadProgress}</span>
                  )}
                  <span className={`text-stone-700 text-[10px] transition-transform duration-300 ${isExpanded ? 'rotate-45' : ''}`}>+</span>
                </div>
              </button>

              <AnimatePresence>
                {isExpanded && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.35, ease: 'easeInOut' }}
                    className="overflow-hidden"
                  >
                    <div className="pl-14 pb-8 space-y-8">
                      {/* Memos */}
                      <div>
                        <div className="flex items-center justify-between mb-4">
                          <span className="text-[10px] tracking-[0.25em] uppercase text-stone-800">Memos</span>
                          <button onClick={() => openMemoEditor(session)} className="text-[10px] tracking-[0.2em] text-stone-800 hover:text-stone-800 transition-colors duration-300">
                            + ADD
                          </button>
                        </div>
                        {sessionMemos.length === 0 ? (
                          <p className="text-xs text-stone-700 font-light italic">No memos yet</p>
                        ) : (
                          <div className="space-y-3">
                            {sessionMemos.map((memo) => {
                              const hasSummary = memo.content.includes('AI Summary:') || memo.content.includes('AI要約:')
                              const summaryText = hasSummary
                                ? memo.content.split(/AI Summary:|AI要約:/).pop()?.trim() || ''
                                : ''
                              return (
                                <MemoCard
                                  key={memo.id}
                                  memo={memo}
                                  hasSummary={hasSummary}
                                  summaryText={summaryText}
                                  onEdit={() => openMemoEditor(session, memo)}
                                  onDelete={() => deleteMemo(memo.id!)}
                                />
                              )
                            })}
                          </div>
                        )}
                      </div>

                      {/* Materials */}
                      <div>
                        <div className="flex items-center justify-between mb-4">
                          <span className="text-[10px] tracking-[0.25em] uppercase text-stone-800">Materials</span>
                          <button
                            onClick={() => triggerFileUpload(session)}
                            disabled={isUploading}
                            className="text-[10px] tracking-[0.2em] text-stone-800 hover:text-stone-800 transition-colors duration-300 disabled:opacity-40"
                          >
                            + UPLOAD
                          </button>
                        </div>
                        {sessionMaterials.length === 0 ? (
                          <p className="text-xs text-stone-700 font-light italic">No materials yet</p>
                        ) : (
                          <div className="space-y-3">
                            {sessionMaterials.map((mat) => (
                              <MaterialCard key={mat.id} material={mat} onDelete={() => deleteMaterial(mat.id!)} />
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          )
        })}
        <div className="border-t border-hair border-stone-300" />
      </div>

      {/* Add Session */}
      <button
        onClick={addSession}
        className="w-full mt-8 py-4 text-[10px] tracking-[0.25em] uppercase text-stone-700 hover:text-stone-800 transition-colors duration-500 font-light"
      >
        + Add session ({sessionCount})
      </button>

      {/* Memo Editor */}
      <AnimatePresence>
        {editingMemo && (
          <div className="fixed inset-0 bg-stone-100/80 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => setEditingMemo(null)}>
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 15 }}
              transition={{ duration: 0.3 }}
              className="bg-stone-50 border border-hair border-stone-200 w-full max-w-lg max-h-[85vh] flex flex-col"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Modal header */}
              <div className="px-8 pt-8 pb-4 flex items-center justify-between border-b border-hair border-stone-300">
                <div>
                  <p className="font-serif text-lg text-stone-800">第{editingMemo.session}回</p>
                  <p className="text-[10px] tracking-[0.2em] uppercase text-stone-800 mt-0.5">Memo</p>
                </div>
                <div className="flex gap-4">
                  <button onClick={() => setEditingMemo(null)} className="text-[10px] tracking-widest text-stone-800 hover:text-stone-800 transition-colors">CANCEL</button>
                  <button onClick={saveMemo} className="text-[10px] tracking-widest bg-stone-900 text-white px-4 py-1.5 hover:bg-stone-700 transition-colors">SAVE</button>
                </div>
              </div>

              {/* Modal body */}
              <div className="flex-1 overflow-y-auto px-8 py-6 space-y-4">
                <div>
                  <label className="text-[10px] tracking-[0.2em] uppercase text-stone-800 font-light mb-2 block">Title</label>
                  <input
                    value={memoTitle}
                    onChange={(e) => setMemoTitle(e.target.value)}
                    className="w-full border-b border-stone-200 focus:border-stone-800 py-2 text-sm bg-transparent outline-none transition-colors duration-500"
                    autoFocus
                  />
                </div>

                <div>
                  <label className="text-[10px] tracking-[0.2em] uppercase text-stone-800 font-light mb-2 block">Content</label>
                  <textarea
                    value={memoContent}
                    onChange={(e) => setMemoContent(e.target.value)}
                    className="w-full min-h-[200px] border border-hair border-stone-200 focus:border-stone-600 p-4 text-sm bg-transparent outline-none transition-colors duration-500 resize-none font-mono text-stone-700 leading-relaxed"
                  />
                </div>

                {/* AI Options */}
                <div className="border-t border-hair border-stone-300 pt-5 space-y-3">
                  <p className="text-[10px] tracking-[0.25em] uppercase text-stone-800 mb-3">AI Options</p>

                  <label className="flex items-center gap-3 cursor-pointer group">
                    <div className={`w-4 h-4 border border-hair transition-all duration-300 flex items-center justify-center ${includeMaterials ? 'border-stone-800 bg-stone-900' : 'border-stone-500'}`}>
                      {includeMaterials && <span className="text-white text-[8px]">&#10003;</span>}
                    </div>
                    <input type="checkbox" checked={includeMaterials} onChange={(e) => setIncludeMaterials(e.target.checked)} className="hidden" />
                    <span className="text-xs text-stone-800 font-light group-hover:text-stone-900 transition-colors">
                      Include materials for this session
                    </span>
                    {currentSessionMaterials.length > 0 && (
                      <span className="text-[10px] text-stone-800">{currentSessionMaterials.length} files</span>
                    )}
                  </label>

                  <label className="flex items-center gap-3 cursor-pointer group">
                    <div className={`w-4 h-4 border border-hair transition-all duration-300 flex items-center justify-center ${advancedMode ? 'border-stone-800 bg-stone-900' : 'border-stone-500'}`}>
                      {advancedMode && <span className="text-white text-[8px]">&#10003;</span>}
                    </div>
                    <input type="checkbox" checked={advancedMode} onChange={(e) => setAdvancedMode(e.target.checked)} className="hidden" />
                    <span className="text-xs text-stone-800 font-light group-hover:text-stone-900 transition-colors">
                      Advanced analysis
                    </span>
                    <span className="text-[10px] text-stone-700 font-light">higher cost</span>
                  </label>
                </div>
              </div>

              {/* AI Button */}
              <div className="px-8 py-5 border-t border-hair border-stone-300">
                <button
                  onClick={handleSummarizeMemo}
                  disabled={summarizing || !memoContent.trim()}
                  className="w-full py-3 bg-stone-900 text-white text-[10px] tracking-[0.25em] uppercase hover:bg-stone-700 transition-all duration-300 disabled:bg-stone-200 disabled:text-stone-800"
                >
                  {summarizing ? 'Processing...' : 'Summarize with AI'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  )
}

function MemoCard({ memo, hasSummary, summaryText, onEdit, onDelete }: {
  memo: Memo; hasSummary: boolean; summaryText: string; onEdit: () => void; onDelete: () => void
}) {
  const [showSummary, setShowSummary] = useState(false)
  const previewText = memo.content.split(/\n---\n/)[0].slice(0, 100)

  return (
    <div className="border-l-2 border-stone-300 hover:border-stone-600 pl-4 py-2 transition-all duration-300">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="text-sm text-stone-700 tracking-wide cursor-pointer hover:text-stone-900 transition-colors" onClick={onEdit}>
              {memo.title || 'Untitled'}
            </span>
            {hasSummary && (
              <span className="text-[9px] tracking-wider text-stone-500 border border-stone-300 px-1.5 py-0.5">AI</span>
            )}
          </div>
          <div className="text-xs text-stone-500 mt-1 line-clamp-2 leading-relaxed">{previewText}</div>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <button onClick={onEdit} className="text-[9px] text-stone-500 hover:text-stone-800 tracking-wider transition-colors">edit</button>
          <button
            onClick={(e) => { e.stopPropagation(); onDelete() }}
            className="text-[9px] text-stone-400 hover:text-stone-700 transition-colors tracking-wider"
          >
            remove
          </button>
        </div>
      </div>
      {hasSummary && (
        <div className="mt-2">
          <button
            onClick={() => setShowSummary(!showSummary)}
            className="text-[10px] tracking-[0.15em] text-stone-500 hover:text-stone-800 transition-colors"
          >
            {showSummary ? '- Hide summary' : '+ View AI summary'}
          </button>
          <AnimatePresence>
            {showSummary && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.25 }}
                className="overflow-hidden"
              >
                <div className="text-xs text-stone-600 whitespace-pre-wrap leading-relaxed border-l border-stone-300 pl-4 mt-2 max-h-60 overflow-y-auto">
                  {summaryText}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}
    </div>
  )
}

function MaterialCard({ material, onDelete }: { material: Material; onDelete: () => void }) {
  const [expanded, setExpanded] = useState(false)

  return (
    <div className="border-l-2 border-stone-300 hover:border-stone-500 transition-all duration-300">
      <button onClick={() => setExpanded(!expanded)} className="w-full pl-4 py-2 flex items-center gap-3 text-left group">
        <span className="flex-1 text-sm text-stone-800 font-light truncate tracking-wide">{material.fileName}</span>
        <span className={`text-[10px] text-stone-700 transition-transform duration-300 ${expanded ? 'rotate-45' : ''}`}>+</span>
      </button>
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="overflow-hidden"
          >
            <div className="pl-4 pb-4 space-y-4">
              <div>
                <p className="text-[10px] tracking-[0.2em] uppercase text-stone-800 mb-2">AI Summary</p>
                <div className="text-xs text-stone-800 font-light whitespace-pre-wrap leading-relaxed border-l border-stone-200 pl-4">
                  {material.summary || 'No summary'}
                </div>
              </div>
              <details>
                <summary className="text-[10px] text-stone-700 cursor-pointer hover:text-stone-700 transition-colors tracking-wider">
                  Raw text
                </summary>
                <div className="text-[11px] text-stone-800 font-mono whitespace-pre-wrap mt-2 max-h-32 overflow-y-auto leading-relaxed">
                  {material.extractedText}
                </div>
              </details>
              <button onClick={onDelete} className="text-[9px] text-stone-700 hover:text-stone-800 tracking-widest transition-colors">
                REMOVE
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
