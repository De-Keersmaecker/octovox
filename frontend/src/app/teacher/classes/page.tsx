'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Users, BookOpen, Plus, Check, X, TrendingUp } from 'lucide-react'

interface Class {
  code: string
  name: string
  student_count: number
  assigned_lists: number
}

interface WordList {
  id: string
  title: string
  theme: string
  total_words: number
  active_words: number
  assigned_at?: string
  is_assigned: boolean
}

interface StudentResult {
  student_id: string
  student_name: string
  student_email: string
  list_title: string
  list_id: string
  total_attempts: number
  correct_attempts: number
  accuracy_rate: number
  last_attempt: string
}

export default function ClassManagement() {
  const [classes, setClasses] = useState<Class[]>([])
  const [selectedClass, setSelectedClass] = useState<string>('')
  const [wordLists, setWordLists] = useState<WordList[]>([])
  const [studentResults, setStudentResults] = useState<StudentResult[]>([])
  const [loading, setLoading] = useState(true)
  const [assignLoading, setAssignLoading] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<'lists' | 'results'>('lists')
  const router = useRouter()

  useEffect(() => {
    const userData = localStorage.getItem('user')
    if (!userData) {
      router.push('/login')
      return
    }

    const user = JSON.parse(userData)
    if (user.role === 'student') {
      router.push('/dashboard')
      return
    }

    fetchClasses()
  }, [router])

  useEffect(() => {
    if (selectedClass) {
      fetchWordLists()
      if (activeTab === 'results') {
        fetchStudentResults()
      }
    }
  }, [selectedClass, activeTab])

  const fetchClasses = async () => {
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/teacher/classes`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      })

      if (response.ok) {
        const data = await response.json()
        setClasses(data.classes)
        if (data.classes.length > 0 && !selectedClass) {
          setSelectedClass(data.classes[0].code)
        }
      }
    } catch (error) {
      console.error('Failed to fetch classes:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchWordLists = async () => {
    if (!selectedClass) return

    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/teacher/classes/${selectedClass}/word-lists`,
        {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        }
      )

      if (response.ok) {
        const data = await response.json()
        setWordLists(data.wordLists)
      }
    } catch (error) {
      console.error('Failed to fetch word lists:', error)
    }
  }

  const fetchStudentResults = async () => {
    if (!selectedClass) return

    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/teacher/classes/${selectedClass}/results`,
        {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        }
      )

      if (response.ok) {
        const data = await response.json()
        setStudentResults(data.results)
      }
    } catch (error) {
      console.error('Failed to fetch student results:', error)
    }
  }

  const toggleListAssignment = async (listId: string, isCurrentlyAssigned: boolean) => {
    setAssignLoading(listId)

    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/teacher/classes/${selectedClass}/assign-list`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          },
          body: JSON.stringify({
            listId,
            assign: !isCurrentlyAssigned
          })
        }
      )

      if (response.ok) {
        await fetchWordLists()
        await fetchClasses() // Refresh counts
      }
    } catch (error) {
      console.error('Failed to toggle list assignment:', error)
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

  const selectedClassData = classes.find(c => c.code === selectedClass)

  // Group student results by student
  const groupedResults = studentResults.reduce((acc, result) => {
    if (!acc[result.student_id]) {
      acc[result.student_id] = {
        student_name: result.student_name,
        student_email: result.student_email,
        lists: []
      }
    }
    if (result.list_title) {
      acc[result.student_id].lists.push(result)
    }
    return acc
  }, {} as Record<string, {
    student_name: string
    student_email: string
    lists: StudentResult[]
  }>)

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
              <h1 className="text-3xl font-bold">KLASSEN BEHEER</h1>
              <p className="text-lg opacity-75">Beheer woordenlijsten en bekijk resultaten</p>
            </div>
          </div>
        </header>

        {/* Class Selector */}
        <div className="retro-border p-4 mb-6">
          <div className="flex items-center gap-4 flex-wrap">
            <span className="font-mono font-bold">KLAS:</span>
            <div className="flex gap-2">
              {classes.map(cls => (
                <button
                  key={cls.code}
                  onClick={() => setSelectedClass(cls.code)}
                  className={`px-4 py-2 font-mono uppercase ${
                    selectedClass === cls.code
                      ? 'bg-white text-black'
                      : 'bg-black text-white border border-white'
                  }`}
                >
                  {cls.code}
                  <div className="text-xs opacity-75">
                    {cls.student_count} leerlingen
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>

        {selectedClassData && (
          <>
            {/* Class Info */}
            <div className="retro-border p-6 mb-6">
              <h2 className="text-2xl font-bold mb-4">{selectedClassData.name}</h2>
              <div className="grid grid-cols-3 gap-4">
                <div className="text-center">
                  <Users size={32} className="mx-auto mb-2" />
                  <div className="text-2xl font-bold">{selectedClassData.student_count}</div>
                  <div className="text-sm opacity-75">Leerlingen</div>
                </div>
                <div className="text-center">
                  <BookOpen size={32} className="mx-auto mb-2" />
                  <div className="text-2xl font-bold">{selectedClassData.assigned_lists}</div>
                  <div className="text-sm opacity-75">Toegewezen Lijsten</div>
                </div>
                <div className="text-center">
                  <TrendingUp size={32} className="mx-auto mb-2" />
                  <div className="text-2xl font-bold">{Object.keys(groupedResults).length}</div>
                  <div className="text-sm opacity-75">Actieve Leerlingen</div>
                </div>
              </div>
            </div>

            {/* Tabs */}
            <div className="retro-border p-4 mb-6">
              <div className="flex gap-2">
                <button
                  onClick={() => setActiveTab('lists')}
                  className={`px-6 py-3 font-mono uppercase ${
                    activeTab === 'lists'
                      ? 'bg-white text-black'
                      : 'bg-black text-white border border-white'
                  }`}
                >
                  Woordenlijsten
                </button>
                <button
                  onClick={() => setActiveTab('results')}
                  className={`px-6 py-3 font-mono uppercase ${
                    activeTab === 'results'
                      ? 'bg-white text-black'
                      : 'bg-black text-white border border-white'
                  }`}
                >
                  Leerling Resultaten
                </button>
              </div>
            </div>

            {/* Word Lists Tab */}
            {activeTab === 'lists' && (
              <div className="retro-border p-6">
                <h3 className="text-xl font-bold mb-4">
                  Woordenlijsten voor {selectedClassData.name}
                </h3>
                <p className="text-sm opacity-75 mb-6">
                  Vink aan welke lijsten leerlingen van deze klas kunnen zien en oefenen.
                </p>

                {wordLists.length === 0 ? (
                  <p className="text-center py-8 opacity-75">
                    Geen woordenlijsten beschikbaar. Maak eerst lijsten aan als administrator.
                  </p>
                ) : (
                  <div className="space-y-4">
                    {wordLists.map(list => (
                      <div
                        key={list.id}
                        className="retro-border p-4 flex items-center justify-between"
                      >
                        <div className="flex-1">
                          <h4 className="font-bold text-lg">{list.title}</h4>
                          {list.theme && (
                            <p className="text-sm opacity-75 mb-2">Thema: {list.theme}</p>
                          )}
                          <div className="flex gap-4 text-sm">
                            <span>{list.active_words} actieve woorden</span>
                            <span>van {list.total_words} totaal</span>
                            {list.assigned_at && (
                              <span className="opacity-75">
                                Toegewezen: {new Date(list.assigned_at).toLocaleDateString('nl-BE')}
                              </span>
                            )}
                          </div>
                        </div>
                        <button
                          onClick={() => toggleListAssignment(list.id, list.is_assigned)}
                          disabled={assignLoading === list.id}
                          className={`retro-button-small flex items-center gap-2 ${
                            list.is_assigned
                              ? 'bg-green-600 hover:bg-green-700'
                              : 'bg-gray-600 hover:bg-gray-700'
                          }`}
                        >
                          {assignLoading === list.id ? (
                            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                          ) : list.is_assigned ? (
                            <Check size={16} />
                          ) : (
                            <Plus size={16} />
                          )}
                          {list.is_assigned ? 'TOEGEWEZEN' : 'TOEWIJZEN'}
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Results Tab */}
            {activeTab === 'results' && (
              <div className="retro-border p-6">
                <h3 className="text-xl font-bold mb-4">
                  Resultaten voor {selectedClassData.name}
                </h3>

                {Object.keys(groupedResults).length === 0 ? (
                  <p className="text-center py-8 opacity-75">
                    Nog geen resultaten beschikbaar. Leerlingen moeten eerst oefeningen maken.
                  </p>
                ) : (
                  <div className="space-y-6">
                    {Object.entries(groupedResults).map(([studentId, student]) => (
                      <div key={studentId} className="retro-border p-4">
                        <h4 className="font-bold text-lg mb-2">{student.student_name}</h4>
                        <p className="text-sm opacity-75 mb-4">{student.student_email}</p>

                        {student.lists.length === 0 ? (
                          <p className="text-sm opacity-75 italic">Nog geen oefeningen gemaakt</p>
                        ) : (
                          <div className="grid gap-3">
                            {student.lists.map(result => (
                              <div
                                key={`${result.student_id}-${result.list_id}`}
                                className="bg-gray-900 p-3 rounded flex items-center justify-between"
                              >
                                <div>
                                  <span className="font-mono font-bold">{result.list_title}</span>
                                  <div className="text-xs opacity-75">
                                    {result.total_attempts} pogingen, {result.correct_attempts} correct
                                  </div>
                                </div>
                                <div className="text-right">
                                  <div className={`font-bold ${
                                    result.accuracy_rate >= 80 ? 'text-green-500' :
                                    result.accuracy_rate >= 60 ? 'text-yellow-500' :
                                    'text-red-500'
                                  }`}>
                                    {result.accuracy_rate}%
                                  </div>
                                  <div className="text-xs opacity-75">
                                    {result.last_attempt
                                      ? new Date(result.last_attempt).toLocaleDateString('nl-BE')
                                      : 'Nooit'
                                    }
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}