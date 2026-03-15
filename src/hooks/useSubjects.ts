import { useLiveQuery } from 'dexie-react-hooks'
import { db, type Subject } from '../db'

export function useSubjects() {
  const subjects = useLiveQuery(() => db.subjects.toArray()) ?? []

  async function addSubject(subject: Omit<Subject, 'id'>) {
    return db.subjects.add(subject)
  }

  async function updateSubject(id: number, changes: Partial<Subject>) {
    return db.subjects.update(id, changes)
  }

  async function deleteSubject(id: number) {
    await db.transaction('rw', [db.subjects, db.timetableSlots, db.memos, db.materials], async () => {
      await db.timetableSlots.where('subjectId').equals(id).delete()
      await db.memos.where('subjectId').equals(id).delete()
      await db.materials.where('subjectId').equals(id).delete()
      await db.subjects.delete(id)
    })
  }

  return { subjects, addSubject, updateSubject, deleteSubject }
}
