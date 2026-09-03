import { useEffect, useRef, useState } from 'react'
import { Bot, ChevronDown, Loader2, Send, Sparkles, X } from 'lucide-react'
import { askAssistant, isAssistantConnected } from '../services/assistantService'

const suggestions = ['Wedding outfit ideas', 'Casual under ₹3000', 'White sneakers']

export default function StyleVerseAssistant() {
  const [open, setOpen] = useState(false)
  const [input, setInput] = useState('')
  const [messages, setMessages] = useState([
    { id: 'welcome', role: 'assistant', text: 'Hi! Ask me about outfits, occasions, colors, or the StyleVerse catalog.' },
  ])
  const [loading, setLoading] = useState(false)
  const endRef = useRef(null)

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading])

  const sendMessage = async (event, suggestedMessage) => {
    event?.preventDefault()
    const text = String(suggestedMessage || input).trim()
    if (loading) return
    if (!text) {
      setMessages((current) => [
        ...current,
        { id: `${Date.now()}-empty`, role: 'assistant', text: 'Please enter a fashion question first.' },
      ])
      return
    }

    setInput('')
    const userMessage = { id: `${Date.now()}-user`, role: 'user', text }
    setMessages((current) => [...current, userMessage])
    setLoading(true)

    try {
      const history = messages.map(({ role, text: messageText }) => ({ role, content: messageText }))
      const reply = await askAssistant(text, history)
      setMessages((current) => [...current, { id: `${Date.now()}-assistant`, role: 'assistant', text: reply }])
    } catch (error) {
      setMessages((current) => [
        ...current,
        { id: `${Date.now()}-error`, role: 'assistant', text: error.message || 'I could not answer that right now. Please try again.' },
      ])
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed bottom-5 right-4 sm:right-6 z-[60]">
      {open && (
        <section
          className="mb-3 w-[min(calc(100vw-2rem),380px)] overflow-hidden rounded-3xl border border-primary/20 bg-white/95 shadow-2xl backdrop-blur-xl dark:bg-[#15121f]/95"
          aria-label="StyleVerse AI Assistant"
        >
          <header className="flex items-center justify-between border-b border-black/5 bg-gradient-to-r from-primary/10 to-secondary/10 px-4 py-3 dark:border-white/10">
            <div className="flex items-center gap-2">
              <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-primary/15 text-primary"><Bot className="h-5 w-5" /></div>
              <div>
                <h2 className="font-semibold">StyleVerse Assistant</h2>
                <p className="text-[11px] text-gray-500 dark:text-gray-400">{isAssistantConnected ? 'Connected assistant' : 'AI Assistant demo · catalog replies'}</p>
              </div>
            </div>
            <button type="button" onClick={() => setOpen(false)} className="rounded-full p-2 hover:bg-black/5 dark:hover:bg-white/10" aria-label="Close assistant">
              <X className="h-4 w-4" />
            </button>
          </header>

          <div className="max-h-[min(55vh,420px)] min-h-[230px] space-y-3 overflow-y-auto p-4" aria-live="polite">
            {messages.map((message) => (
              <div key={message.id} className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <p className={`max-w-[88%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed ${message.role === 'user' ? 'rounded-br-md bg-primary text-white' : 'rounded-bl-md bg-black/5 text-gray-800 dark:bg-white/10 dark:text-gray-100'}`}>
                  {message.text}
                </p>
              </div>
            ))}
            {loading && <div className="flex items-center gap-2 text-xs text-gray-500"><Loader2 className="h-4 w-4 animate-spin text-primary" /> Thinking…</div>}
            <div ref={endRef} />
          </div>

          <div className="flex flex-wrap gap-2 border-t border-black/5 px-4 py-3 dark:border-white/10">
            {suggestions.map((suggestion) => (
              <button key={suggestion} type="button" onClick={(event) => sendMessage(event, suggestion)} disabled={loading} className="rounded-full border border-primary/20 px-2.5 py-1.5 text-xs text-primary hover:bg-primary/10 disabled:opacity-50">
                {suggestion}
              </button>
            ))}
          </div>
          <form onSubmit={sendMessage} className="flex gap-2 border-t border-black/5 p-3 dark:border-white/10">
            <input value={input} onChange={(event) => setInput(event.target.value)} placeholder="Ask a fashion question…" aria-label="Fashion question" className="min-w-0 flex-1 rounded-2xl border border-black/10 bg-transparent px-3 py-2 text-sm outline-none focus:border-primary dark:border-white/15" />
            <button type="submit" disabled={loading || !input.trim()} aria-label="Send fashion question" className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-primary text-white disabled:cursor-not-allowed disabled:opacity-50">
              <Send className="h-4 w-4" />
            </button>
          </form>
        </section>
      )}
      <button type="button" onClick={() => setOpen((current) => !current)} className="ml-auto flex min-h-12 items-center gap-2 rounded-full bg-gradient-to-r from-primary to-secondary px-4 text-sm font-semibold text-white shadow-[0_8px_30px_rgba(255,46,136,.35)] transition-transform hover:scale-105" aria-expanded={open} aria-label={open ? 'Minimize StyleVerse Assistant' : 'Open StyleVerse Assistant'}>
        {open ? <ChevronDown className="h-5 w-5" /> : <Sparkles className="h-5 w-5" />}
        <span className="hidden sm:inline">Style Assistant</span>
      </button>
    </div>
  )
}
