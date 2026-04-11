import { useState, useCallback } from 'react'
import { useDropzone } from 'react-dropzone'
import {
  Upload, FileText, Trash2, CheckCircle2, AlertCircle,
  Loader2, Database, ChevronRight, Info,
} from 'lucide-react'
import { clsx } from 'clsx'
import { motion, AnimatePresence } from 'framer-motion'
import toast from 'react-hot-toast'
import { documentsApi } from '@/api/client'
import { useStore } from '@/store/useStore'
import type { UploadedFile } from '@/types'

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export default function DocumentsPage() {
  const { uploadedFiles, addUploadedFile, removeUploadedFile, setIsIngested, isIngested } = useStore()
  const [ingesting, setIngesting] = useState(false)
  const [progress, setProgress] = useState(0)
  const [ingestStats, setIngestStats] = useState<{ chunks: number; namespaces: string[] } | null>(null)

  const onDrop = useCallback(
    async (acceptedFiles: File[]) => {
      for (const file of acceptedFiles) {
        const tmpFile: UploadedFile = {
          name: file.name,
          path: '',
          size: file.size,
          status: 'uploaded',
        }
        addUploadedFile(tmpFile)

        try {
          const res = await documentsApi.upload(file)
          addUploadedFile({
            name: file.name,
            path: res.path,
            size: file.size,
            status: 'uploaded',
          })
          toast.success(`${file.name} uploaded`)
        } catch (e: unknown) {
          addUploadedFile({
            name: file.name,
            path: '',
            size: file.size,
            status: 'error',
          })
          toast.error(`Failed to upload ${file.name}`)
        }
      }
    },
    [addUploadedFile]
  )

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'application/pdf': ['.pdf'] },
    multiple: true,
  })

  const handleIngest = async () => {
    const paths = uploadedFiles.filter((f) => f.path && f.status !== 'error').map((f) => f.path)
    if (paths.length === 0) {
      toast.error('No valid PDFs to process')
      return
    }

    setIngesting(true)
    setProgress(0)

    // Simulate progress
    const interval = setInterval(() => {
      setProgress((p) => Math.min(p + Math.random() * 15, 90))
    }, 400)

    try {
      const res = await documentsApi.ingest(paths)
      clearInterval(interval)
      setProgress(100)
      setIngestStats({ chunks: res.chunks_indexed, namespaces: res.namespaces })
      setIsIngested(true)

      // Mark all as indexed
      paths.forEach((path) => {
        const file = uploadedFiles.find((f) => f.path === path)
        if (file) {
          addUploadedFile({ ...file, status: 'indexed' })
        }
      })

      toast.success(`Indexed ${res.chunks_indexed} chunks from ${paths.length} document(s)!`)
    } catch (e: unknown) {
      clearInterval(interval)
      toast.error(e instanceof Error ? e.message : 'Ingestion failed')
    } finally {
      setIngesting(false)
    }
  }

  const statusIcon = (status: UploadedFile['status']) => {
    if (status === 'uploaded') return <FileText size={14} className="text-blue-400" />
    if (status === 'processing') return <Loader2 size={14} className="text-amber-400 animate-spin" />
    if (status === 'indexed') return <CheckCircle2 size={14} className="text-primary" />
    if (status === 'error') return <AlertCircle size={14} className="text-danger" />
    return null
  }

  const statusLabel = (status: UploadedFile['status']) => {
    const map = { uploaded: 'Uploaded', processing: 'Processing', indexed: 'Indexed', error: 'Error' }
    return map[status] ?? status
  }

  return (
    <div className="max-w-4xl space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-white font-semibold text-lg">Document Intelligence</h2>
        <p className="text-slate-400 text-sm mt-0.5">
          Upload your bank statements, mutual fund portfolio PDFs, or any financial document. The AI will analyze and reference them when answering your questions.
        </p>
      </div>

      {/* Info Banner */}
      <div className="flex items-start gap-3 bg-blue-500/10 border border-blue-500/20 rounded-xl p-4">
        <Info size={16} className="text-blue-400 flex-shrink-0 mt-0.5" />
        <div>
          <p className="text-blue-400 font-medium text-sm">How it works</p>
          <p className="text-slate-400 text-xs mt-1">
            PDFs are extracted, chunked, and embedded into a vector store (Pinecone). The AI Advisor then does hybrid semantic search across your documents when you ask questions — giving personalized, document-aware advice.
          </p>
        </div>
      </div>

      {/* Drop Zone */}
      <div
        {...getRootProps()}
        className={clsx(
          'border-2 border-dashed rounded-2xl p-6 sm:p-10 text-center cursor-pointer transition-all',
          isDragActive
            ? 'border-primary bg-primary/5'
            : 'border-border hover:border-slate-500 hover:bg-surface/50'
        )}
      >
        <input {...getInputProps()} />
        <div className="flex flex-col items-center gap-3">
          <div
            className={clsx(
              'w-16 h-16 rounded-2xl flex items-center justify-center transition-colors',
              isDragActive ? 'bg-primary/20 border border-primary/30' : 'bg-surface border border-border'
            )}
          >
            <Upload size={28} className={isDragActive ? 'text-primary' : 'text-slate-500'} />
          </div>
          {isDragActive ? (
            <p className="text-primary font-medium">Drop your PDFs here!</p>
          ) : (
            <>
              <p className="text-white font-medium">Drag & drop PDF files here</p>
              <p className="text-slate-400 text-sm">or click to browse files</p>
            </>
          )}
          <p className="text-slate-500 text-xs">Supported: Bank statements, MF portfolios, salary slips, investment reports</p>
        </div>
      </div>

      {/* Uploaded Files List */}
      <AnimatePresence>
        {uploadedFiles.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-surface border border-border rounded-xl overflow-hidden"
          >
            <div className="px-5 py-3 border-b border-border flex items-center justify-between">
              <p className="text-white font-medium text-sm">{uploadedFiles.length} File(s)</p>
              <p className="text-slate-400 text-xs">
                {uploadedFiles.filter((f) => f.status === 'indexed').length} indexed
              </p>
            </div>
            <div className="divide-y divide-border">
              {uploadedFiles.map((file, i) => (
                <motion.div
                  key={file.name}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.05 }}
                  exit={{ opacity: 0, x: 10 }}
                  className="flex items-center gap-4 px-5 py-3 hover:bg-surface-2 transition-colors"
                >
                  <div className="w-8 h-8 rounded-lg bg-background border border-border flex items-center justify-center flex-shrink-0">
                    {statusIcon(file.status)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-white text-sm font-medium truncate">{file.name}</p>
                    <p className="text-slate-500 text-xs">{formatBytes(file.size)}</p>
                  </div>
                  <span
                    className={clsx(
                      'text-xs px-2 py-0.5 rounded-full font-medium',
                      file.status === 'uploaded' && 'text-blue-400 bg-blue-400/10',
                      file.status === 'processing' && 'text-amber-400 bg-amber-400/10',
                      file.status === 'indexed' && 'text-primary bg-primary/10',
                      file.status === 'error' && 'text-danger bg-danger/10'
                    )}
                  >
                    {statusLabel(file.status)}
                  </span>
                  <button
                    onClick={() => removeUploadedFile(file.name)}
                    className="text-slate-500 hover:text-danger transition-colors p-1"
                  >
                    <Trash2 size={14} />
                  </button>
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Progress Bar */}
      <AnimatePresence>
        {ingesting && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="bg-surface border border-border rounded-xl p-4"
          >
            <div className="flex items-center justify-between mb-2">
              <p className="text-white text-sm font-medium flex items-center gap-2">
                <Loader2 size={14} className="animate-spin text-primary" />
                Processing Documents...
              </p>
              <span className="text-primary text-sm font-mono">{Math.round(progress)}%</span>
            </div>
            <div className="w-full bg-background rounded-full h-2">
              <motion.div
                className="bg-primary h-2 rounded-full"
                animate={{ width: `${progress}%` }}
                transition={{ duration: 0.3 }}
              />
            </div>
            <p className="text-slate-400 text-xs mt-2">
              Extracting text → Chunking → Embedding → Indexing to Pinecone...
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Process Button */}
      {uploadedFiles.length > 0 && !ingesting && (
        <div className="flex items-center gap-4">
          <button
            onClick={handleIngest}
            disabled={ingesting || uploadedFiles.every((f) => f.status === 'indexed')}
            className="flex items-center gap-2 bg-primary hover:bg-primary-dark disabled:bg-surface disabled:text-slate-500 text-black font-semibold px-6 py-2.5 rounded-xl transition-all"
          >
            <Database size={16} />
            Process & Index Documents
            <ChevronRight size={14} />
          </button>

          {isIngested && (
            <span className="flex items-center gap-1.5 text-primary text-sm">
              <CheckCircle2 size={16} />
              Documents ready for AI queries
            </span>
          )}
        </div>
      )}

      {/* Ingest Stats */}
      <AnimatePresence>
        {ingestStats && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4"
          >
            <div className="bg-primary/10 border border-primary/20 rounded-xl p-4">
              <p className="text-primary text-xs font-medium uppercase tracking-wider">Chunks Indexed</p>
              <p className="text-white text-2xl font-bold mt-1">{ingestStats.chunks.toLocaleString()}</p>
            </div>
            <div className="bg-surface border border-border rounded-xl p-4">
              <p className="text-slate-400 text-xs font-medium uppercase tracking-wider">Namespaces</p>
              <p className="text-white text-2xl font-bold mt-1">{ingestStats.namespaces.length}</p>
              <p className="text-slate-500 text-xs mt-1 truncate">{ingestStats.namespaces.join(', ')}</p>
            </div>
            <div className="bg-surface border border-border rounded-xl p-4">
              <p className="text-slate-400 text-xs font-medium uppercase tracking-wider">Status</p>
              <p className="text-primary font-bold text-sm mt-2 flex items-center gap-1.5">
                <CheckCircle2 size={16} /> Ready for queries
              </p>
              <p className="text-slate-500 text-xs mt-1">Go to AI Advisor to ask questions</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
