'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { ArrowLeft, Plus, Edit2, Trash2, Save, X, Search, LogOut } from 'lucide-react'

interface Word {
  id: string
  word: string
  definition: string
  example: string
  is_active: boolean
}

interface WordList {
  id: string
  title: string
  theme: string | null
  total_words: number
  active_words: number
  created_at: string
  updated_at: string
}

interface EditingWord {
  id: string
  word: string
  definition: string
  example: string
  is_active: boolean
}

export default function WordListManagement() {
  const [wordList, setWordList] = useState<WordList | null>(null)
  const [words, setWords] = useState<Word[]>([])
  const [filteredWords, setFilteredWords] = useState<Word[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [editingWord, setEditingWord] = useState<EditingWord | null>(null)
  const [showAddForm, setShowAddForm] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null)
  const [newWord, setNewWord] = useState({ word: '', definition: '', example: '' })
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  const router = useRouter()
  const params = useParams()
  const listId = params.id as string

  useEffect(() => {
    const userData = localStorage.getItem('user')
    if (!userData) {
      router.push('/admin')
      return
    }

    const parsedUser = JSON.parse(userData)
    if (parsedUser.role !== 'administrator') {
      router.push('/admin')
      return
    }

    fetchWordList()
    fetchWords()
  }, [router, listId])

  useEffect(() => {
    if (searchTerm) {
      const filtered = words.filter(word =>
        word.word.toLowerCase().includes(searchTerm.toLowerCase()) ||
        word.definition.toLowerCase().includes(searchTerm.toLowerCase()) ||
        word.example.toLowerCase().includes(searchTerm.toLowerCase())
      )
      setFilteredWords(filtered)
    } else {
      setFilteredWords(words)
    }
  }, [words, searchTerm])

  const fetchWordList = async () => {
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/admin/word-lists/${listId}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      })

      if (!response.ok) {
        throw new Error('Failed to fetch word list')
      }

      const data = await response.json()
      setWordList(data.wordList)
    } catch (error) {
      console.error('Failed to fetch word list:', error)
      setError('Kon woordenlijst niet laden')
    }
  }

  const fetchWords = async () => {
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/admin/word-lists/${listId}/words`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      })

      if (!response.ok) {
        throw new Error('Failed to fetch words')
      }

      const data = await response.json()
      setWords(data.words)
    } catch (error) {
      console.error('Failed to fetch words:', error)
      setError('Kon woorden niet laden')
    } finally {
      setLoading(false)
    }
  }

  const handleEditWord = (word: Word) => {
    setEditingWord({
      id: word.id,
      word: word.word,
      definition: word.definition,
      example: word.example,
      is_active: word.is_active
    })
  }

  const handleSaveEdit = async () => {
    if (!editingWord) return

    // Validate asterisk in example
    const wordInExample = editingWord.example.match(/\*([^*]+)\*/)?.[1]
    if (!wordInExample || wordInExample.toLowerCase() !== editingWord.word.toLowerCase()) {
      setError('Het woord moet tussen *asterisks* staan in de voorbeeldzin')
      return
    }

    setSaving(true)
    setError('')

    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/admin/words/${editingWord.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          word: editingWord.word,
          definition: editingWord.definition,
          example: editingWord.example,
          is_active: editingWord.is_active
        })
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to update word')
      }

      // Update local state
      setWords(words.map(word =>
        word.id === editingWord.id
          ? { ...word, ...editingWord }
          : word
      ))
      setEditingWord(null)

      // Refresh word list stats
      fetchWordList()
    } catch (error: any) {
      setError(error.message || 'Kon woord niet bijwerken')
    } finally {
      setSaving(false)
    }
  }

  const handleDeleteWord = async (wordId: string) => {
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/admin/words/${wordId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      })

      if (!response.ok) {
        throw new Error('Failed to delete word')
      }

      setWords(words.filter(word => word.id !== wordId))
      setShowDeleteConfirm(null)

      // Refresh word list stats
      fetchWordList()
    } catch (error) {
      console.error('Failed to delete word:', error)
      setError('Kon woord niet verwijderen')
    }
  }

  const handleAddWord = async () => {
    if (!newWord.word || !newWord.definition || !newWord.example) {
      setError('Alle velden zijn verplicht')
      return
    }

    // Validate asterisk in example
    const wordInExample = newWord.example.match(/\*([^*]+)\*/)?.[1]
    if (!wordInExample || wordInExample.toLowerCase() !== newWord.word.toLowerCase()) {
      setError('Het woord moet tussen *asterisks* staan in de voorbeeldzin')
      return
    }

    setSaving(true)
    setError('')

    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/admin/word-lists/${listId}/words`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          word: newWord.word,
          definition: newWord.definition,
          example: newWord.example
        })
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to add word')
      }

      const data = await response.json()
      setWords([...words, data.word])
      setNewWord({ word: '', definition: '', example: '' })
      setShowAddForm(false)

      // Refresh word list stats
      fetchWordList()
    } catch (error: any) {
      setError(error.message || 'Kon woord niet toevoegen')
    } finally {
      setSaving(false)
    }
  }

  const toggleWordActive = async (wordId: string, currentActive: boolean) => {
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/admin/words/${wordId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          is_active: !currentActive
        })
      })

      if (!response.ok) {
        throw new Error('Failed to toggle word status')
      }

      setWords(words.map(word =>
        word.id === wordId
          ? { ...word, is_active: !currentActive }
          : word
      ))

      // Refresh word list stats
      fetchWordList()
    } catch (error) {
      console.error('Failed to toggle word status:', error)
      setError('Kon woordstatus niet wijzigen')
    }
  }

  const handleLogout = () => {
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    router.push('/admin')
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-2xl font-mono">LADEN...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen p-4">
      <div className="max-w-6xl mx-auto">
        <header className="flex items-center gap-4 mb-8">
          <button
            onClick={() => router.push('/admin/dashboard')}
            className="retro-button-small flex items-center gap-2"
          >
            <ArrowLeft size={16} />
            DASHBOARD
          </button>
          <div className="flex-1">
            <h1 className="text-4xl font-bold">{wordList?.title || 'WOORDENLIJST'}</h1>
            {wordList?.theme && (
              <p className="text-lg opacity-75">Thema: {wordList.theme}</p>
            )}
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setShowAddForm(true)}
              className="retro-button flex items-center gap-2"
            >
              <Plus size={16} />
              WOORD TOEVOEGEN
            </button>
            <button
              onClick={handleLogout}
              className="retro-button flex items-center gap-2"
            >
              <LogOut size={16} />
              UITLOGGEN
            </button>
          </div>
        </header>

        {/* Statistics */}
        {wordList && (
          <div className="retro-border p-6 mb-6">
            <div className="grid grid-cols-4 gap-4 text-center">
              <div>
                <div className="text-2xl font-bold">{wordList.total_words}</div>
                <div className="text-sm opacity-75">Totaal woorden</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-green-500">{wordList.active_words}</div>
                <div className="text-sm opacity-75">Actief</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-red-500">{wordList.total_words - wordList.active_words}</div>
                <div className="text-sm opacity-75">Inactief</div>
              </div>
              <div>
                <div className="text-2xl font-bold">{filteredWords.length}</div>
                <div className="text-sm opacity-75">Getoond</div>
              </div>
            </div>
          </div>
        )}

        {/* Search */}
        <div className="retro-border p-4 mb-6">
          <div className="flex items-center gap-2">
            <Search size={20} />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Zoek woorden, definities of voorbeelden..."
              className="retro-input flex-1 p-3"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="retro-button-small"
              >
                <X size={12} />
              </button>
            )}
          </div>
        </div>

        {/* Error Display */}
        {error && (
          <div className="retro-border p-4 mb-6 bg-red-900 border-red-600">
            <div className="flex items-center justify-between">
              <span>{error}</span>
              <button
                onClick={() => setError('')}
                className="retro-button-small"
              >
                <X size={12} />
              </button>
            </div>
          </div>
        )}

        {/* Words List */}
        <div className="retro-border p-6">
          <h2 className="text-2xl font-bold mb-4">
            Woorden ({filteredWords.length})
          </h2>

          {filteredWords.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-lg mb-4">
                {searchTerm ? 'Geen woorden gevonden voor je zoekopdracht.' : 'Nog geen woorden in deze lijst.'}
              </p>
              {!searchTerm && (
                <button
                  onClick={() => setShowAddForm(true)}
                  className="retro-button"
                >
                  EERSTE WOORD TOEVOEGEN
                </button>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-white">
                    <th className="text-left p-3 font-mono">STATUS</th>
                    <th className="text-left p-3 font-mono">WOORD</th>
                    <th className="text-left p-3 font-mono">DEFINITIE</th>
                    <th className="text-left p-3 font-mono">VOORBEELD</th>
                    <th className="text-left p-3 font-mono">ACTIES</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredWords.map((word) => (
                    <tr key={word.id} className="border-b border-gray-600">
                      <td className="p-3">
                        <button
                          onClick={() => toggleWordActive(word.id, word.is_active)}
                          className={`px-2 py-1 text-xs font-mono font-bold uppercase rounded ${
                            word.is_active
                              ? 'bg-green-600 text-white'
                              : 'bg-gray-600 text-gray-300'
                          }`}
                        >
                          {word.is_active ? 'ACTIEF' : 'INACTIEF'}
                        </button>
                      </td>
                      <td className="p-3 font-bold">
                        {editingWord?.id === word.id ? (
                          <input
                            type="text"
                            value={editingWord.word}
                            onChange={(e) => setEditingWord({...editingWord, word: e.target.value})}
                            className="retro-input w-full p-2"
                          />
                        ) : (
                          word.word
                        )}
                      </td>
                      <td className="p-3">
                        {editingWord?.id === word.id ? (
                          <textarea
                            value={editingWord.definition}
                            onChange={(e) => setEditingWord({...editingWord, definition: e.target.value})}
                            className="retro-input w-full p-2 min-h-20"
                            rows={2}
                          />
                        ) : (
                          word.definition
                        )}
                      </td>
                      <td className="p-3">
                        {editingWord?.id === word.id ? (
                          <textarea
                            value={editingWord.example}
                            onChange={(e) => setEditingWord({...editingWord, example: e.target.value})}
                            className="retro-input w-full p-2 min-h-20"
                            rows={2}
                          />
                        ) : (
                          word.example
                        )}
                      </td>
                      <td className="p-3">
                        <div className="flex gap-2">
                          {editingWord?.id === word.id ? (
                            <>
                              <button
                                onClick={handleSaveEdit}
                                disabled={saving}
                                className="retro-button-small bg-green-600 hover:bg-green-700 flex items-center gap-1"
                              >
                                <Save size={12} />
                                {saving ? 'OPSLAAN...' : 'OPSLAAN'}
                              </button>
                              <button
                                onClick={() => setEditingWord(null)}
                                className="retro-button-small bg-gray-600 hover:bg-gray-700 flex items-center gap-1"
                              >
                                <X size={12} />
                                ANNULEER
                              </button>
                            </>
                          ) : (
                            <>
                              <button
                                onClick={() => handleEditWord(word)}
                                className="retro-button-small flex items-center gap-1"
                              >
                                <Edit2 size={12} />
                                BEWERK
                              </button>
                              <button
                                onClick={() => setShowDeleteConfirm(word.id)}
                                className="retro-button-small bg-red-600 hover:bg-red-700 flex items-center gap-1"
                              >
                                <Trash2 size={12} />
                                VERWIJDER
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Add Word Modal */}
        {showAddForm && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="retro-border p-6 bg-black max-w-2xl w-full">
              <h3 className="text-xl font-bold mb-4">NIEUW WOORD TOEVOEGEN</h3>

              <div className="space-y-4 mb-6">
                <div>
                  <label className="block text-sm font-bold mb-2">WOORD *</label>
                  <input
                    type="text"
                    value={newWord.word}
                    onChange={(e) => setNewWord({...newWord, word: e.target.value})}
                    className="retro-input w-full p-3"
                    placeholder="Bijv. algoritme"
                  />
                </div>

                <div>
                  <label className="block text-sm font-bold mb-2">DEFINITIE *</label>
                  <textarea
                    value={newWord.definition}
                    onChange={(e) => setNewWord({...newWord, definition: e.target.value})}
                    className="retro-input w-full p-3"
                    rows={3}
                    placeholder="Bijv. Een stap-voor-stap procedure om een probleem op te lossen"
                  />
                </div>

                <div>
                  <label className="block text-sm font-bold mb-2">VOORBEELDZIN *</label>
                  <textarea
                    value={newWord.example}
                    onChange={(e) => setNewWord({...newWord, example: e.target.value})}
                    className="retro-input w-full p-3"
                    rows={3}
                    placeholder="Bijv. Het *algoritme* hielp ons het probleem snel op te lossen."
                  />
                  <p className="text-xs opacity-75 mt-1">
                    Plaats het woord tussen *asterisks* in de voorbeeldzin
                  </p>
                </div>
              </div>

              <div className="flex gap-4">
                <button
                  onClick={handleAddWord}
                  disabled={saving}
                  className="retro-button bg-green-600 hover:bg-green-700"
                >
                  {saving ? 'TOEVOEGEN...' : 'WOORD TOEVOEGEN'}
                </button>
                <button
                  onClick={() => {
                    setShowAddForm(false)
                    setNewWord({ word: '', definition: '', example: '' })
                    setError('')
                  }}
                  className="retro-button-secondary"
                >
                  ANNULEER
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Delete Confirmation Modal */}
        {showDeleteConfirm && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="retro-border p-6 bg-black max-w-md w-full">
              <h3 className="text-xl font-bold mb-4">Ben je zeker?</h3>
              <p className="mb-4">
                Wil je dit woord definitief verwijderen? Deze actie kan niet ongedaan gemaakt worden.
              </p>
              <div className="flex gap-4">
                <button
                  onClick={() => handleDeleteWord(showDeleteConfirm)}
                  className="retro-button bg-red-600 hover:bg-red-700"
                >
                  JA, VERWIJDER
                </button>
                <button
                  onClick={() => setShowDeleteConfirm(null)}
                  className="retro-button-secondary"
                >
                  ANNULEER
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}