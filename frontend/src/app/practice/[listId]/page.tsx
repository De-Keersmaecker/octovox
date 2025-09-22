'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { ArrowLeft, Pause, Play } from 'lucide-react'

interface Word {
  id: string
  base_form: string
  definition: string
  example_sentence: string
}

interface WordStatus {
  word_id: string
  status: 'unseen' | 'green' | 'orange'
  attempt_count?: number
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
  const timeoutRef = useRef<NodeJS.Timeout>()

  const [session, setSession] = useState<Session | null>(null)
  const [battery, setBattery] = useState<Battery | null>(null)
  const [words, setWords] = useState<Word[]>([])
  const [currentWordIndex, setCurrentWordIndex] = useState(0)
  const [wordStatuses, setWordStatuses] = useState<{[key: string]: 'white' | 'green' | 'orange' | 'red'}>({})
  const [showFeedback, setShowFeedback] = useState(false)
  const [isCorrect, setIsCorrect] = useState(false)
  const [selectedAnswer, setSelectedAnswer] = useState('')
  const [typedAnswer, setTypedAnswer] = useState('')
  const [originalTypedAnswer, setOriginalTypedAnswer] = useState('')
  const [autocorrectApplied, setAutocorrectApplied] = useState(false)
  const [loading, setLoading] = useState(true)
  const [answerOptions, setAnswerOptions] = useState<string[]>([])
  const [wordQueue, setWordQueue] = useState<string[]>([])
  const [isPaused, setIsPaused] = useState(false)
  const [answersDisabled, setAnswersDisabled] = useState(false)
  const [isFirstRound, setIsFirstRound] = useState(true)
  const [roundWordIndex, setRoundWordIndex] = useState(0)

  useEffect(() => {
    initializeSession()
  }, [listId])

