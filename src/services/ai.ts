import { db, type AppSettings } from '../db'

async function getSettings(): Promise<AppSettings | undefined> {
  return db.settings.toCollection().first()
}

export interface SummarizeOptions {
  includeMaterials?: boolean
  advanced?: boolean
  subjectId?: number
  session?: number
}

export async function summarizeText(text: string, instruction?: string, options?: SummarizeOptions): Promise<string> {
  const settings = await getSettings()
  if (!settings) throw new Error('APIの設定がされていません。設定画面からAPIキーを入力してください。')

  let contextText = text

  // 資料も読み込む場合
  if (options?.includeMaterials && options.subjectId) {
    const query = options.session
      ? db.materials.where('[subjectId+session]').equals([options.subjectId, options.session])
      : db.materials.where('subjectId').equals(options.subjectId)

    let materialTexts: string[] = []
    try {
      const mats = await query.toArray()
      materialTexts = mats.map((m) => `【資料: ${m.fileName}】\n${m.extractedText}`)
    } catch {
      // index not available, fallback
      const allMats = await db.materials.where('subjectId').equals(options.subjectId).toArray()
      const filtered = options.session ? allMats.filter((m) => m.session === options.session) : allMats
      materialTexts = filtered.map((m) => `【資料: ${m.fileName}】\n${m.extractedText}`)
    }

    if (materialTexts.length > 0) {
      contextText = `${text}\n\n===== 関連資料 =====\n\n${materialTexts.join('\n\n---\n\n')}`
    }
  }

  const baseInstruction = instruction
    || '以下の授業資料・ノートの内容を、大学生の復習に役立つように日本語で要約してください。重要なポイントを箇条書きでまとめ、キーワードも整理してください。'

  const advancedSuffix = options?.advanced
    ? '\n\nさらに以下も含めてください:\n- 概念間の関係性や因果関係の図解（テキストベース）\n- 試験で問われそうな重要ポイントの強調\n- 理解度を確認するための確認問題を3つ\n- 関連する概念や発展的な内容への言及'
    : ''

  const prompt = `${baseInstruction}${advancedSuffix}\n\n---\n\n${contextText}`

  if (settings.aiProvider === 'claude') {
    return callClaude(settings, prompt, options?.advanced)
  } else {
    return callOpenAI(settings, prompt, options?.advanced)
  }
}

async function callClaude(settings: AppSettings, prompt: string, advanced?: boolean): Promise<string> {
  if (!settings.claudeApiKey) throw new Error('Claude APIキーが設定されていません。')

  // 高度モードの場合、より高性能なモデルにアップグレード
  let model = settings.claudeModel || 'claude-haiku-4-5-20251001'
  if (advanced && model.includes('haiku')) {
    model = 'claude-sonnet-4-6-20260310'
  }

  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': settings.claudeApiKey,
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true',
    },
    body: JSON.stringify({
      model,
      max_tokens: advanced ? 8192 : 4096,
      messages: [{ role: 'user', content: prompt }],
    }),
  })

  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(`Claude API エラー: ${(err as Record<string, unknown>).error || res.statusText}`)
  }

  const data = await res.json()
  return data.content[0].text
}

async function callOpenAI(settings: AppSettings, prompt: string, advanced?: boolean): Promise<string> {
  if (!settings.openaiApiKey) throw new Error('OpenAI APIキーが設定されていません。')

  // 高度モードの場合、より高性能なモデルにアップグレード
  let model = settings.openaiModel || 'gpt-5-mini'
  if (advanced && (model.includes('mini') || model.includes('nano'))) {
    model = 'gpt-5'
  }

  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${settings.openaiApiKey}`,
    },
    body: JSON.stringify({
      model,
      messages: [{ role: 'user', content: prompt }],
      max_tokens: advanced ? 8192 : 4096,
    }),
  })

  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(`OpenAI API エラー: ${(err as Record<string, unknown>).error || res.statusText}`)
  }

  const data = await res.json()
  return data.choices[0].message.content
}
