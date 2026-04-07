import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { UserProfile, AdvisorResponse, UploadedFile, ChatMessage } from '@/types'

interface FinanceStore {
  // User profile
  userProfile: UserProfile
  setUserProfile: (profile: Partial<UserProfile>) => void

  // Document ingestion state
  isIngested: boolean
  setIsIngested: (v: boolean) => void
  pdfPaths: string[]
  setPdfPaths: (paths: string[]) => void
  uploadedFiles: UploadedFile[]
  setUploadedFiles: (files: UploadedFile[]) => void
  addUploadedFile: (file: UploadedFile) => void
  removeUploadedFile: (name: string) => void

  // Advisor state
  currentAdvice: AdvisorResponse | null
  setCurrentAdvice: (advice: AdvisorResponse | null) => void

  // Chat history
  chatMessages: ChatMessage[]
  addChatMessage: (msg: ChatMessage) => void
  updateLastAssistantMessage: (update: Partial<ChatMessage>) => void
  clearChat: () => void

  // Sidebar state
  sidebarExpanded: boolean
  toggleSidebar: () => void
}

export const useStore = create<FinanceStore>()(
  persist(
    (set, get) => ({
      // ── User Profile ────────────────────────────────────────────────────────
      userProfile: {
        age: 30,
        income: 1200000,
        risk_appetite: 'moderate',
        goals: ['retirement', 'wealth_creation'],
        horizon: 10,
        investments_80c: 0,
      },
      setUserProfile: (profile) =>
        set((state) => ({ userProfile: { ...state.userProfile, ...profile } })),

      // ── Documents ───────────────────────────────────────────────────────────
      isIngested: false,
      setIsIngested: (v) => set({ isIngested: v }),
      pdfPaths: [],
      setPdfPaths: (paths) => set({ pdfPaths: paths }),
      uploadedFiles: [],
      setUploadedFiles: (files) => set({ uploadedFiles: files }),
      addUploadedFile: (file) =>
        set((state) => ({
          uploadedFiles: [...state.uploadedFiles.filter((f) => f.name !== file.name), file],
          pdfPaths: [
            ...state.pdfPaths.filter((p) => !p.includes(file.name)),
            file.path,
          ],
        })),
      removeUploadedFile: (name) =>
        set((state) => ({
          uploadedFiles: state.uploadedFiles.filter((f) => f.name !== name),
          pdfPaths: state.pdfPaths.filter((p) => !p.includes(name)),
        })),

      // ── Advisor ─────────────────────────────────────────────────────────────
      currentAdvice: null,
      setCurrentAdvice: (advice) => set({ currentAdvice: advice }),

      // ── Chat ─────────────────────────────────────────────────────────────────
      chatMessages: [],
      addChatMessage: (msg) =>
        set((state) => ({ chatMessages: [...state.chatMessages, msg] })),
      updateLastAssistantMessage: (update) =>
        set((state) => {
          const msgs = [...state.chatMessages]
          // Find last assistant message
          for (let i = msgs.length - 1; i >= 0; i--) {
            if (msgs[i].role === 'assistant') {
              msgs[i] = { ...msgs[i], ...update }
              break
            }
          }
          return { chatMessages: msgs }
        }),
      clearChat: () => set({ chatMessages: [] }),

      // ── Sidebar ──────────────────────────────────────────────────────────────
      sidebarExpanded: true,
      toggleSidebar: () =>
        set((state) => ({ sidebarExpanded: !state.sidebarExpanded })),
    }),
    {
      name: 'finance-advisor-store',
      partialize: (state) => ({
        userProfile: state.userProfile,
        sidebarExpanded: state.sidebarExpanded,
        pdfPaths: state.pdfPaths,
        uploadedFiles: state.uploadedFiles,
        isIngested: state.isIngested,
      }),
    }
  )
)
