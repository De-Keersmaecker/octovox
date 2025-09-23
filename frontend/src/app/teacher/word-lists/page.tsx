'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, BookOpen, Users, Upload, Eye } from 'lucide-react'

interface WordList {
  id: string
  title: string
  theme: string
  total_words: number
}

interface Class {
  code: string
  name: string
  student_count: number
  assigned_lists: number
}

export default function TeacherWordLists() {
  const [wordLists, setWordLists] = useState<WordList[]>([])
  const [classes, setClasses] = useState<Class[]>([])
  const [loading, setLoading] = useState(true)
  const [showAssignModal, setShowAssignModal] = useState(false)
  const [selectedWordList, setSelectedWordList] = useState<WordList | null>(null)
  const [assignLoading, setAssignLoading] = useState<string | null>(null)
  const router = useRouter()

  useEffect(() => {
    const userData = localStorage.getItem('user')
    if (!userData) {
      router.push('/login')
      return
    }

    const user = JSON.parse(userData)
    if (user.role !== 'teacher' && user.role !== 'administrator') {
      router.push('/dashboard')
      return
    }

    fetchWordLists()
    fetchClasses()
  }, [router])

  const fetchWordLists = async () => {
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/teacher/word-lists`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      })

      if (response.ok) {
        const data = await response.json()
        setWordLists(data.wordLists || [])
      }
    } catch (error) {
      console.error('Failed to fetch word lists:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchClasses = async () => {
    try {
      console.log('Fetching classes...')
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/teacher/classes`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      })

      console.log('Classes response status:', response.status)

      if (response.ok) {
        const data = await response.json()
        console.log('Classes data:', data)
        setClasses(data.classes || [])
      } else {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }))
        console.error('Failed to fetch classes:', response.status, errorData)
      }
    } catch (error) {
      console.error('Failed to fetch classes:', error)
    }
  }

  const openAssignModal = (wordList: WordList) => {
    setSelectedWordList(wordList)
    setShowAssignModal(true)
  }

  const closeAssignModal = () => {
    setSelectedWordList(null)
    setShowAssignModal(false)
  }

  const assignToClass = async (classCode: string) => {
    if (!selectedWordList) return

    setAssignLoading(classCode)

    try {
      console.log('Assigning word list:', {
        classCode,
        listId: selectedWordList.id,
        listTitle: selectedWordList.title
      })

      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/teacher/classes/${classCode}/assign-list`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          },
          body: JSON.stringify({
            listId: selectedWordList.id,
            assign: true
          })
        }
      )

      console.log('Assignment response status:', response.status)

      if (response.ok) {
        const data = await response.json()
        console.log('Assignment response data:', data)
        alert(`Woordenlijst "${selectedWordList.title}" is toegewezen aan ${classCode}!`)
        closeAssignModal()
        fetchClasses() // Refresh class data
      } else {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }))
        console.error('Assignment failed:', response.status, errorData)
        alert(`Er ging iets mis bij het toewijzen: ${errorData.error || 'Onbekende fout'}`)
      }
    } catch (error) {
      console.error('Failed to assign word list:', error)
      alert(`Er ging iets mis bij het toewijzen van de woordenlijst: ${error instanceof Error ? error.message : 'Onbekende fout'}`)
    } finally {
      setAssignLoading(null)
    }
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
      <div className="max-w-7xl mx-auto">
        <header className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.push('/teacher/dashboard')}
              className="retro-button-small flex items-center gap-2"
            >
              <ArrowLeft size={16} />
              TERUG
            </button>
            <div>
              <h1 className="text-3xl font-bold">WOORDENLIJSTEN</h1>
              <p className="text-lg opacity-75">Bekijk en beheer woordenlijsten</p>
            </div>
          </div>
          <button
            onClick={() => router.push('/admin/dashboard')}
            className="retro-button flex items-center gap-2"
          >
            <Upload size={16} />
            ADMIN TOEGANG
          </button>
        </header>

        <div className="retro-border p-6">
          <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
            <BookOpen size={24} />
            Beschikbare Woordenlijsten ({wordLists.length})
          </h2>

          {wordLists.length === 0 ? (
            <div className="text-center py-12">
              <BookOpen size={64} className="mx-auto mb-4 opacity-30" />
              <h3 className="text-xl font-bold mb-2">Nog geen woordenlijsten beschikbaar</h3>
              <p className="text-lg mb-2">Er zijn nog geen woordenlijsten aangemaakt.</p>
              <p className="text-sm opacity-75">Gebruik de admin toegang om woordenlijsten aan te maken!</p>
            </div>
          ) : (
            <div className="grid gap-4">
              {wordLists.map((list) => (
                <div key={list.id} className="retro-border p-6 bg-gray-900 hover:bg-gray-800 transition-colors">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <h3 className="text-2xl font-bold mb-2">{list.title}</h3>
                      {list.theme && (
                        <p className="text-lg opacity-75 mb-2">📚 Thema: {list.theme}</p>
                      )}
                      <div className="flex gap-4 text-sm opacity-75">
                        <span>📝 {list.total_words} woorden</span>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => router.push(`/admin/word-lists/${list.id}`)}
                        className="retro-button-small flex items-center gap-2"
                      >
                        <Eye size={16} />
                        BEKIJK
                      </button>
                      <button
                        onClick={() => openAssignModal(list)}
                        className="retro-button bg-green-600 hover:bg-green-700 flex items-center gap-2"
                      >
                        <Users size={16} />
                        TOEWIJZEN AAN KLAS
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="mt-8 retro-border p-6 bg-gray-900">
          <h3 className="text-xl font-bold mb-4">🎯 Acties</h3>
          <div className="grid md:grid-cols-2 gap-4">
            <button
              onClick={() => router.push('/teacher/classes')}
              className="retro-border p-4 hover:bg-white hover:text-black transition-colors"
            >
              <Users size={24} className="mx-auto mb-2" />
              <div className="font-mono font-bold">KLASSEN BEHEER</div>
              <div className="text-sm opacity-75 mt-1">Wijs woordenlijsten toe aan klassen</div>
            </button>
            <button
              onClick={() => router.push('/admin/dashboard')}
              className="retro-border p-4 hover:bg-white hover:text-black transition-colors"
            >
              <Upload size={24} className="mx-auto mb-2" />
              <div className="font-mono font-bold">NIEUWE LIJST MAKEN</div>
              <div className="text-sm opacity-75 mt-1">Ga naar admin om nieuwe lijsten aan te maken</div>
            </button>
          </div>
        </div>

        {/* Assignment Modal */}
        {showAssignModal && selectedWordList && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="retro-border p-6 bg-black max-w-md w-full mx-4">
              <h3 className="text-xl font-bold mb-4">Woordenlijst toewijzen</h3>
              <p className="mb-4">
                Wijs <strong>"{selectedWordList.title}"</strong> toe aan een klas:
              </p>

              <div className="space-y-3 mb-6">
                {classes.length === 0 ? (
                  <div className="text-center py-4 opacity-75">
                    <p>Geen klassen gevonden.</p>
                    <p className="text-sm mt-2">Controleer of er klassen zijn aangemaakt.</p>
                  </div>
                ) : (
                  classes.map((cls) => (
                    <button
                      key={cls.code}
                      onClick={() => assignToClass(cls.code)}
                      disabled={assignLoading === cls.code}
                      className="w-full retro-border p-4 hover:bg-white hover:text-black transition-colors text-left disabled:opacity-50"
                    >
                      <div className="flex justify-between items-center">
                        <div>
                          <div className="font-bold">{cls.name}</div>
                          <div className="text-sm opacity-75">
                            {cls.student_count} leerlingen • {cls.assigned_lists} lijsten toegewezen
                          </div>
                        </div>
                        {assignLoading === cls.code && (
                          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        )}
                      </div>
                    </button>
                  ))
                )}
              </div>

              <div className="flex gap-2">
                <button
                  onClick={closeAssignModal}
                  className="retro-button-secondary flex-1"
                >
                  ANNULEREN
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}