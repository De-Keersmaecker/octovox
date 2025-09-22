'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, TrendingDown, TrendingUp, Filter, BookOpen } from 'lucide-react'

interface WordDifficulty {
  id: string
  word: string
  definition: string
  list_title: string
  list_id: string
  total_attempts: number
  correct_attempts: number
  accuracy_rate: number
  difficulty_score: number
}

interface DifficultyStats {
  mostDifficult: WordDifficulty[]
  easiest: WordDifficulty[]
  averageAccuracy: number
  totalWordsTracked: number
}

export default function WordDifficultyOverview() {
  const [stats, setStats] = useState<DifficultyStats | null>(null)
  const [words, setWords] = useState<WordDifficulty[]>([])
  const [loading, setLoading] = useState(true)
  const [viewMode, setViewMode] = useState<'class' | 'teacher' | 'global'>('teacher')
  const [selectedClass, setSelectedClass] = useState<string>('all')
  const [selectedList, setSelectedList] = useState<string>('all')
  const [wordLists, setWordLists] = useState<any[]>([])
  const [classes, setClasses] = useState<string[]>(['CLASS2024', 'CLASS2025'])
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

    fetchDifficultyData()
    fetchWordLists()
  }, [router, viewMode, selectedClass, selectedList])

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
    }
  }

  const fetchDifficultyData = async () => {
    try {
      const params = new URLSearchParams()
      if (viewMode === 'class' && selectedClass !== 'all') {
        params.append('classCode', selectedClass)
      }
      if (selectedList !== 'all') {
        params.append('listId', selectedList)
      }
      params.append('scope', viewMode)

      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/teacher/word-difficulty?${params}`,
        {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        }
      )

      if (response.ok) {
        const data = await response.json()
        setStats(data.stats)
        setWords(data.words)
      }
    } catch (error) {
      console.error('Failed to fetch difficulty data:', error)
    } finally {
      setLoading(false)
    }
  }

  const getDifficultyColor = (accuracy: number) => {
    if (accuracy < 40) return 'text-red-500'
    if (accuracy < 60) return 'text-orange-500'
    if (accuracy < 80) return 'text-yellow-500'
    return 'text-green-500'
  }

  const getDifficultyLabel = (accuracy: number) => {
    if (accuracy < 40) return 'ZEER MOEILIJK'
    if (accuracy < 60) return 'MOEILIJK'
    if (accuracy < 80) return 'GEMIDDELD'
    return 'MAKKELIJK'
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
              <h1 className="text-3xl font-bold">WOORDEN MOEILIJKHEIDSGRAAD</h1>
              <p className="text-lg opacity-75">Overzicht van moeilijke en makkelijke woorden</p>
            </div>
          </div>
        </header>

        {/* View Mode Selector */}
        <div className="retro-border p-4 mb-6">
          <div className="flex items-center gap-4 flex-wrap">
            <span className="font-mono font-bold">WEERGAVE:</span>
            <div className="flex gap-2">
              <button
                onClick={() => setViewMode('class')}
                className={`px-4 py-2 font-mono uppercase ${
                  viewMode === 'class'
                    ? 'bg-white text-black'
                    : 'bg-black text-white border border-white'
                }`}
              >
                Per Klas
              </button>
              <button
                onClick={() => setViewMode('teacher')}
                className={`px-4 py-2 font-mono uppercase ${
                  viewMode === 'teacher'
                    ? 'bg-white text-black'
                    : 'bg-black text-white border border-white'
                }`}
              >
                Alle Klassen
              </button>
              {localStorage.getItem('user')?.includes('administrator') && (
                <button
                  onClick={() => setViewMode('global')}
                  className={`px-4 py-2 font-mono uppercase ${
                    viewMode === 'global'
                      ? 'bg-white text-black'
                      : 'bg-black text-white border border-white'
                  }`}
                >
                  Globaal
                </button>
              )}
            </div>

            {viewMode === 'class' && (
              <>
                <span className="font-mono font-bold ml-4">KLAS:</span>
                <select
                  value={selectedClass}
                  onChange={(e) => setSelectedClass(e.target.value)}
                  className="retro-input px-3 py-2"
                >
                  <option value="all">Alle Klassen</option>
                  {classes.map(cls => (
                    <option key={cls} value={cls}>{cls}</option>
                  ))}
                </select>
              </>
            )}

            <span className="font-mono font-bold ml-4">LIJST:</span>
            <select
              value={selectedList}
              onChange={(e) => setSelectedList(e.target.value)}
              className="retro-input px-3 py-2"
            >
              <option value="all">Alle Lijsten</option>
              {wordLists.map(list => (
                <option key={list.id} value={list.id}>{list.title}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Statistics Overview */}
        {stats && (
          <div className="grid grid-cols-4 gap-4 mb-8">
            <div className="retro-border p-6 text-center">
              <TrendingDown size={32} className="mx-auto mb-2 text-red-500" />
              <div className="text-2xl font-bold">{stats.mostDifficult.length}</div>
              <div className="text-sm opacity-75">Zeer Moeilijke Woorden</div>
            </div>
            <div className="retro-border p-6 text-center">
              <TrendingUp size={32} className="mx-auto mb-2 text-green-500" />
              <div className="text-2xl font-bold">{stats.easiest.length}</div>
              <div className="text-sm opacity-75">Makkelijke Woorden</div>
            </div>
            <div className="retro-border p-6 text-center">
              <div className="text-3xl mx-auto mb-2">📊</div>
              <div className="text-2xl font-bold">{stats.averageAccuracy.toFixed(1)}%</div>
              <div className="text-sm opacity-75">Gem. Nauwkeurigheid</div>
            </div>
            <div className="retro-border p-6 text-center">
              <BookOpen size={32} className="mx-auto mb-2" />
              <div className="text-2xl font-bold">{stats.totalWordsTracked}</div>
              <div className="text-sm opacity-75">Woorden Gevolgd</div>
            </div>
          </div>
        )}

        {/* Words Table */}
        <div className="retro-border p-6">
          <h2 className="text-2xl font-bold mb-4">
            Woorden gesorteerd op moeilijkheid ({words.length})
          </h2>

          {words.length === 0 ? (
            <p className="text-center py-8 opacity-75">
              Nog geen data beschikbaar. Leerlingen moeten eerst oefeningen maken.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-white">
                    <th className="text-left p-3 font-mono">MOEILIJKHEID</th>
                    <th className="text-left p-3 font-mono">WOORD</th>
                    <th className="text-left p-3 font-mono">DEFINITIE</th>
                    <th className="text-left p-3 font-mono">LIJST</th>
                    <th className="text-left p-3 font-mono">POGINGEN</th>
                    <th className="text-left p-3 font-mono">CORRECT</th>
                    <th className="text-left p-3 font-mono">NAUWKEURIGHEID</th>
                  </tr>
                </thead>
                <tbody>
                  {words.map((word, index) => (
                    <tr key={word.id} className="border-b border-gray-600">
                      <td className="p-3">
                        <span className={`font-bold ${getDifficultyColor(word.accuracy_rate)}`}>
                          {getDifficultyLabel(word.accuracy_rate)}
                        </span>
                      </td>
                      <td className="p-3 font-bold">{word.word}</td>
                      <td className="p-3 text-sm opacity-75">
                        {word.definition.length > 50
                          ? word.definition.substring(0, 50) + '...'
                          : word.definition}
                      </td>
                      <td className="p-3">
                        <span className="px-2 py-1 bg-gray-800 text-xs font-mono">
                          {word.list_title}
                        </span>
                      </td>
                      <td className="p-3 text-center">{word.total_attempts}</td>
                      <td className="p-3 text-center">{word.correct_attempts}</td>
                      <td className="p-3">
                        <div className="flex items-center gap-2">
                          <div className="flex-1 bg-gray-700 rounded-full h-4">
                            <div
                              className={`h-4 rounded-full ${
                                word.accuracy_rate >= 80 ? 'bg-green-500' :
                                word.accuracy_rate >= 60 ? 'bg-yellow-500' :
                                word.accuracy_rate >= 40 ? 'bg-orange-500' :
                                'bg-red-500'
                              }`}
                              style={{ width: `${word.accuracy_rate}%` }}
                            />
                          </div>
                          <span className="font-mono text-sm font-bold">
                            {word.accuracy_rate.toFixed(1)}%
                          </span>
                        </div>
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
            onClick={() => router.push('/teacher/reports')}
            className="retro-border p-6 hover:bg-white hover:text-black transition-colors"
          >
            <div className="text-2xl mb-2">📈</div>
            <div className="font-mono font-bold">RAPPORTEN EXPORTEREN</div>
          </button>
          <button
            onClick={() => router.push('/admin/word-lists')}
            className="retro-border p-6 hover:bg-white hover:text-black transition-colors"
          >
            <div className="text-2xl mb-2">✏️</div>
            <div className="font-mono font-bold">LIJSTEN AANPASSEN</div>
          </button>
          <button
            onClick={() => window.location.reload()}
            className="retro-border p-6 hover:bg-white hover:text-black transition-colors"
          >
            <div className="text-2xl mb-2">🔄</div>
            <div className="font-mono font-bold">DATA VERNIEUWEN</div>
          </button>
        </div>
      </div>
    </div>
  )
}