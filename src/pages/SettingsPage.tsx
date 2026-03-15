import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { db, type AppSettings } from '../db'

const CLAUDE_MODELS = [
  { id: 'claude-haiku-4-5-20251001', name: 'Haiku 4.5', desc: 'Fastest' },
  { id: 'claude-sonnet-4-6-20260310', name: 'Sonnet 4.6', desc: 'Balanced' },
  { id: 'claude-opus-4-6-20260310', name: 'Opus 4.6', desc: 'Most capable' },
]

const OPENAI_MODELS = [
  { id: 'gpt-4.1-nano', name: 'GPT-4.1 Nano', desc: 'Cheapest' },
  { id: 'gpt-5-mini', name: 'GPT-5 Mini', desc: 'Best value' },
  { id: 'gpt-5', name: 'GPT-5', desc: 'Powerful' },
  { id: 'gpt-5.4', name: 'GPT-5.4', desc: 'Most capable' },
]

const DEFAULT_SETTINGS: AppSettings = {
  aiProvider: 'claude',
  claudeApiKey: '',
  claudeModel: 'claude-haiku-4-5-20251001',
  openaiApiKey: '',
  openaiModel: 'gpt-5-mini',
}

export default function SettingsPage() {
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS)
  const [saved, setSaved] = useState(false)
  const [showClaudeKey, setShowClaudeKey] = useState(false)
  const [showOpenaiKey, setShowOpenaiKey] = useState(false)

  useEffect(() => {
    db.settings.toCollection().first().then((s) => { if (s) setSettings(s) })
  }, [])

  async function handleSave() {
    const existing = await db.settings.toCollection().first()
    if (existing?.id) { await db.settings.update(existing.id, settings) }
    else { await db.settings.add(settings) }
    setSaved(true)
    setTimeout(() => setSaved(false), 2500)
  }

  function update(partial: Partial<AppSettings>) {
    setSettings((prev) => ({ ...prev, ...partial }))
  }

  return (
    <div className="max-w-lg mx-auto px-6 py-12">
      <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }} className="mb-12">
        <h2 className="font-serif text-3xl font-medium tracking-wide text-stone-800 mb-2">設定</h2>
        <div className="w-8 h-px bg-stone-300 mb-3" />
        <p className="text-xs text-stone-800 tracking-widest font-light">SETTINGS</p>
      </motion.div>

      {/* Provider */}
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.1 }} className="mb-10">
        <p className="text-[10px] tracking-[0.25em] uppercase text-stone-800 mb-4">Provider</p>
        <div className="flex gap-0">
          <button
            onClick={() => update({ aiProvider: 'claude' })}
            className={`flex-1 py-3 text-xs tracking-[0.15em] border border-hair transition-all duration-500 ${
              settings.aiProvider === 'claude'
                ? 'bg-stone-900 text-white border-stone-900'
                : 'bg-transparent text-stone-800 border-stone-200 hover:text-stone-800 hover:border-stone-600'
            }`}
          >
            Claude
          </button>
          <button
            onClick={() => update({ aiProvider: 'openai' })}
            className={`flex-1 py-3 text-xs tracking-[0.15em] border border-hair border-l-0 transition-all duration-500 ${
              settings.aiProvider === 'openai'
                ? 'bg-stone-900 text-white border-stone-900'
                : 'bg-transparent text-stone-800 border-stone-200 hover:text-stone-800 hover:border-stone-600'
            }`}
          >
            OpenAI
          </button>
        </div>
      </motion.div>

      {/* Claude */}
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.15 }} className="mb-10">
        <p className="text-[10px] tracking-[0.25em] uppercase text-stone-800 mb-6">Claude API</p>
        <div className="space-y-6">
          <div>
            <label className="text-[10px] tracking-[0.2em] uppercase text-stone-800 font-light mb-2 block">API Key</label>
            <div className="relative">
              <input
                type={showClaudeKey ? 'text' : 'password'}
                value={settings.claudeApiKey}
                onChange={(e) => update({ claudeApiKey: e.target.value })}
                placeholder="sk-ant-..."
                className="w-full border-b border-stone-200 focus:border-stone-800 py-2 text-sm bg-transparent outline-none transition-colors duration-500 font-mono pr-12"
              />
              <button
                onClick={() => setShowClaudeKey(!showClaudeKey)}
                className="absolute right-0 top-1/2 -translate-y-1/2 text-[9px] text-stone-800 hover:text-stone-700 tracking-widest transition-colors"
              >
                {showClaudeKey ? 'HIDE' : 'SHOW'}
              </button>
            </div>
          </div>
          <div>
            <label className="text-[10px] tracking-[0.2em] uppercase text-stone-800 font-light mb-3 block">Model</label>
            <div className="space-y-0">
              {CLAUDE_MODELS.map((m) => (
                <button
                  key={m.id}
                  onClick={() => update({ claudeModel: m.id })}
                  className={`w-full flex items-center gap-4 py-3 border-t border-hair border-stone-300 text-left transition-all duration-300 group ${
                    settings.claudeModel === m.id ? 'text-stone-900' : 'text-stone-800 hover:text-stone-800'
                  }`}
                >
                  <div className={`w-2 h-2 rounded-full border transition-all duration-300 ${
                    settings.claudeModel === m.id ? 'border-stone-900 bg-stone-900' : 'border-stone-500'
                  }`} />
                  <span className="text-sm tracking-wide">{m.name}</span>
                  <span className="text-[10px] text-stone-700 ml-auto font-light">{m.desc}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </motion.div>

      {/* OpenAI */}
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }} className="mb-12">
        <p className="text-[10px] tracking-[0.25em] uppercase text-stone-800 mb-6">OpenAI API</p>
        <div className="space-y-6">
          <div>
            <label className="text-[10px] tracking-[0.2em] uppercase text-stone-800 font-light mb-2 block">API Key</label>
            <div className="relative">
              <input
                type={showOpenaiKey ? 'text' : 'password'}
                value={settings.openaiApiKey}
                onChange={(e) => update({ openaiApiKey: e.target.value })}
                placeholder="sk-..."
                className="w-full border-b border-stone-200 focus:border-stone-800 py-2 text-sm bg-transparent outline-none transition-colors duration-500 font-mono pr-12"
              />
              <button
                onClick={() => setShowOpenaiKey(!showOpenaiKey)}
                className="absolute right-0 top-1/2 -translate-y-1/2 text-[9px] text-stone-800 hover:text-stone-700 tracking-widest transition-colors"
              >
                {showOpenaiKey ? 'HIDE' : 'SHOW'}
              </button>
            </div>
          </div>
          <div>
            <label className="text-[10px] tracking-[0.2em] uppercase text-stone-800 font-light mb-3 block">Model</label>
            <div className="space-y-0">
              {OPENAI_MODELS.map((m) => (
                <button
                  key={m.id}
                  onClick={() => update({ openaiModel: m.id })}
                  className={`w-full flex items-center gap-4 py-3 border-t border-hair border-stone-300 text-left transition-all duration-300 ${
                    settings.openaiModel === m.id ? 'text-stone-900' : 'text-stone-800 hover:text-stone-800'
                  }`}
                >
                  <div className={`w-2 h-2 rounded-full border transition-all duration-300 ${
                    settings.openaiModel === m.id ? 'border-stone-900 bg-stone-900' : 'border-stone-500'
                  }`} />
                  <span className="text-sm tracking-wide">{m.name}</span>
                  <span className="text-[10px] text-stone-700 ml-auto font-light">{m.desc}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </motion.div>

      {/* Save */}
      <motion.button
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3 }}
        onClick={handleSave}
        className={`w-full py-3.5 text-[10px] tracking-[0.25em] uppercase transition-all duration-500 ${
          saved
            ? 'bg-stone-900 text-white'
            : 'border border-hair border-stone-900 text-stone-900 hover:bg-stone-900 hover:text-white'
        }`}
      >
        {saved ? 'Saved' : 'Save Settings'}
      </motion.button>

      <p className="text-[10px] text-stone-700 text-center mt-8 tracking-wider font-light leading-relaxed">
        API keys are stored locally in your browser only.
      </p>
    </div>
  )
}
