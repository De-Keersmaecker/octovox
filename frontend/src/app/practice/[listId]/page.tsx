'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { ArrowLeft, Pause, Play, Square } from 'lucide-react'

interface Word {
  id: string
  base_form: string
  definition: string
  example_sentence: string
}

interface WordStatus {
  word_id: string
  status: 'unseen' | 'green' | 'orange'
}

interface Session {
  id: string
  current_phase: number
  current_battery_number: number
  session_state: 'active' | 'paused' | 'completed'
}

interface Battery {
  id: string
  battery_number: number
  phase: number
  words_in_battery: string[]
  battery_state: 'active' | 'completed'
}

export default function Practice() {
  const router = useRouter()
  const params = useParams()
  const listId = params.listId as string

  const [session, setSession] = useState<Session | null>(null)
  const [battery, setBattery] = useState<Battery | null>(null)
  const [words, setWords] = useState<Word[]>([])
  const [statuses, setStatuses] = useState<WordStatus[]>([])
  const [currentWordIndex, setCurrentWordIndex] = useState(0)
  const [showOverview, setShowOverview] = useState(true)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    initializeSession()
  }, [listId])

  const initializeSession = async () => {
    try {
      // Get or create session
      const sessionResponse = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/learning/session/${listId}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      })

      if (!sessionResponse.ok) {
        throw new Error('Failed to get session')
      }

      const sessionData = await sessionResponse.json()
      setSession(sessionData.session)

      // Get current battery
      const batteryResponse = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/learning/battery/${sessionData.session.id}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      })

      if (!batteryResponse.ok) {
        throw new Error('Failed to get battery')
      }

      const batteryData = await batteryResponse.json()
      setBattery(batteryData.battery)
      setWords(batteryData.words)
      setStatuses(batteryData.statuses)

    } catch (error) {
      console.error('Failed to initialize session:', error)
      alert('Failed to load practice session. Please try again.')
      router.push('/dashboard')
    } finally {
      setLoading(false)
    }
  }

  const getWordStatus = (wordId: string): 'unseen' | 'green' | 'orange' => {
    const status = statuses.find(s => s.word_id === wordId)
    return status?.status || 'unseen'
  }

  const getStatusColor = (status: 'unseen' | 'green' | 'orange') => {
    switch (status) {
      case 'green': return 'bg-green-500'
      case 'orange': return 'bg-orange-500'
      default: return 'bg-gray-700 border border-gray-500'
    }
  }

  const startExercise = () => {
    setShowOverview(false)
    setCurrentWordIndex(0)
  }

  const pauseSession = async () => {
    if (!session) return

    try {
      await fetch(`${process.env.NEXT_PUBLIC_API_URL}/learning/session/${session.id}/pause`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      })

      router.push('/dashboard')
    } catch (error) {
      console.error('Failed to pause session:', error)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-2xl font-mono">LOADING SESSION...</div>
      </div>
    )
  }

  if (!session || !battery) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-2xl font-mono">SESSION ERROR</div>
      </div>
    )
  }

  const phaseName = {
    1: 'Context Begrijpen',
    2: 'Woord Plaatsen',
    3: 'Woord Typen'
  }[session.current_phase] || 'Unknown'

  if (showOverview) {
    return (
      <div className="min-h-screen p-4">
        <div className="max-w-4xl mx-auto">
          <header className="flex justify-between items-center mb-6">
            <button
              onClick={() => router.push('/dashboard')}
              className="retro-button flex items-center gap-2"
            >
              <ArrowLeft size={16} />
              DASHBOARD
            </button>

            <button
              onClick={pauseSession}
              className="retro-button flex items-center gap-2"
            >
              <Pause size={16} />
              PAUZEER
            </button>
          </header>

          <div className="retro-border p-8 bg-black">
            <div className="text-center mb-8">
              <h1 className="text-4xl font-bold mb-2">FASE {session.current_phase}</h1>
              <h2 className="text-2xl mb-4">{phaseName}</h2>
              <div className="text-lg">
                Batterij {session.current_battery_number} • {words.length} woorden
              </div>
            </div>

            {/* Fase Progress Indicators */}
            <div className="flex justify-center mb-8">
              <div className="flex gap-4">
                {[1, 2, 3].map(phase => (
                  <div key={phase} className="text-center">
                    <div className={`w-12 h-12 border-2 flex items-center justify-center font-bold text-lg ${
                      phase === session.current_phase
                        ? 'bg-white text-black border-white'
                        : phase < session.current_phase
                          ? 'bg-green-500 border-green-500'
                          : 'border-gray-500 text-gray-500'
                    }`}>
                      {phase}
                    </div>
                    <div className="text-xs mt-1">
                      {phase === 1 ? 'Context' : phase === 2 ? 'Plaatsen' : 'Typen'}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Battery Words Grid */}
            <div className="mb-8">
              <h3 className="text-xl font-bold mb-4 text-center">WOORDEN IN DEZE BATTERIJ</h3>
              <div className="grid grid-cols-5 gap-4 max-w-md mx-auto">
                {words.map((word) => {
                  const status = getWordStatus(word.id)
                  return (
                    <div key={word.id} className="text-center">
                      <div className={`w-12 h-12 ${getStatusColor(status)} flex items-center justify-center`}>
                        {status === 'green' && <span className="text-white font-bold">✓</span>}
                        {status === 'orange' && <span className="text-white font-bold">!</span>}
                      </div>
                      <div className="text-xs mt-1 truncate">{word.base_form}</div>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Start Button */}
            <div className="text-center">
              <button
                onClick={startExercise}
                className="retro-button text-xl px-8 py-4 flex items-center gap-3 mx-auto"
              >
                <Play size={20} />
                BEGIN OEFENING
              </button>
            </div>

            {/* Phase Description */}
            <div className="mt-8 p-4 border border-gray-600 bg-gray-900">
              <h4 className="font-bold mb-2">HOE WERKT FASE {session.current_phase}?</h4>
              <p className="text-sm">
                {session.current_phase === 1 && "Je ziet een voorbeeldzin en kiest de juiste betekenis uit 5 opties."}
                {session.current_phase === 2 && "Je ziet een zin met een leeg lijntje en kiest het juiste woord uit 5 opties."}
                {session.current_phase === 3 && "Je ziet een zin met een leeg lijntje en typt het juiste woord. De app helpt je met autocorrectie."}
              </p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // Exercise view will be implemented in the next step
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-2xl font-mono">EXERCISE INTERFACE COMING SOON...</div>
    </div>
  )
}