import Dexie, { type EntityTable } from 'dexie'

export interface Subject {
  id?: number
  name: string
  color: string
  teacher?: string
  room?: string
  sessionCount: number // デフォルト14回
}

export interface TimetableSlot {
  id?: number
  subjectId: number
  dayOfWeek: number // 0=月, 1=火, 2=水, 3=木, 4=金
  period: number    // 1~6
}

export interface Memo {
  id?: number
  subjectId: number
  session: number // 第n回
  title: string
  content: string
  createdAt: number
  updatedAt: number
}

export interface Material {
  id?: number
  subjectId: number
  session: number // 第n回
  fileName: string
  fileType: string
  extractedText: string
  summary: string
  createdAt: number
}

export interface AppSettings {
  id?: number
  aiProvider: 'claude' | 'openai'
  claudeApiKey: string
  claudeModel: string
  openaiApiKey: string
  openaiModel: string
}

const db = new Dexie('ClassMemoDB') as Dexie & {
  subjects: EntityTable<Subject, 'id'>
  timetableSlots: EntityTable<TimetableSlot, 'id'>
  memos: EntityTable<Memo, 'id'>
  materials: EntityTable<Material, 'id'>
  settings: EntityTable<AppSettings, 'id'>
}

db.version(2).stores({
  subjects: '++id, name',
  timetableSlots: '++id, subjectId, [dayOfWeek+period]',
  memos: '++id, subjectId, session, updatedAt',
  materials: '++id, subjectId, session, createdAt',
  settings: '++id',
})

export { db }
