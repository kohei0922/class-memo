import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import { motion } from 'framer-motion'
import { db } from '../db'
import { useSubjects } from '../hooks/useSubjects'

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri']
const DAYS_JP = ['月', '火', '水', '木', '金']
const PERIODS = [1, 2, 3, 4, 5, 6]
const COLORS = [
  { value: '#78716c', name: 'Stone' },
  { value: '#6b7280', name: 'Gray' },
  { value: '#92400e', name: 'Amber' },
  { value: '#854d0e', name: 'Gold' },
  { value: '#166534', name: 'Green' },
  { value: '#1e3a5f', name: 'Navy' },
  { value: '#4c1d95', name: 'Violet' },
  { value: '#7c2d12', name: 'Rust' },
  { value: '#1a1a1a', name: 'Black' },
  { value: '#9f1239', name: 'Wine' },
]

export default function TimetablePage() {
  const navigate = useNavigate()
  const { subjects, addSubject, deleteSubject } = useSubjects()
  const slots = useLiveQuery(() => db.timetableSlots.toArray()) ?? []

  const [addTarget, setAddTarget] = useState<{ day: number; period: number } | null>(null)
  const [newName, setNewName] = useState('')
  const [newTeacher, setNewTeacher] = useState('')
  const [newRoom, setNewRoom] = useState('')
  const [newColor, setNewColor] = useState(COLORS[0].value)
  const [deleteConfirm, setDeleteConfirm] = useState<{ subjectId: number; subjectName: string; step: 1 | 2 } | null>(null)

  function getSlot(day: number, period: number) {
    return slots.find((s) => s.dayOfWeek === day && s.period === period)
  }
  function getSubject(id: number) {
    return subjects.find((s) => s.id === id)
  }

  function handleCellClick(day: number, period: number) {
    const slot = getSlot(day, period)
    if (slot) { navigate(`/subjects/${slot.subjectId}`) }
    else { setAddTarget({ day, period }); setNewName(''); setNewTeacher(''); setNewRoom(''); setNewColor(COLORS[Math.floor(Math.random() * COLORS.length)].value) }
  }

  async function handleAddSubject() {
    if (!newName.trim() || !addTarget) return
    const id = await addSubject({ name: newName.trim(), color: newColor, teacher: newTeacher.trim(), room: newRoom.trim(), sessionCount: 14 })
    await db.timetableSlots.add({ subjectId: id as number, dayOfWeek: addTarget.day, period: addTarget.period })
    setAddTarget(null)
  }

  function startDelete(subjectId: number, subjectName: string, e: React.MouseEvent) {
    e.stopPropagation()
    setDeleteConfirm({ subjectId, subjectName, step: 1 })
  }

  async function confirmDelete() {
    if (!deleteConfirm) return
    if (deleteConfirm.step === 1) { setDeleteConfirm({ ...deleteConfirm, step: 2 }) }
    else { await deleteSubject(deleteConfirm.subjectId); setDeleteConfirm(null) }
  }

  return (
    <div className="max-w-3xl mx-auto px-6 py-12">
      <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }} className="mb-12">
        <h2 className="font-serif text-3xl font-medium tracking-wide text-stone-800 mb-2">時間割</h2>
        <div className="w-8 h-px bg-stone-400/60 mb-3" />
        <p className="text-xs text-stone-800 tracking-widest font-light">TIMETABLE</p>
      </motion.div>

      {/* Grid */}
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.15, duration: 0.5 }}>
        <table className="w-full border-collapse table-fixed">
          <thead>
            <tr>
              <th className="w-10" />
              {DAYS.map((day, i) => (
                <th key={day} className="pb-4 text-center">
                  <div className="text-[10px] tracking-[0.25em] uppercase text-stone-800 font-light">{day}</div>
                  <div className="font-serif text-lg text-stone-600 font-light mt-0.5">{DAYS_JP[i]}</div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {PERIODS.map((period, pIdx) => (
              <motion.tr
                key={period}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.08 * pIdx + 0.2 }}
              >
                <td className="pr-3 text-right align-top pt-4">
                  <span className="font-display text-lg text-stone-800/70 italic">{period}</span>
                </td>
                {DAYS.map((_, dayIdx) => {
                  const slot = getSlot(dayIdx, period)
                  const subject = slot ? getSubject(slot.subjectId) : null
                  return (
                    <td key={dayIdx} className="p-[3px]">
                      <div
                        onClick={() => handleCellClick(dayIdx, period)}
                        className="h-[76px] cursor-pointer transition-all duration-500 group relative"
                      >
                        {subject ? (
                          <div
                            className="h-full border hover:opacity-90 transition-all duration-500 p-2.5 flex flex-col justify-between"
                            style={{ borderColor: subject.color + '60', backgroundColor: subject.color + '0a' }}
                          >
                            <div className="flex items-start gap-1.5">
                              <div className="w-1.5 h-1.5 rounded-full mt-1 shrink-0" style={{ backgroundColor: subject.color }} />
                              <div className="font-serif text-[13px] text-stone-800 leading-tight tracking-wide">
                                {subject.name}
                              </div>
                            </div>
                            {subject.room && (
                              <div className="text-[10px] text-stone-500 tracking-wider pl-3">
                                {subject.room}
                              </div>
                            )}
                            <button
                              onClick={(e) => startDelete(slot!.subjectId, subject.name, e)}
                              className="absolute top-1 right-1.5 text-[9px] text-stone-700 opacity-0 group-hover:opacity-100 hover:text-stone-800 transition-all duration-300 tracking-wider"
                            >
                              remove
                            </button>
                          </div>
                        ) : (
                          <div className="h-full border border-stone-300 hover:border-stone-500 bg-white/20 hover:bg-white/40 transition-all duration-500 flex items-center justify-center">
                            <span className="text-stone-400 group-hover:text-stone-600 transition-colors duration-300 text-xs">+</span>
                          </div>
                        )}
                      </div>
                    </td>
                  )
                })}
              </motion.tr>
            ))}
          </tbody>
        </table>
      </motion.div>

      {subjects.length === 0 && (
        <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.8 }} className="text-center text-xs text-stone-800 mt-12 tracking-widest font-light">
          空きマスをクリックして科目を追加
        </motion.p>
      )}

      {/* 削除確認 */}
      {deleteConfirm && (
        <div className="fixed inset-0 bg-stone-100/80 backdrop-blur-sm flex items-center justify-center z-50 p-6" onClick={() => setDeleteConfirm(null)}>
          <motion.div
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-stone-50 border border-stone-500/60 p-8 w-full max-w-sm shadow-sm"
            onClick={(e) => e.stopPropagation()}
          >
            {deleteConfirm.step === 1 ? (
              <>
                <p className="font-serif text-lg text-stone-800 mb-3">削除しますか</p>
                <p className="text-sm text-stone-700 font-light mb-2">「{deleteConfirm.subjectName}」を削除します。</p>
                <p className="text-xs text-stone-800 font-light mb-8">関連するすべてのメモ・資料も失われます。</p>
                <div className="flex gap-3">
                  <button onClick={() => setDeleteConfirm(null)} className="flex-1 py-2.5 border border-stone-500 text-xs tracking-widest text-stone-700 hover:text-stone-800 hover:border-stone-500 transition-all duration-300">CANCEL</button>
                  <button onClick={confirmDelete} className="flex-1 py-2.5 bg-stone-800 text-white text-xs tracking-widest hover:bg-stone-600 transition-all duration-300">DELETE</button>
                </div>
              </>
            ) : (
              <>
                <p className="font-serif text-lg text-stone-800 mb-3">本当に削除しますか</p>
                <p className="text-sm text-stone-700 font-light mb-2">「{deleteConfirm.subjectName}」のすべてのデータが完全に削除されます。</p>
                <p className="text-xs text-stone-800 font-light mb-8">この操作は取り消せません。</p>
                <div className="flex gap-3">
                  <button onClick={() => setDeleteConfirm(null)} className="flex-1 py-2.5 border border-stone-500 text-xs tracking-widest text-stone-700 hover:text-stone-800 hover:border-stone-500 transition-all duration-300">CANCEL</button>
                  <button onClick={confirmDelete} className="flex-1 py-2.5 bg-stone-900 text-white text-xs tracking-widest hover:bg-red-900 transition-all duration-300">CONFIRM</button>
                </div>
              </>
            )}
          </motion.div>
        </div>
      )}

      {/* 追加モーダル */}
      {addTarget && (
        <div className="fixed inset-0 bg-stone-100/80 backdrop-blur-sm flex items-center justify-center z-50 p-6" onClick={() => setAddTarget(null)}>
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-stone-50 border border-stone-500/60 p-8 w-full max-w-sm shadow-sm"
            onClick={(e) => e.stopPropagation()}
          >
            <p className="font-serif text-lg text-stone-800 mb-1">科目を追加</p>
            <p className="text-[10px] text-stone-800 tracking-widest font-light mb-8">{DAYS_JP[addTarget.day]}曜 {addTarget.period}限</p>

            <div className="space-y-5">
              <div>
                <label className="text-[10px] tracking-[0.2em] uppercase text-stone-800 font-light mb-2 block">Subject Name</label>
                <input value={newName} onChange={(e) => setNewName(e.target.value)} className="w-full border-b border-stone-500 focus:border-stone-700 py-2 text-sm bg-transparent outline-none transition-colors duration-500" autoFocus />
              </div>
              <div>
                <label className="text-[10px] tracking-[0.2em] uppercase text-stone-800 font-light mb-2 block">Teacher</label>
                <input value={newTeacher} onChange={(e) => setNewTeacher(e.target.value)} className="w-full border-b border-stone-500 focus:border-stone-700 py-2 text-sm bg-transparent outline-none transition-colors duration-500" />
              </div>
              <div>
                <label className="text-[10px] tracking-[0.2em] uppercase text-stone-800 font-light mb-2 block">Room</label>
                <input value={newRoom} onChange={(e) => setNewRoom(e.target.value)} className="w-full border-b border-stone-500 focus:border-stone-700 py-2 text-sm bg-transparent outline-none transition-colors duration-500" />
              </div>
              <div>
                <label className="text-[10px] tracking-[0.2em] uppercase text-stone-800 font-light mb-3 block">Color</label>
                <div className="flex gap-2.5 flex-wrap">
                  {COLORS.map((c) => (
                    <button
                      key={c.value}
                      onClick={() => setNewColor(c.value)}
                      className="w-6 h-6 rounded-full transition-all duration-300"
                      style={{
                        backgroundColor: c.value,
                        boxShadow: newColor === c.value ? `0 0 0 2px #fff, 0 0 0 3.5px ${c.value}` : 'none',
                        transform: newColor === c.value ? 'scale(1.1)' : 'scale(1)',
                      }}
                      title={c.name}
                    />
                  ))}
                </div>
              </div>
            </div>

            <div className="flex gap-3 mt-10">
              <button onClick={() => setAddTarget(null)} className="flex-1 py-2.5 border border-stone-500 text-xs tracking-widest text-stone-700 hover:text-stone-800 hover:border-stone-500 transition-all duration-300">CANCEL</button>
              <button onClick={handleAddSubject} disabled={!newName.trim()} className="flex-1 py-2.5 bg-stone-800 text-white text-xs tracking-widest hover:bg-stone-600 transition-all duration-300 disabled:bg-stone-200 disabled:text-stone-800">ADD</button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  )
}
