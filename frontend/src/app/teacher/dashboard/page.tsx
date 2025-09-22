'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Users, BookOpen, TrendingUp, LogOut, Eye } from 'lucide-react'

interface Student {
  id: string
  name: string
  email: string
  class_code: string
  total_words_practiced: number
  average_accuracy: number
  last_active: string
}

interface ClassStats {
  total_students: number
  active_today: number
  average_accuracy: number
  total_words_practiced: number
}

export default function TeacherDashboard() {
  const [students, setStudents] = useState<Student[]>([])
  const [classStats, setClassStats] = useState<ClassStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [selectedClass, setSelectedClass] = useState<string>('all')
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

    // Mock data for development
    setStudents([
      {
        id: '1',
        name: 'Anna Janssens',
        email: 'anna@example.com',
        class_code: 'CLASS2024',
        total_words_practiced: 150,
        average_accuracy: 85,
        last_active: '2024-01-20'
      },
      {
        id: '2',
        name: 'Pieter De Vries',
        email: 'pieter@example.com',
        class_code: 'CLASS2024',
        total_words_practiced: 200,
        average_accuracy: 92,
        last_active: '2024-01-21'
      },
      {
        id: '3',
        name: 'Emma Peeters',
        email: 'emma@example.com',
        class_code: 'CLASS2025',
        total_words_practiced: 120,
        average_accuracy: 78,
        last_active: '2024-01-19'
      }
    ])

    setClassStats({
      total_students: 3,
      active_today: 2,
      average_accuracy: 85,
      total_words_practiced: 470
    })

    setLoading(false)
  }, [router])

  const handleLogout = () => {
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    router.push('/login')
  }

  const viewStudentProgress = (studentId: string) => {
    router.push(`/teacher/student/${studentId}`)
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-2xl font-mono">LADEN...</div>
      </div>
    )
  }

  const classes = ['all', 'CLASS2024', 'CLASS2025']
  const filteredStudents = selectedClass === 'all'
    ? students
    : students.filter(s => s.class_code === selectedClass)

  return (
    <div className="min-h-screen p-4">
      <div className="max-w-7xl mx-auto">
        <header className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-4xl font-bold">LERAAR DASHBOARD</h1>
            <p className="text-lg opacity-75">Bekijk de voortgang van je leerlingen</p>
          </div>
          <button
            onClick={handleLogout}
            className="retro-button flex items-center gap-2"
          >
            <LogOut size={16} />
            UITLOGGEN
          </button>
        </header>

        {/* Statistics Overview */}
        {classStats && (
          <div className="grid grid-cols-4 gap-4 mb-8">
            <div className="retro-border p-6 text-center">
              <Users size={32} className="mx-auto mb-2" />
              <div className="text-2xl font-bold">{classStats.total_students}</div>
              <div className="text-sm opacity-75">Totaal Leerlingen</div>
            </div>
            <div className="retro-border p-6 text-center">
              <TrendingUp size={32} className="mx-auto mb-2" />
              <div className="text-2xl font-bold">{classStats.active_today}</div>
              <div className="text-sm opacity-75">Actief Vandaag</div>
            </div>
            <div className="retro-border p-6 text-center">
              <BookOpen size={32} className="mx-auto mb-2" />
              <div className="text-2xl font-bold">{classStats.total_words_practiced}</div>
              <div className="text-sm opacity-75">Woorden Geoefend</div>
            </div>
            <div className="retro-border p-6 text-center">
              <div className="text-3xl mx-auto mb-2">🎯</div>
              <div className="text-2xl font-bold">{classStats.average_accuracy}%</div>
              <div className="text-sm opacity-75">Gem. Nauwkeurigheid</div>
            </div>
          </div>
        )}

        {/* Class Filter */}
        <div className="retro-border p-4 mb-6">
          <div className="flex items-center gap-4">
            <span className="font-mono font-bold">FILTER KLAS:</span>
            <div className="flex gap-2">
              {classes.map(cls => (
                <button
                  key={cls}
                  onClick={() => setSelectedClass(cls)}
                  className={`px-4 py-2 font-mono uppercase ${
                    selectedClass === cls
                      ? 'bg-white text-black'
                      : 'bg-black text-white border border-white'
                  }`}
                >
                  {cls === 'all' ? 'Alle Klassen' : cls}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Students Table */}
        <div className="retro-border p-6">
          <h2 className="text-2xl font-bold mb-4">Leerlingen ({filteredStudents.length})</h2>

          {filteredStudents.length === 0 ? (
            <p className="text-center py-8 opacity-75">Geen leerlingen gevonden</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-white">
                    <th className="text-left p-3 font-mono">NAAM</th>
                    <th className="text-left p-3 font-mono">KLAS</th>
                    <th className="text-left p-3 font-mono">WOORDEN GEOEFEND</th>
                    <th className="text-left p-3 font-mono">NAUWKEURIGHEID</th>
                    <th className="text-left p-3 font-mono">LAATST ACTIEF</th>
                    <th className="text-left p-3 font-mono">ACTIES</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredStudents.map(student => (
                    <tr key={student.id} className="border-b border-gray-600">
                      <td className="p-3 font-bold">{student.name}</td>
                      <td className="p-3">
                        <span className="px-2 py-1 bg-gray-800 text-xs font-mono">
                          {student.class_code}
                        </span>
                      </td>
                      <td className="p-3">{student.total_words_practiced}</td>
                      <td className="p-3">
                        <span className={`font-bold ${
                          student.average_accuracy >= 80 ? 'text-green-500' :
                          student.average_accuracy >= 60 ? 'text-yellow-500' :
                          'text-red-500'
                        }`}>
                          {student.average_accuracy}%
                        </span>
                      </td>
                      <td className="p-3 opacity-75">
                        {new Date(student.last_active).toLocaleDateString('nl-BE')}
                      </td>
                      <td className="p-3">
                        <button
                          onClick={() => viewStudentProgress(student.id)}
                          className="retro-button-small flex items-center gap-1"
                        >
                          <Eye size={12} />
                          BEKIJK
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Quick Actions */}
        <div className="mt-8 grid grid-cols-3 gap-4">
          <button
            onClick={() => router.push('/admin/word-lists')}
            className="retro-border p-6 hover:bg-white hover:text-black transition-colors"
          >
            <BookOpen size={24} className="mx-auto mb-2" />
            <div className="font-mono font-bold">WOORDENLIJSTEN BEHEREN</div>
          </button>
          <button
            onClick={() => router.push('/teacher/reports')}
            className="retro-border p-6 hover:bg-white hover:text-black transition-colors"
          >
            <TrendingUp size={24} className="mx-auto mb-2" />
            <div className="font-mono font-bold">RAPPORTEN GENEREREN</div>
          </button>
          <button
            onClick={() => router.push('/teacher/settings')}
            className="retro-border p-6 hover:bg-white hover:text-black transition-colors"
          >
            <Users size={24} className="mx-auto mb-2" />
            <div className="font-mono font-bold">KLAS INSTELLINGEN</div>
          </button>
        </div>
      </div>
    </div>
  )
}