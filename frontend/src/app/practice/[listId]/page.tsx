'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { ArrowLeft, Pause, Play, Check, X } from 'lucide-react'

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
  const inputRef = useRef<HTMLInputElement>(null)

  const [session, setSession] = useState<Session | null>(null)
  const [battery, setBattery] = useState<Battery | null>(null)
  const [words, setWords] = useState<Word[]>([])
  const [statuses, setStatuses] = useState<WordStatus[]>([])
  const [currentWordIndex, setCurrentWordIndex] = useState(0)
  const [showOverview, setShowOverview] = useState(true)
  const [showResult, setShowResult] = useState(false)
  const [isCorrect, setIsCorrect] = useState(false)
  const [selectedAnswer, setSelectedAnswer] = useState('')
  const [typedAnswer, setTypedAnswer] = useState('')
  const [originalTypedAnswer, setOriginalTypedAnswer] = useState('')
  const [autocorrectApplied, setAutocorrectApplied] = useState(false)
  const [loading, setLoading] = useState(true)
  const [answerOptions, setAnswerOptions] = useState<string[]>([])

  useEffect(() => {
    initializeSession()
  }, [listId])

  useEffect(() => {
    if (words.length > 0 && !showOverview) {
      generateAnswerOptions()
    }
  }, [currentWordIndex, words, showOverview])

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

  const generateAnswerOptions = () => {
    if (!session || words.length === 0) return

    const currentWord = words[currentWordIndex]
    let options: string[] = []

    if (session.current_phase === 1) {
      // Phase 1: Multiple choice definitions (use definitions of all words in battery)
      options = words.map(word => word.definition)
    } else if (session.current_phase === 2) {
      // Phase 2: Gap-filling word choices (use base forms of all words in battery)
      options = words.map(word => word.base_form)
    }

    // Shuffle the options
    options = options.sort(() => Math.random() - 0.5)
    setAnswerOptions(options)
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
    resetCurrentWord()
  }

  const resetCurrentWord = () => {
    setShowResult(false)
    setSelectedAnswer('')
    setTypedAnswer('')
    setOriginalTypedAnswer('')
    setAutocorrectApplied(false)
    setIsCorrect(false)
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

  const handleMultipleChoiceAnswer = (answer: string) => {
    if (showResult) return

    const currentWord = words[currentWordIndex]
    const correct = answer === currentWord.definition

    setSelectedAnswer(answer)
    setIsCorrect(correct)
    setShowResult(true)

    // Play feedback sound
    playFeedbackSound(correct)

    // Submit attempt
    submitAttempt(correct, answer)
  }

  const handleGapFillingAnswer = (answer: string) => {
    if (showResult) return

    const currentWord = words[currentWordIndex]
    const correct = answer === currentWord.base_form

    setSelectedAnswer(answer)
    setIsCorrect(correct)
    setShowResult(true)

    // Play feedback sound
    playFeedbackSound(correct)

    // Submit attempt
    submitAttempt(correct, answer)
  }

  const handleTypingInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    const currentWord = words[currentWordIndex]
    const targetWord = currentWord.base_form.toLowerCase()

    if (originalTypedAnswer === '') {
      setOriginalTypedAnswer(value)
    }

    // Autocorrect logic
    let correctedValue = ''
    let needsCorrection = false

    for (let i = 0; i < value.length; i++) {
      const typedChar = value[i].toLowerCase()
      const targetChar = targetWord[i]

      if (targetChar && typedChar !== targetChar) {
        correctedValue += targetChar
        needsCorrection = true
        setAutocorrectApplied(true)
      } else if (targetChar) {
        correctedValue += typedChar
      }
    }

    // Visual feedback for autocorrection
    if (needsCorrection && inputRef.current) {
      inputRef.current.style.backgroundColor = '#fee2e2' // red-100
      setTimeout(() => {
        if (inputRef.current) {
          inputRef.current.style.backgroundColor = '#dcfce7' // green-100
        }
      }, 100)
      setTimeout(() => {
        if (inputRef.current) {
          inputRef.current.style.backgroundColor = ''
        }
      }, 200)
    }

    setTypedAnswer(correctedValue)
  }

  const handleTypingSubmit = () => {
    if (showResult) return

    const currentWord = words[currentWordIndex]
    const correct = originalTypedAnswer.toLowerCase().trim() === currentWord.base_form.toLowerCase().trim()

    setIsCorrect(correct)
    setShowResult(true)

    // Play feedback sound
    playFeedbackSound(correct)

    // Submit attempt
    submitAttempt(correct, originalTypedAnswer, autocorrectApplied)
  }

  const submitAttempt = async (correct: boolean, response: string, autocorrect = false) => {
    if (!session || !battery) return

    try {
      const currentWord = words[currentWordIndex]

      await fetch(`${process.env.NEXT_PUBLIC_API_URL}/learning/attempt`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          sessionId: session.id,
          wordId: currentWord.id,
          phase: session.current_phase,
          batteryNumber: battery.battery_number,
          isCorrect: correct,
          responseGiven: response,
          responseTime: 0, // TODO: implement timing
          autocorrectApplied: autocorrect
        })
      })

      // Update local status
      const newStatuses = [...statuses]
      const existingIndex = newStatuses.findIndex(s => s.word_id === currentWord.id)
      const newStatus = { word_id: currentWord.id, status: correct ? 'green' as const : 'orange' as const }

      if (existingIndex >= 0) {
        newStatuses[existingIndex] = newStatus
      } else {
        newStatuses.push(newStatus)
      }
      setStatuses(newStatuses)

    } catch (error) {
      console.error('Failed to submit attempt:', error)
    }
  }

  const playFeedbackSound = (correct: boolean) => {
    if (typeof window !== 'undefined' && window.AudioContext) {
      const audioContext = new window.AudioContext()
      const oscillator = audioContext.createOscillator()
      const gainNode = audioContext.createGain()

      oscillator.connect(gainNode)
      gainNode.connect(audioContext.destination)

      if (correct) {
        oscillator.frequency.setValueAtTime(800, audioContext.currentTime)
        oscillator.frequency.setValueAtTime(1000, audioContext.currentTime + 0.1)
      } else {
        oscillator.frequency.setValueAtTime(300, audioContext.currentTime)
        oscillator.frequency.setValueAtTime(200, audioContext.currentTime + 0.1)
      }

      gainNode.gain.setValueAtTime(0.3, audioContext.currentTime)
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.2)

      oscillator.start(audioContext.currentTime)
      oscillator.stop(audioContext.currentTime + 0.2)
    }

    // Haptic feedback
    if (navigator.vibrate) {
      navigator.vibrate(correct ? [100] : [100, 50, 100])
    }
  }

  const nextWord = () => {
    if (currentWordIndex + 1 >= words.length) {
      // All words in battery completed, return to overview
      setShowOverview(true)
      setCurrentWordIndex(0)
    } else {
      setCurrentWordIndex(prev => prev + 1)
    }
    resetCurrentWord()
  }

  const renderSentenceWithGap = (sentence: string, wordToReplace: string) => {
    const parts = sentence.split(new RegExp(`\\b${wordToReplace}\\b`, 'gi'))
    return (
      <span>
        {parts.map((part, index) => (
          <span key={index}>
            {part}
            {index < parts.length - 1 && (
              <span className="inline-block border-b-2 border-white mx-1 min-w-[100px] text-center">
                ____
              </span>
            )}
          </span>
        ))}
      </span>
    )
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

  const currentWord = words[currentWordIndex]
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
                        {status === 'green' && <Check size={16} className="text-white" />}
                        {status === 'orange' && <X size={16} className="text-white" />}
                      </div>
                      <div className="text-xs mt-1 truncate">{word.base_form}</div>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Progress Info */}
            <div className="text-center mb-6">
              <div className="text-sm">
                Groen: {statuses.filter(s => s.status === 'green').length} •
                Oranje: {statuses.filter(s => s.status === 'orange').length} •
                Nog te doen: {words.length - statuses.length}
              </div>
            </div>

            {/* Start Button */}
            <div className="text-center">
              <button
                onClick={startExercise}
                className="retro-button text-xl px-8 py-4 flex items-center gap-3 mx-auto"
              >
                <Play size={20} />
                {statuses.length > 0 ? 'VERDER OEFENEN' : 'BEGIN OEFENING'}
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

  // Exercise view for the three phases
  return (
    <div className="min-h-screen p-4">
      <div className="max-w-2xl mx-auto">
        <header className="flex justify-between items-center mb-6">
          <button
            onClick={() => setShowOverview(true)}
            className="retro-button flex items-center gap-2"
          >
            <ArrowLeft size={16} />
            OVERZICHT
          </button>

          <div className="text-sm font-mono">
            {currentWordIndex + 1} / {words.length} • FASE {session.current_phase}
          </div>
        </header>

        {/* Progress Bar */}
        <div className="mb-8">
          <div className="w-full bg-gray-800 border border-white h-4">
            <div
              className="bg-white h-full transition-all duration-300"
              style={{ width: `${((currentWordIndex + 1) / words.length) * 100}%` }}
            />
          </div>
        </div>

        <div className="retro-border p-8 bg-black">
          {/* Phase 1: Multiple Choice Context */}
          {session.current_phase === 1 && (
            <div>
              <div className="text-center mb-8">
                <h3 className="text-xl font-bold mb-4">WAT BETEKENT HET WOORD IN DEZE ZIN?</h3>
                <div className="text-lg p-4 border border-white bg-gray-900 mb-4">
                  <span className="font-bold text-yellow-400">{currentWord.base_form}</span> wordt gebruikt in:
                </div>
                <div className="text-lg italic">
                  "{currentWord.example_sentence}"
                </div>
              </div>

              <div className="space-y-3">
                {answerOptions.map((option, index) => (
                  <button
                    key={index}
                    onClick={() => handleMultipleChoiceAnswer(option)}
                    disabled={showResult}
                    className={`w-full p-4 text-left border-2 transition-all ${
                      showResult
                        ? option === currentWord.definition
                          ? 'border-green-500 bg-green-900 text-green-100'
                          : option === selectedAnswer
                            ? 'border-red-500 bg-red-900 text-red-100'
                            : 'border-gray-600 bg-gray-800'
                        : 'border-white bg-black hover:bg-gray-900'
                    }`}
                  >
                    {String.fromCharCode(65 + index)}. {option}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Phase 2: Gap-filling with choices */}
          {session.current_phase === 2 && (
            <div>
              <div className="text-center mb-8">
                <h3 className="text-xl font-bold mb-4">WELK WOORD HOORT HIER?</h3>
                <div className="text-xl p-4 border border-white bg-gray-900">
                  {renderSentenceWithGap(currentWord.example_sentence, currentWord.base_form)}
                </div>
              </div>

              <div className="space-y-3">
                {answerOptions.map((option, index) => (
                  <button
                    key={index}
                    onClick={() => handleGapFillingAnswer(option)}
                    disabled={showResult}
                    className={`w-full p-4 text-center border-2 font-bold transition-all ${
                      showResult
                        ? option === currentWord.base_form
                          ? 'border-green-500 bg-green-900 text-green-100'
                          : option === selectedAnswer
                            ? 'border-red-500 bg-red-900 text-red-100'
                            : 'border-gray-600 bg-gray-800'
                        : 'border-white bg-black hover:bg-gray-900'
                    }`}
                  >
                    {option}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Phase 3: Autocorrect typing */}
          {session.current_phase === 3 && (
            <div>
              <div className="text-center mb-8">
                <h3 className="text-xl font-bold mb-4">TYP HET JUISTE WOORD</h3>
                <div className="text-xl p-4 border border-white bg-gray-900">
                  {renderSentenceWithGap(currentWord.example_sentence, currentWord.base_form)}
                </div>
              </div>

              {!showResult ? (
                <div className="space-y-4">
                  <input
                    ref={inputRef}
                    type="text"
                    value={typedAnswer}
                    onChange={handleTypingInput}
                    onKeyPress={(e) => e.key === 'Enter' && handleTypingSubmit()}
                    placeholder="Typ hier het woord..."
                    className="retro-input w-full p-4 text-lg text-center"
                    autoFocus
                  />

                  <button
                    onClick={handleTypingSubmit}
                    disabled={typedAnswer.length === 0}
                    className="retro-button w-full"
                  >
                    CONTROLEER
                  </button>

                  {autocorrectApplied && (
                    <div className="text-center text-sm text-yellow-400">
                      💡 Autocorrectie toegepast - blijf typen!
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center">
                  <div className={`p-4 border-2 text-lg font-bold ${
                    isCorrect
                      ? 'border-green-500 bg-green-900 text-green-100'
                      : 'border-red-500 bg-red-900 text-red-100'
                  }`}>
                    {isCorrect ? '✓ JUIST!' : '✗ FOUT'}
                  </div>

                  {!isCorrect && (
                    <div className="mt-4 p-4 border border-white bg-gray-900">
                      <div className="text-sm mb-2">Het juiste woord was:</div>
                      <div className="text-xl font-bold">{currentWord.base_form}</div>
                      {autocorrectApplied && (
                        <div className="text-sm text-yellow-400 mt-2">
                          Je originele antwoord: "{originalTypedAnswer}"
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Next button */}
          {showResult && (
            <div className="text-center mt-8">
              <button
                onClick={nextWord}
                className="retro-button text-lg px-8 py-3"
              >
                {currentWordIndex + 1 >= words.length ? 'VOLTOOIEN' : 'VOLGENDE'}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}