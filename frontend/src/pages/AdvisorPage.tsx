import { useState, useRef, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import ReactMarkdown from 'react-markdown'
import {
  Send, Bot, User, Loader2, CheckCircle2, Clock, AlertCircle,
  ChevronDown, ChevronUp, Sparkles, RefreshCw, Wifi, WifiOff,
} from 'lucide-react'
import { clsx } from 'clsx'
import toast from 'react-hot-toast'
import { createAdvisorWebSocket, advisorApi } from '@/api/client'
import { useStore } from '@/store/useStore'
import type { AgentStatus, ChatMessage, StreamEvent } from '@/types'

// ── Agent Config ──────────────────────────────────────────────────────────────

const AGENTS = [
  { id: 'researcher', label: 'Researcher', color: 'text-blue-400', bg: 'bg-blue-400/10', border: 'border-blue-400/30' },
  { id: 'analyzer',  label: 'Analyzer',   color: 'text-purple-400', bg: 'bg-purple-400/10', border: 'border-purple-400/30' },
  { id: 'executor',  label: 'Executor',   color: 'text-amber-400', bg: 'bg-amber-400/10', border: 'border-amber-400/30' },
  { id: 'planner',   label: 'Planner',    color: 'text-cyan-400', bg: 'bg-cyan-400/10', border: 'border-cyan-400/30' },
  { id: 'critic',    label: 'Critic',     color: 'text-pink-400', bg: 'bg-pink-400/10', border: 'border-pink-400/30' },
]

const QUICK_PROMPTS = [
  'Suggest a SIP portfolio for ₹10K/month',
  'How much can I save on taxes this year?',
  'Best ELSS funds for 80C investment?',
  'Calculate EMI for ₹50L home loan at 8.5%',
  'Should I invest in NPS or PPF?',
  'Review my portfolio allocation',
]

// ── Status Icon ───────────────────────────────────────────────────────────────

function AgentStatusIcon({ status }: { status: AgentStatus }) {
  if (status === 'running') return <Loader2 size={12} className="animate-spin text-current" />
  if (status === 'done')    return <CheckCircle2 size={12} className="text-current" />
  if (status === 'error')   return <AlertCircle size={12} className="text-current" />
  return <Clock size={12} className="text-slate-500" />
}

// ── Agent Status Panel ────────────────────────────────────────────────────────

function AgentPanel({ statuses }: { statuses: Record<string, AgentStatus> }) {
  return (
    <div className="bg-background border border-border rounded-lg p-3">
      <p className="text-slate-400 text-xs font-medium mb-2">Agent Pipeline</p>
      <div className="space-y-1.5">
        {AGENTS.map((agent) => {
          const status = statuses[agent.id] ?? 'waiting'
          return (
            <div key={agent.id} className="flex items-center gap-2">
              <div
                className={clsx(
                  'w-5 h-5 rounded-full border flex items-center justify-center flex-shrink-0',
                  status === 'waiting' ? 'border-border text-slate-500' : `${agent.border} ${agent.color}`
                )}
              >
                <AgentStatusIcon status={status} />
              </div>
              <span className={clsx('text-xs font-medium', status === 'waiting' ? 'text-slate-500' : agent.color)}>
                {agent.label}
              </span>
              <span
                className={clsx(
                  'ml-auto text-xs px-1.5 py-0.5 rounded capitalize',
                  status === 'waiting' && 'text-slate-600 bg-slate-800',
                  status === 'running' && `${agent.bg} ${agent.color}`,
                  status === 'done' && 'text-primary bg-primary/10',
                  status === 'error' && 'text-danger bg-danger/10'
                )}
              >
                {status}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ── Profile Panel ─────────────────────────────────────────────────────────────

function ProfilePanel() {
  const { userProfile, setUserProfile } = useStore()

  return (
    <div className="bg-surface border border-border rounded-xl p-4 space-y-4">
      <h3 className="text-white font-semibold text-sm flex items-center gap-2">
        <User size={16} className="text-primary" />
        Investor Profile
      </h3>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-slate-400 text-xs mb-1 block">Age</label>
          <input
            type="number"
            value={userProfile.age}
            onChange={(e) => setUserProfile({ age: parseInt(e.target.value) || 30 })}
            min={18} max={80}
            className="w-full bg-background border border-border rounded-lg px-3 py-2 text-white text-sm focus:border-primary outline-none transition-colors"
          />
        </div>
        <div>
          <label className="text-slate-400 text-xs mb-1 block">Horizon (yrs)</label>
          <input
            type="number"
            value={userProfile.horizon}
            onChange={(e) => setUserProfile({ horizon: parseInt(e.target.value) || 10 })}
            min={1} max={40}
            className="w-full bg-background border border-border rounded-lg px-3 py-2 text-white text-sm focus:border-primary outline-none transition-colors"
          />
        </div>
      </div>

      <div>
        <label className="text-slate-400 text-xs mb-1 block">Annual Income (₹)</label>
        <input
          type="number"
          value={userProfile.income}
          onChange={(e) => setUserProfile({ income: parseFloat(e.target.value) || 0 })}
          className="w-full bg-background border border-border rounded-lg px-3 py-2 text-white text-sm focus:border-primary outline-none transition-colors"
        />
      </div>

      <div>
        <label className="text-slate-400 text-xs mb-1 block">Risk Appetite</label>
        <div className="flex gap-2">
          {(['low', 'moderate', 'high'] as const).map((r) => (
            <button
              key={r}
              onClick={() => setUserProfile({ risk_appetite: r })}
              className={clsx(
                'flex-1 py-1.5 rounded-lg text-xs font-medium capitalize transition-colors',
                userProfile.risk_appetite === r
                  ? 'bg-primary text-black'
                  : 'bg-background border border-border text-slate-400 hover:border-slate-500'
              )}
            >
              {r}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="text-slate-400 text-xs mb-1 block">Goals</label>
        <div className="flex flex-wrap gap-1.5">
          {['retirement', 'wealth_creation', 'home', 'education', 'emergency'].map((g) => (
            <button
              key={g}
              onClick={() => {
                const current = userProfile.goals
                const updated = current.includes(g) ? current.filter((x) => x !== g) : [...current, g]
                setUserProfile({ goals: updated })
              }}
              className={clsx(
                'px-2 py-1 rounded-full text-xs capitalize transition-colors',
                userProfile.goals.includes(g)
                  ? 'bg-primary/20 text-primary border border-primary/30'
                  : 'bg-background border border-border text-slate-500 hover:border-slate-500'
              )}
            >
              {g.replace('_', ' ')}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="text-slate-400 text-xs mb-1 block">80C Investments (₹)</label>
        <input
          type="number"
          value={userProfile.investments_80c}
          onChange={(e) => setUserProfile({ investments_80c: parseFloat(e.target.value) || 0 })}
          className="w-full bg-background border border-border rounded-lg px-3 py-2 text-white text-sm focus:border-primary outline-none transition-colors"
        />
      </div>
    </div>
  )
}

// ── Chat Message Bubble ───────────────────────────────────────────────────────

function MessageBubble({ msg }: { msg: ChatMessage }) {
  const [expanded, setExpanded] = useState(false)
  const isUser = msg.role === 'user'

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={clsx('flex gap-3', isUser ? 'flex-row-reverse' : 'flex-row')}
    >
      {/* Avatar */}
      <div
        className={clsx(
          'w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 mt-1',
          isUser ? 'bg-primary/20 border border-primary/30' : 'bg-blue-500/20 border border-blue-500/30'
        )}
      >
        {isUser ? <User size={14} className="text-primary" /> : <Bot size={14} className="text-blue-400" />}
      </div>

      {/* Bubble */}
      <div
        className={clsx(
          'max-w-[80%] rounded-2xl px-4 py-3',
          isUser
            ? 'bg-primary text-black rounded-tr-sm'
            : 'bg-surface border border-border text-slate-200 rounded-tl-sm'
        )}
      >
        {msg.isStreaming ? (
          <div className="flex items-center gap-2 text-sm">
            <Loader2 size={14} className="animate-spin text-blue-400" />
            <span className="text-slate-400">Agents working on your query...</span>
          </div>
        ) : isUser ? (
          <p className="text-sm font-medium">{msg.content}</p>
        ) : (
          <div>
            <div className={clsx('text-sm prose prose-invert max-w-none prose-p:my-1 prose-li:my-0', !expanded && 'line-clamp-10')}>
              <ReactMarkdown>{msg.content}</ReactMarkdown>
            </div>
            {msg.content.length > 500 && (
              <button
                onClick={() => setExpanded(!expanded)}
                className="mt-2 text-xs text-primary flex items-center gap-1 hover:underline"
              >
                {expanded ? <><ChevronUp size={12} /> Show less</> : <><ChevronDown size={12} /> Read more</>}
              </button>
            )}
          </div>
        )}
        <p className={clsx('text-xs mt-1.5', isUser ? 'text-black/60 text-right' : 'text-slate-500')}>
          {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </p>
      </div>
    </motion.div>
  )
}

// ── Main Advisor Page ─────────────────────────────────────────────────────────

export default function AdvisorPage() {
  const { userProfile, pdfPaths, chatMessages, addChatMessage, updateLastAssistantMessage, clearChat } = useStore()
  const [input, setInput] = useState('')
  const [isStreaming, setIsStreaming] = useState(false)
  const [agentStatuses, setAgentStatuses] = useState<Record<string, AgentStatus>>({})
  const [wsConnected, setWsConnected] = useState<boolean | null>(null) // null=unknown
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const wsRef = useRef<WebSocket | null>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [chatMessages])

  // ── HTTP fallback (when WebSocket isn't available) ──────────────────────────
  const sendViaHttp = useCallback(
    async (query: string) => {
      setIsStreaming(true)
      // Mark all agents as running sequentially via fake progress
      const fakeProgress = ['researcher', 'analyzer', 'executor', 'planner', 'critic']
      for (const agent of fakeProgress) {
        setAgentStatuses((prev) => ({ ...prev, [agent]: 'running' }))
        await new Promise((r) => setTimeout(r, 400))
        setAgentStatuses((prev) => ({ ...prev, [agent]: 'done' }))
      }

      try {
        const resp = await advisorApi.query({ query, user_profile: userProfile, uploaded_pdfs: pdfPaths })
        const content =
          resp.final_advice ||
          resp.plan_output ||
          resp.summary ||
          'Analysis complete.'
        const disclaimer = resp.disclaimer ? `\n\n---\n\n*${resp.disclaimer}*` : ''
        updateLastAssistantMessage({ content: content + disclaimer, isStreaming: false })
      } catch (err: any) {
        updateLastAssistantMessage({
          content: `**Error:** ${err?.message ?? 'Something went wrong. Please check that the backend is running.'}`,
          isStreaming: false,
        })
        AGENTS.forEach((a) => setAgentStatuses((prev) => ({ ...prev, [a.id]: 'error' })))
        toast.error('Advisor error — check backend connection')
      } finally {
        setIsStreaming(false)
      }
    },
    [userProfile, pdfPaths, updateLastAssistantMessage]
  )

  // ── WebSocket send ──────────────────────────────────────────────────────────
  const sendViaWebSocket = useCallback(
    (query: string) => {
      if (wsRef.current) wsRef.current.close()

      const ws = createAdvisorWebSocket(
        (event: StreamEvent) => {
          if (event.error) {
            updateLastAssistantMessage({ content: `**Error:** ${event.error}`, isStreaming: false })
            AGENTS.forEach((a) => setAgentStatuses((prev) => ({ ...prev, [a.id]: 'error' })))
            setIsStreaming(false)
            toast.error('Advisor error: ' + event.error)
            return
          }

          if (event.agent === '__final__' && event.state) {
            const state = event.state
            const content =
              state.final_advice || state.plan_output || state.summary || 'Analysis complete.'
            const disclaimer = state.disclaimer ? `\n\n---\n\n*${state.disclaimer}*` : ''
            updateLastAssistantMessage({ content: content + disclaimer, isStreaming: false })
            setAgentStatuses((prev) => {
              const u = { ...prev }
              AGENTS.forEach((a) => { if (u[a.id] === 'running') u[a.id] = 'done' })
              return u
            })
            setIsStreaming(false)
          } else if (!event.done) {
            setAgentStatuses((prev) => ({ ...prev, [event.agent]: 'running' }))
            const idx = AGENTS.findIndex((a) => a.id === event.agent)
            if (idx > 0) {
              setAgentStatuses((prev) => {
                const u = { ...prev }
                for (let i = 0; i < idx; i++) {
                  if (u[AGENTS[i].id] !== 'error') u[AGENTS[i].id] = 'done'
                }
                return u
              })
            }
            if (event.output) {
              updateLastAssistantMessage({
                content: `**${AGENTS.find((a) => a.id === event.agent)?.label ?? event.agent} is working...**\n\n${event.output}`,
              })
            }
          }
        },
        (_err) => {
          // WS connection error — fall back to HTTP
          setWsConnected(false)
          sendViaHttp(query)
        },
        () => {
          setIsStreaming(false)
        }
      )

      ws.onopen = () => {
        setWsConnected(true)
        ws.send(JSON.stringify({ query, user_profile: userProfile, uploaded_pdfs: pdfPaths }))
      }

      // If ws fails to open within 3s, fall back to HTTP
      const timeout = setTimeout(() => {
        if (ws.readyState !== WebSocket.OPEN) {
          ws.close()
          setWsConnected(false)
          sendViaHttp(query)
        }
      }, 3000)

      ws.addEventListener('open', () => clearTimeout(timeout))
      wsRef.current = ws
    },
    [userProfile, pdfPaths, updateLastAssistantMessage, sendViaHttp]
  )

  const sendMessage = useCallback(
    (query: string) => {
      if (!query.trim() || isStreaming) return

      addChatMessage({ id: Date.now().toString(), role: 'user', content: query.trim(), timestamp: new Date() })
      addChatMessage({ id: (Date.now() + 1).toString(), role: 'assistant', content: '', timestamp: new Date(), isStreaming: true })
      setInput('')
      setIsStreaming(true)
      setAgentStatuses({})

      // Resize textarea back
      if (textareaRef.current) textareaRef.current.style.height = 'auto'

      // Try WebSocket first; it auto-falls back to HTTP on connection failure
      sendViaWebSocket(query.trim())
    },
    [isStreaming, addChatMessage, sendViaWebSocket]
  )

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage(input)
    }
  }

  const handleTextareaInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value)
    const ta = textareaRef.current
    if (ta) {
      ta.style.height = 'auto'
      ta.style.height = Math.min(ta.scrollHeight, 120) + 'px'
    }
  }

  return (
    <div className="flex gap-4 h-[calc(100vh-7rem)]">
      {/* Left Panel — Profile + Agent Status (hidden on mobile) */}
      <div className="hidden lg:flex w-72 flex-shrink-0 flex-col space-y-4 overflow-y-auto">
        <ProfilePanel />
        <AgentPanel statuses={agentStatuses} />
      </div>

      {/* Right Panel — Chat Interface */}
      <div className="flex-1 flex flex-col bg-surface border border-border rounded-xl overflow-hidden min-w-0">
        {/* Chat Header */}
        <div className="px-4 py-3 border-b border-border flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-blue-500/20 border border-blue-500/30 flex items-center justify-center">
              <Bot size={16} className="text-blue-400" />
            </div>
            <div>
              <p className="text-white font-medium text-sm">FinanceAI Advisor</p>
              <p className="text-slate-500 text-xs flex items-center gap-1">
                <span className="w-1.5 h-1.5 bg-primary rounded-full inline-block animate-pulse" />
                5-Agent Pipeline Active
                {wsConnected === true && (
                  <span className="flex items-center gap-0.5 text-green-400 ml-1">
                    <Wifi size={10} /> Live
                  </span>
                )}
                {wsConnected === false && (
                  <span className="flex items-center gap-0.5 text-amber-400 ml-1">
                    <WifiOff size={10} /> HTTP mode
                  </span>
                )}
              </p>
            </div>
          </div>
          <button
            onClick={clearChat}
            className="text-slate-500 hover:text-white transition-colors p-1.5 rounded-lg hover:bg-surface-2"
            title="Clear chat"
          >
            <RefreshCw size={14} />
          </button>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {chatMessages.length === 0 && (
            <div className="flex flex-col items-center justify-center h-full text-center px-8">
              <div className="w-16 h-16 rounded-2xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center mb-4">
                <Sparkles size={28} className="text-blue-400" />
              </div>
              <h3 className="text-white font-semibold text-lg mb-2">Ask Your Finance Advisor</h3>
              <p className="text-slate-400 text-sm mb-6 max-w-sm">
                Get personalized investment advice powered by a 5-agent AI pipeline — Researcher, Analyzer, Executor, Planner, and Critic.
              </p>
              <div className="flex flex-wrap gap-2 justify-center">
                {QUICK_PROMPTS.slice(0, 4).map((p) => (
                  <button
                    key={p}
                    onClick={() => sendMessage(p)}
                    disabled={isStreaming}
                    className="px-3 py-1.5 bg-background border border-border rounded-full text-xs text-slate-300 hover:border-primary hover:text-primary transition-colors disabled:opacity-50"
                  >
                    {p}
                  </button>
                ))}
              </div>
            </div>
          )}

          <AnimatePresence initial={false}>
            {chatMessages.map((msg) => (
              <MessageBubble key={msg.id} msg={msg} />
            ))}
          </AnimatePresence>
          <div ref={messagesEndRef} />
        </div>

        {/* Quick prompts */}
        {chatMessages.length > 0 && (
          <div className="px-4 py-2 border-t border-border flex gap-2 overflow-x-auto scrollbar-none flex-shrink-0">
            {QUICK_PROMPTS.map((p) => (
              <button
                key={p}
                onClick={() => sendMessage(p)}
                disabled={isStreaming}
                className="px-3 py-1.5 bg-background border border-border rounded-full text-xs text-slate-400 hover:border-primary hover:text-primary transition-colors whitespace-nowrap disabled:opacity-50"
              >
                {p}
              </button>
            ))}
          </div>
        )}

        {/* Mobile agent status (above input) */}
        <div className="lg:hidden px-4 pb-2 flex-shrink-0">
          <div className="flex gap-1 overflow-x-auto scrollbar-none">
            {AGENTS.map((agent) => {
              const status = agentStatuses[agent.id] ?? 'waiting'
              return (
                <div
                  key={agent.id}
                  className={clsx(
                    'flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium flex-shrink-0',
                    status === 'waiting' && 'bg-slate-800 text-slate-500',
                    status === 'running' && `${agent.bg} ${agent.color}`,
                    status === 'done' && 'bg-primary/10 text-primary',
                    status === 'error' && 'bg-danger/10 text-danger',
                  )}
                >
                  <AgentStatusIcon status={status} />
                  {agent.label}
                </div>
              )
            })}
          </div>
        </div>

        {/* Input area */}
        <div className="px-4 py-3 border-t border-border flex-shrink-0">
          <div className="flex items-end gap-3">
            <div className="flex-1 bg-background border border-border rounded-xl px-4 py-2.5 focus-within:border-primary transition-colors">
              <textarea
                ref={textareaRef}
                value={input}
                onChange={handleTextareaInput}
                onKeyDown={handleKeyDown}
                placeholder="Ask about investments, taxes, SIP planning..."
                disabled={isStreaming}
                rows={1}
                className="w-full bg-transparent text-white text-sm placeholder-slate-500 outline-none resize-none leading-relaxed"
                style={{ maxHeight: 120 }}
              />
            </div>
            <button
              onClick={() => sendMessage(input)}
              disabled={!input.trim() || isStreaming}
              className={clsx(
                'w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 transition-all',
                input.trim() && !isStreaming
                  ? 'bg-primary hover:bg-primary/90 text-black'
                  : 'bg-surface-2 text-slate-600 cursor-not-allowed'
              )}
            >
              {isStreaming ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
            </button>
          </div>
          <p className="text-slate-600 text-xs mt-2 text-center">
            Enter to send · Shift+Enter for new line · For informational purposes only
          </p>
        </div>
      </div>
    </div>
  )
}
