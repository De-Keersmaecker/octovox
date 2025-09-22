'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, Upload, Edit, Trash2, BookOpen } from 'lucide-react'

interface WordList {
  id: string
  title: string
  theme: string | null
  total_words: number
  active_words: number
  creator_name: string
  created_at: string
  updated_at: string
}

export default function AdminDashboard() {
  const [wordLists, setWordLists] = useState<WordList[]>([])
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState<any>(null)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null)
  const router = useRouter()

  useEffect(() => {
    const userData = localStorage.getItem('user')
    if (!userData) {
      router.push('/admin')
      return
    }

    const parsedUser = JSON.parse(userData)
    setUser(parsedUser)

    if (parsedUser.role !== 'administrator') {
      router.push('/admin')
      return
    }

    fetchWordLists()
  }, [router])

  const fetchWordLists = async () => {
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/admin/word-lists`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      })

      if (!response.ok) {
        throw new Error('Failed to fetch word lists')
      }

      const data = await response.json()
      setWordLists(data.wordLists)
    } catch (error) {
      console.error('Failed to fetch word lists:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteList = async (listId: string) => {
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/admin/word-lists/${listId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      })

      if (!response.ok) {
        throw new Error('Failed to delete word list')
      }

      // Refresh the list
      fetchWordLists()
      setShowDeleteConfirm(null)
    } catch (error) {
      console.error('Failed to delete word list:', error)
      alert('Fout bij verwijderen van woordenlijst')
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
        <header className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-4xl font-bold mb-2">OCTOVOX ADMIN</h1>
            <p className="text-lg">Welkom terug, {user?.name}</p>
          </div>
          <button
            onClick={handleLogout}
            className="retro-button"
          >
            UITLOGGEN
          </button>
        </header>

        <div className="grid gap-6">
          {/* Actions */}
          <div className="retro-border p-6">
            <h2 className="text-2xl font-bold mb-4">Acties</h2>
            <div className="flex gap-4">
              <button
                onClick={() => router.push('/admin/upload')}
                className="retro-button flex items-center gap-2"
              >
                <Upload size={16} />
                EXCEL UPLOADEN
              </button>
              <button
                onClick={() => router.push('/admin/create-list')}
                className="retro-button flex items-center gap-2"
              >
                <Plus size={16} />
                NIEUWE LIJST
              </button>
            </div>
          </div>

          {/* Word Lists Overview */}
          <div className="retro-border p-6">
            <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
              <BookOpen size={24} />
              Woordenlijsten ({wordLists.length})
            </h2>

            {wordLists.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-lg mb-4">Nog geen woordenlijsten.</p>
                <p className="text-sm opacity-75">Begin met het uploaden van een Excel bestand!</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-white">
                      <th className="text-left p-3 font-mono">TITEL</th>
                      <th className="text-left p-3 font-mono">THEMA</th>
                      <th className="text-left p-3 font-mono">WOORDEN</th>
                      <th className="text-left p-3 font-mono">ACTIEF</th>
                      <th className="text-left p-3 font-mono">GEMAAKT</th>
                      <th className="text-left p-3 font-mono">ACTIES</th>
                    </tr>
                  </thead>
                  <tbody>
                    {wordLists.map((list) => (
                      <tr key={list.id} className="border-b border-gray-600">
                        <td className="p-3 font-bold">{list.title}</td>
                        <td className="p-3">{list.theme || '-'}</td>
                        <td className="p-3">{list.total_words}</td>
                        <td className="p-3">{list.active_words}</td>
                        <td className="p-3 text-sm">
                          {new Date(list.created_at).toLocaleDateString('nl-NL')}
                        </td>
                        <td className="p-3">
                          <div className="flex gap-2">
                            <button
                              onClick={() => router.push(`/admin/word-lists/${list.id}`)}
                              className="retro-button-small flex items-center gap-1"
                            >
                              <Edit size={12} />
                              BEWERK
                            </button>
                            <button
                              onClick={() => setShowDeleteConfirm(list.id)}
                              className="retro-button-small bg-red-600 hover:bg-red-700 flex items-center gap-1"
                            >
                              <Trash2 size={12} />
                              VERWIJDER
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* Delete Confirmation Modal */}
        {showDeleteConfirm && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="retro-border p-6 bg-black max-w-md w-full">
              <h3 className="text-xl font-bold mb-4">Ben je zeker?</h3>
              <p className="mb-4">
                Wil je deze woordenlijst definitief verwijderen? Deze actie kan niet ongedaan gemaakt worden.
              </p>
              <div className="flex gap-4">
                <button
                  onClick={() => handleDeleteList(showDeleteConfirm)}
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