  useEffect(() => {
    if (words.length > 0 && currentWordIndex >= 0) {
      generateAnswerOptions()
    }
  }, [currentWordIndex, words])

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
    }
  }, [])

  useEffect(() => {
    // Auto-focus typing input in Phase 3
    if (session?.current_phase === 3 && inputRef.current && !showFeedback) {
      inputRef.current.focus()
    }
  }, [session?.current_phase, currentWordIndex, showFeedback])

  const initializeSession = async () => {
    try {
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

      // Initialize word statuses
      const initialStatuses: {[key: string]: 'white'} = {}
      batteryData.words.forEach((word: Word) => {
        initialStatuses[word.id] = 'white'
      })
      setWordStatuses(initialStatuses)

      // Reset round tracking
      setIsFirstRound(true)
      setRoundWordIndex(0)
      setCurrentWordIndex(0)
      setWordQueue([])

      setLoading(false)
    } catch (error) {
      console.error('Failed to initialize session:', error)
      alert('Failed to load practice session. Please try again.')
      router.push('/dashboard')
    }
  }

  const generateAnswerOptions = () => {
    if (!session || !words || words.length === 0) return

    const currentWord = words[currentWordIndex]
    if (!currentWord) return

    if (session.current_phase === 1) {
      // Phase 1: Show all definitions
      setAnswerOptions(words.map(w => w.definition).sort(() => Math.random() - 0.5))
    } else if (session.current_phase === 2) {
      // Phase 2: Show all words
      setAnswerOptions(words.map(w => w.base_form).sort(() => Math.random() - 0.5))
    }
  }

  const handleAnswerPhase3 = async (wasCorrect: boolean) => {
    const currentWord = words[currentWordIndex]
    if (!currentWord || answersDisabled || showFeedback) return

    setAnswersDisabled(true)
    setIsCorrect(wasCorrect)
    setSelectedAnswer(typedAnswer)

    // Show immediate feedback
    setShowFeedback(true)
    console.log('Phase 3 evaluation:', wasCorrect ? 'correct' : 'incorrect')
    setWordStatuses(prev => ({
      ...prev,
      [currentWord.id]: wasCorrect ? 'green' : 'red'
    }))

    playFeedbackSound(wasCorrect)
    await submitAttempt(currentWord.id, wasCorrect, typedAnswer)

    // After 3 seconds, move to next word
    timeoutRef.current = setTimeout(() => {
      // If incorrect, change red to orange
      if (!wasCorrect) {
        setWordStatuses(prev => ({
          ...prev,
          [currentWord.id]: 'orange'
        }))
      }
      // Green stays green

      moveToNextWord(wasCorrect)
    }, 3000)
  }

  const handleAnswer = async (answer: string, phase: number) => {
    if (answersDisabled || showFeedback) return

    const currentWord = words[currentWordIndex]
    if (!currentWord) return

    setAnswersDisabled(true)

    let correct = false
    if (phase === 1) {
      correct = answer === currentWord.definition
    } else if (phase === 2) {
      correct = answer === currentWord.base_form
    } else if (phase === 3) {
      // For typing phase: correct only if the original typed answer matches exactly (no autocorrect needed)
      correct = originalTypedAnswer.toLowerCase() === currentWord.base_form.toLowerCase()
    }

    setIsCorrect(correct)
    setSelectedAnswer(answer)

    // Show immediate feedback
    setShowFeedback(true)
    console.log('Setting word status:', currentWord.id, 'to', correct ? 'green' : 'red')
    setWordStatuses(prev => {
      const newStatus = correct ? 'green' : 'red'
      console.log('Previous statuses:', prev)
      console.log('New status for', currentWord.id, ':', newStatus)
      return {
        ...prev,
        [currentWord.id]: newStatus
      }
    })

    playFeedbackSound(correct)
    await submitAttempt(currentWord.id, correct, answer)

    // After 3 seconds, move to next word
    timeoutRef.current = setTimeout(() => {
      // If incorrect, change red to orange
      if (!correct) {
        setWordStatuses(prev => ({
          ...prev,
          [currentWord.id]: 'orange'
        }))
      }
      // Green stays green

      moveToNextWord(correct)
    }, 3000)
  }

  const moveToNextWord = (wasCorrect: boolean) => {
    setShowFeedback(false)
    setAnswersDisabled(false)
    resetCurrentWord()

    const currentWord = words[currentWordIndex]

    if (isFirstRound) {
      // First round: go through all 5 words once
      if (roundWordIndex < words.length - 1) {
        // Move to next word in first round
        setRoundWordIndex(prev => prev + 1)
        setCurrentWordIndex(prev => prev + 1)
      } else {
        // First round complete, build queue of orange words
        setIsFirstRound(false)
        const orangeWords: string[] = []
        words.forEach(w => {
          if (wordStatuses[w.id] === 'orange') {
            orangeWords.push(w.id)
          }
        })

        if (orangeWords.length === 0) {
          // All green in first round! Check if we should go to next phase
          checkPhaseProgression()
        } else {
          // Start repeating orange words
          setWordQueue(orangeWords)
          const firstOrangeIndex = words.findIndex(w => w.id === orangeWords[0])
          setCurrentWordIndex(firstOrangeIndex)
        }
      }
    } else {
      // Repetition rounds: only practice orange words
      if (!wasCorrect) {
        // Word stays orange, add to end of queue
        setWordQueue(prev => [...prev.filter(id => id !== currentWord.id), currentWord.id])
      } else {
        // Word is now green, remove from queue
        setWordQueue(prev => prev.filter(id => id !== currentWord.id))
      }

      // Check if all words are green
      const newQueue = wordQueue.filter(id => id !== currentWord.id || !wasCorrect)

      if (newQueue.length === 0) {
        // All words are green!
        checkPhaseProgression()
      } else {
        // Move to next orange word
        const nextWordId = newQueue[0]
        const nextIndex = words.findIndex(w => w.id === nextWordId)
        setCurrentWordIndex(nextIndex)
        setWordQueue(newQueue)
      }
    }
  }

  const checkPhaseProgression = async () => {
    if (!session) return

    try {
      if (session.current_phase < 3) {
        // Move to next phase with same words
        await fetch(`${process.env.NEXT_PUBLIC_API_URL}/learning/session/next-phase`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            sessionId: session.id
          })
        })

        // Reload session to get next phase
        initializeSession()
      } else {
        // Phase 3 complete, check if all words in list are done
        completeBattery()
      }
    } catch (error) {
      console.error('Failed to progress phase:', error)
    }
  }

  const completeBattery = async () => {
    try {
      await fetch(`${process.env.NEXT_PUBLIC_API_URL}/learning/battery/complete`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          sessionId: session?.id,
          batteryId: battery?.id
        })
      })

      // Load next battery or complete phase
      initializeSession()
    } catch (error) {
      console.error('Failed to complete battery:', error)
    }
  }

  const resetCurrentWord = () => {
    setSelectedAnswer('')
    setTypedAnswer('')
    setOriginalTypedAnswer('')
    setAutocorrectApplied(false)
    setIsCorrect(false)
  }

  const submitAttempt = async (wordId: string, correct: boolean, response: string) => {
    if (!session) return

    try {
      await fetch(`${process.env.NEXT_PUBLIC_API_URL}/learning/attempt`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          sessionId: session.id,
          wordId,
          phase: session.current_phase,
          batteryNumber: battery?.battery_number,
          isCorrect: correct,
          responseGiven: response,
          autocorrectApplied: session.current_phase === 3 ? autocorrectApplied : false
        })
      })
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

    if (navigator.vibrate) {
      navigator.vibrate(correct ? [100] : [100, 50, 100])
    }
  }

  const playAutocorrectSound = () => {
    if (typeof window !== 'undefined' && window.AudioContext) {
      const audioContext = new window.AudioContext()
      const oscillator = audioContext.createOscillator()
      const gainNode = audioContext.createGain()

      oscillator.connect(gainNode)
      gainNode.connect(audioContext.destination)

      // Short negative sound for autocorrect
      oscillator.frequency.setValueAtTime(200, audioContext.currentTime)
      gainNode.gain.setValueAtTime(0.2, audioContext.currentTime)
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.1)

      oscillator.start(audioContext.currentTime)
      oscillator.stop(audioContext.currentTime + 0.1)
    }

    if (navigator.vibrate) {
      navigator.vibrate([50])
    }
  }

  const handleTypingInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const currentWord = words[currentWordIndex]
    if (!currentWord || showFeedback) return

    const input = e.target.value
    const targetWord = currentWord.base_form

    let correctedValue = ''
    let hadAutocorrection = false

    for (let i = 0; i < input.length; i++) {
      const typedChar = input[i]
      const targetChar = targetWord[i]

      if (targetChar && typedChar !== targetChar) {
        correctedValue += targetChar
        hadAutocorrection = true

        // Play negative sound for each autocorrected letter
        playAutocorrectSound()

        // Set evaluation to red immediately when autocorrect happens
        setAutocorrectApplied(true)
        setWordStatuses(prev => ({
          ...prev,
          [currentWord.id]: 'red'
        }))
      } else {
        correctedValue += typedChar
      }
    }

    setOriginalTypedAnswer(input)
    setTypedAnswer(correctedValue)

    // Check if word is complete
    if (correctedValue.length === targetWord.length && correctedValue.toLowerCase() === targetWord.toLowerCase()) {
      // Word is complete - automatically submit
      // Correct only if: original input matches exactly AND no autocorrection was applied
      const wasCorrect = input.toLowerCase() === targetWord.toLowerCase() && !autocorrectApplied
      console.log('Phase 3 completion check:', {
        originalInput: input,
        targetWord: targetWord,
        inputMatches: input.toLowerCase() === targetWord.toLowerCase(),
        autocorrectApplied: autocorrectApplied,
        finalResult: wasCorrect
      })
      handleAnswerPhase3(wasCorrect)
    }
  }

  const handleTypingSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!typedAnswer || showFeedback) return
    handleAnswer(typedAnswer, 3)
  }

  const renderSentenceWithGap = (sentence: string, wordToReplace: string) => {
    const regex = new RegExp(`\\b${wordToReplace}\\b`, 'gi')
    const parts = sentence.split(regex)

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

  const togglePause = async () => {
    setIsPaused(!isPaused)
    if (session) {
      try {
        await fetch(`${process.env.NEXT_PUBLIC_API_URL}/learning/session/pause`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            sessionId: session.id,
            paused: !isPaused
          })
        })
      } catch (error) {
        console.error('Failed to pause session:', error)
      }
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-2xl font-mono">SESSIE LADEN...</div>
      </div>
    )
  }

  if (!session || !battery || words.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-2xl font-mono">SESSIE FOUT</div>
      </div>
    )
  }

  const currentWord = words[currentWordIndex]
  const phaseName = {
    1: 'Context Begrijpen',
    2: 'Woord Plaatsen',
    3: 'Woord Typen'
  }[session.current_phase] || 'Unknown'

  if (isPaused) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="retro-border p-8 text-center">
          <h2 className="text-3xl font-bold mb-4">GEPAUZEERD</h2>
          <p className="mb-6">Fase {session.current_phase} - Batterij {battery.battery_number}</p>
          <div className="flex gap-4 justify-center">
            <button
              onClick={togglePause}
              className="retro-button flex items-center gap-2"
            >
              <Play size={16} />
              HERVAT
            </button>
            <button
              onClick={() => router.push('/dashboard')}
              className="retro-button-secondary"
            >
              DASHBOARD
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen p-4">
      <div className="max-w-4xl mx-auto">
        {/* Header with progress boxes */}
        <header className="mb-6">
          <div className="flex justify-between items-center mb-4">
            <button
              onClick={() => router.push('/dashboard')}
              className="retro-button flex items-center gap-2"
            >
              <ArrowLeft size={16} />
              DASHBOARD
            </button>
            <div className="text-center">
              <div className="font-mono text-sm">FASE {session.current_phase} - {phaseName}</div>
              <div className="font-mono text-xs">Batterij {battery.battery_number}</div>
            </div>
          </div>

          {/* Progress boxes */}
          <div className="flex justify-center gap-2">
            {words.map((word) => (
              <div
                key={word.id}
                className={`w-12 h-12 border-2 border-white flex items-center justify-center font-mono ${
                  wordStatuses[word.id] === 'green' ? 'bg-green-500' :
                  wordStatuses[word.id] === 'red' ? 'bg-red-500' :
                  wordStatuses[word.id] === 'orange' ? 'bg-orange-500' :
                  'bg-black'
                }`}
              >
                {word === currentWord && !showFeedback ? '▶' : ''}
              </div>
            ))}
          </div>
        </header>

        {/* Exercise content */}
        <div className="retro-border p-6">
          {/* Example sentence in box */}
          <div className="retro-border p-4 mb-6 bg-gray-900">
            <p className="text-lg font-mono">
              {session.current_phase === 1
                ? currentWord.example_sentence
                : renderSentenceWithGap(currentWord.example_sentence, currentWord.base_form)
              }
            </p>
          </div>

          {/* Question */}
          <div className="text-center mb-6">
            <h2 className="text-xl font-bold">
              {session.current_phase === 1 && `Wat betekent het woord '${currentWord.base_form}'?`}
              {session.current_phase === 2 && 'Welk woord hoort hier?'}
              {session.current_phase === 3 && 'Typ het ontbrekende woord:'}
            </h2>
          </div>

          {/* Answer options for Phase 1 and 2 */}
          {(session.current_phase === 1 || session.current_phase === 2) && (
            <div className="space-y-3">
              {answerOptions.map((option, index) => (
                <button
                  key={index}
                  onClick={() => handleAnswer(option, session.current_phase)}
                  disabled={answersDisabled}
                  className={`w-full p-4 text-left font-mono transition-colors
                    ${showFeedback && selectedAnswer === option
                      ? isCorrect
                        ? 'bg-green-500 text-black'
                        : 'bg-red-500 text-white'
                      : showFeedback && option === (session.current_phase === 1 ? currentWord.definition : currentWord.base_form)
                        ? 'bg-green-500 text-black'
                        : 'retro-button'
                    }
                    ${answersDisabled ? 'opacity-50 cursor-not-allowed' : ''}
                  `}
                >
                  {option}
                </button>
              ))}
            </div>
          )}

          {/* Typing input for Phase 3 */}
          {session.current_phase === 3 && (
            <div className="space-y-4">
              <input
                ref={inputRef}
                type="text"
                value={typedAnswer}
                onChange={handleTypingInput}
                disabled={showFeedback}
                className={`w-full p-4 retro-input text-center text-xl font-mono
                  ${showFeedback
                    ? isCorrect
                      ? 'bg-green-500 text-black'
                      : 'bg-red-500 text-white'
                    : ''
                  }
                  ${autocorrectApplied && !showFeedback ? 'text-red-400' : ''}
                `}
                placeholder="Type hier..."
                autoFocus
              />
            </div>
          )}

          {/* Feedback message */}
          {showFeedback && (
            <div className={`text-center mt-4 text-xl font-bold ${isCorrect ? 'text-green-500' : 'text-red-500'}`}>
              {isCorrect ? '✓ JUIST!' : '✗ FOUT'}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}