'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { Upload, FileText, X, Check, AlertCircle, ArrowLeft, LogOut } from 'lucide-react'

interface UploadPreview {
  fileName: string
  totalRows: number
  validRows: number
  invalidRows: number
  errors: string[]
  words: Array<{
    word: string
    definition: string
    example: string
    valid: boolean
    error?: string
  }>
}

export default function AdminUpload() {
  const [file, setFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<UploadPreview | null>(null)
  const [uploading, setUploading] = useState(false)
  const [uploadSuccess, setUploadSuccess] = useState(false)
  const [error, setError] = useState('')
  const [dragActive, setDragActive] = useState(false)
  const [listTitle, setListTitle] = useState('')
  const [listTheme, setListTheme] = useState('')
  const [extendExisting, setExtendExisting] = useState(false)
  const [existingListId, setExistingListId] = useState('')
  const [existingLists, setExistingLists] = useState<any[]>([])
  const fileInputRef = useRef<HTMLInputElement>(null)
  const router = useRouter()

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true)
    } else if (e.type === 'dragleave') {
      setDragActive(false)
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)

    const files = e.dataTransfer.files
    if (files && files[0]) {
      handleFileSelect(files[0])
    }
  }

  const handleFileSelect = async (selectedFile: File) => {
    setFile(selectedFile)
    setError('')
    setPreview(null)
    setUploadSuccess(false)

    // Check file type
    if (!selectedFile.name.endsWith('.xlsx') && !selectedFile.name.endsWith('.xls')) {
      setError('Alleen Excel bestanden (.xlsx, .xls) zijn toegestaan')
      return
    }

    // Preview the file content
    try {
      const formData = new FormData()
      formData.append('excel', selectedFile)
      formData.append('preview', 'true')

      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/admin/upload-excel`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: formData
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Preview failed')
      }

      setPreview(data.preview)
    } catch (err: any) {
      setError(err.message || 'Preview mislukt')
    }
  }

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (files && files[0]) {
      handleFileSelect(files[0])
    }
  }

  const handleUpload = async () => {
    if (!file) return

    if (!extendExisting && !listTitle.trim()) {
      setError('Lijst titel is verplicht voor nieuwe lijsten')
      return
    }

    if (extendExisting && !existingListId) {
      setError('Selecteer een bestaande lijst om uit te breiden')
      return
    }

    setUploading(true)
    setError('')

    try {
      const formData = new FormData()
      formData.append('excel', file)

      if (extendExisting) {
        formData.append('listId', existingListId)
      } else {
        formData.append('title', listTitle)
        if (listTheme) {
          formData.append('theme', listTheme)
        }
      }

      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/admin/upload-excel`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: formData
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Upload mislukt')
      }

      setUploadSuccess(true)
      setFile(null)
      setPreview(null)
      setListTitle('')
      setListTheme('')

      setTimeout(() => {
        router.push('/admin/dashboard')
      }, 2000)
    } catch (err: any) {
      setError(err.message || 'Upload mislukt')
    } finally {
      setUploading(false)
    }
  }

  const fetchExistingLists = async () => {
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/admin/word-lists`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      })

      if (response.ok) {
        const data = await response.json()
        setExistingLists(data.wordLists)
      }
    } catch (error) {
      console.error('Failed to fetch existing lists:', error)
    }
  }

  const handleExtendExistingChange = (extend: boolean) => {
    setExtendExisting(extend)
    if (extend && existingLists.length === 0) {
      fetchExistingLists()
    }
  }

  const handleLogout = () => {
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    router.push('/admin')
  }

  return (
    <div className="min-h-screen p-4">
      <div className="max-w-4xl mx-auto">
        <header className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.push('/admin/dashboard')}
              className="retro-button-small flex items-center gap-2"
            >
              <ArrowLeft size={16} />
              TERUG
            </button>
            <h1 className="text-4xl font-bold">EXCEL UPLOAD</h1>
          </div>
          <button
            onClick={handleLogout}
            className="retro-button flex items-center gap-2"
          >
            <LogOut size={16} />
            UITLOGGEN
          </button>
        </header>

        {uploadSuccess ? (
          <div className="retro-border p-6 text-center">
            <Check size={48} className="mx-auto mb-4 text-green-500" />
            <h2 className="text-2xl font-bold mb-2">UPLOAD GELUKT!</h2>
            <p className="mb-4">Je Excel bestand is succesvol verwerkt.</p>
            <p className="text-sm opacity-75">Je wordt doorgestuurd naar het dashboard...</p>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Upload Type Selection */}
            <div className="retro-border p-6">
              <h2 className="text-2xl font-bold mb-4">Upload Type</h2>
              <div className="space-y-4">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="radio"
                    name="uploadType"
                    checked={!extendExisting}
                    onChange={() => handleExtendExistingChange(false)}
                    className="w-4 h-4"
                  />
                  <span className="font-mono">NIEUWE LIJST MAKEN</span>
                </label>
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="radio"
                    name="uploadType"
                    checked={extendExisting}
                    onChange={() => handleExtendExistingChange(true)}
                    className="w-4 h-4"
                  />
                  <span className="font-mono">BESTAANDE LIJST UITBREIDEN</span>
                </label>
              </div>
            </div>

            {/* List Configuration */}
            <div className="retro-border p-6">
              <h2 className="text-2xl font-bold mb-4">Lijst Configuratie</h2>

              {extendExisting ? (
                <div>
                  <label className="block text-sm font-bold mb-2">BESTAANDE LIJST</label>
                  <select
                    value={existingListId}
                    onChange={(e) => setExistingListId(e.target.value)}
                    className="retro-input w-full p-3"
                    required
                  >
                    <option value="">Selecteer een lijst...</option>
                    {existingLists.map((list) => (
                      <option key={list.id} value={list.id}>
                        {list.title} ({list.total_words} woorden)
                      </option>
                    ))}
                  </select>
                </div>
              ) : (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-bold mb-2">LIJST TITEL *</label>
                    <input
                      type="text"
                      value={listTitle}
                      onChange={(e) => setListTitle(e.target.value)}
                      className="retro-input w-full p-3"
                      placeholder="Bijv. Wiskunde Termen"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-bold mb-2">THEMA (optioneel)</label>
                    <input
                      type="text"
                      value={listTheme}
                      onChange={(e) => setListTheme(e.target.value)}
                      className="retro-input w-full p-3"
                      placeholder="Bijv. Wiskunde, Geschiedenis, etc."
                    />
                  </div>
                </div>
              )}
            </div>

            {/* File Upload */}
            <div className="retro-border p-6">
              <h2 className="text-2xl font-bold mb-4">Excel Bestand</h2>

              <div
                className={`border-2 border-dashed p-8 text-center transition-colors ${
                  dragActive ? 'border-white bg-gray-900' : 'border-gray-600'
                }`}
                onDragEnter={handleDrag}
                onDragLeave={handleDrag}
                onDragOver={handleDrag}
                onDrop={handleDrop}
              >
                {file ? (
                  <div className="space-y-4">
                    <FileText size={48} className="mx-auto text-green-500" />
                    <div>
                      <p className="font-bold">{file.name}</p>
                      <p className="text-sm opacity-75">
                        {(file.size / 1024 / 1024).toFixed(2)} MB
                      </p>
                    </div>
                    <button
                      onClick={() => {
                        setFile(null)
                        setPreview(null)
                        setError('')
                      }}
                      className="retro-button-small bg-red-600 hover:bg-red-700 flex items-center gap-2 mx-auto"
                    >
                      <X size={12} />
                      VERWIJDER
                    </button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <Upload size={48} className="mx-auto opacity-50" />
                    <div>
                      <p className="font-bold mb-2">Sleep je Excel bestand hier</p>
                      <p className="text-sm opacity-75 mb-4">of klik om te selecteren</p>
                      <button
                        onClick={() => fileInputRef.current?.click()}
                        className="retro-button"
                      >
                        BESTAND SELECTEREN
                      </button>
                    </div>
                  </div>
                )}
              </div>

              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx,.xls"
                onChange={handleFileInputChange}
                className="hidden"
              />

              <div className="mt-4 text-sm opacity-75">
                <p className="font-bold mb-2">Excel Format:</p>
                <ul className="space-y-1">
                  <li>• Kolom A: Woord</li>
                  <li>• Kolom B: Definitie</li>
                  <li>• Kolom C: Voorbeeldzin (woord tussen *asterisks*)</li>
                </ul>
              </div>
            </div>

            {/* Preview */}
            {preview && (
              <div className="retro-border p-6">
                <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
                  <FileText size={24} />
                  Voorvertoning
                </h2>

                <div className="mb-4 grid grid-cols-3 gap-4 text-center">
                  <div>
                    <div className="text-2xl font-bold">{preview.totalRows}</div>
                    <div className="text-sm opacity-75">Totaal rijen</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-green-500">{preview.validRows}</div>
                    <div className="text-sm opacity-75">Geldig</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-red-500">{preview.invalidRows}</div>
                    <div className="text-sm opacity-75">Ongeldig</div>
                  </div>
                </div>

                {preview.errors.length > 0 && (
                  <div className="mb-4 p-4 bg-red-900 border border-red-600 rounded">
                    <h3 className="font-bold mb-2 flex items-center gap-2">
                      <AlertCircle size={16} />
                      Fouten gevonden:
                    </h3>
                    <ul className="text-sm space-y-1">
                      {preview.errors.map((error, index) => (
                        <li key={index}>• {error}</li>
                      ))}
                    </ul>
                  </div>
                )}

                <div className="max-h-96 overflow-y-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-white">
                        <th className="text-left p-2">STATUS</th>
                        <th className="text-left p-2">WOORD</th>
                        <th className="text-left p-2">DEFINITIE</th>
                        <th className="text-left p-2">VOORBEELD</th>
                      </tr>
                    </thead>
                    <tbody>
                      {preview.words.slice(0, 10).map((word, index) => (
                        <tr key={index} className="border-b border-gray-600">
                          <td className="p-2">
                            {word.valid ? (
                              <Check size={16} className="text-green-500" />
                            ) : (
                              <X size={16} className="text-red-500" />
                            )}
                          </td>
                          <td className="p-2 font-bold">{word.word}</td>
                          <td className="p-2">{word.definition}</td>
                          <td className="p-2">{word.example}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {preview.words.length > 10 && (
                    <p className="text-center py-2 text-sm opacity-75">
                      ... en {preview.words.length - 10} meer rijen
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* Error Display */}
            {error && (
              <div className="retro-border p-4 bg-red-900 border-red-600">
                <div className="flex items-center gap-2">
                  <AlertCircle size={16} />
                  <span className="font-bold">Fout:</span>
                  <span>{error}</span>
                </div>
              </div>
            )}

            {/* Upload Button */}
            {file && preview && preview.validRows > 0 && (
              <div className="text-center">
                <button
                  onClick={handleUpload}
                  disabled={uploading}
                  className="retro-button text-lg px-8 py-4"
                >
                  {uploading ? 'UPLOADEN...' : `${preview.validRows} WOORDEN UPLOADEN`}
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}