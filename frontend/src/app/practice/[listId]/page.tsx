'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { learning } from '@/lib/api'
import { ArrowLeft, Volume2 } from 'lucide-react'

interface Word {
  id: string
  baseForm: string
  definition: string
  exampleSentence: string
}

interface PracticeResult {
  wordId: string
  isCorrect: boolean
}

export default function Practice() {
  const router = useRouter()
  const params = useParams()
  const listId = params.listId as string

  const [words, setWords] = useState<Word[]>([])
  const [currentWordIndex, setCurrentWordIndex] = useState(0)
  const [userAnswer, setUserAnswer] = useState('')
  const [showResult, setShowResult] = useState(false)
  const [isCorrect, setIsCorrect] = useState(false)
  const [results, setResults] = useState<PracticeResult[]>([])
  const [loading, setLoading] = useState(true)
  const [sessionComplete, setSessionComplete] = useState(false)
  const [showDefinition, setShowDefinition] = useState(true)

  useEffect(() => {
    fetchPracticeWords()
  }, [listId])

  const fetchPracticeWords = async () => {
    try {
      const response = await learning.getPracticeWords(listId)
      if (response.data.words.length === 0) {
        alert('No words available for practice at this time.')
        router.push('/dashboard')
        return
      }
      setWords(response.data.words)
    } catch (error) {
      console.error('Failed to fetch practice words:', error)
      alert('Failed to load practice words. Please try again.')
      router.push('/dashboard')
    } finally {
      setLoading(false)
    }
  }

  const checkAnswer = () => {
    if (!userAnswer.trim()) return

    const currentWord = words[currentWordIndex]
    const correct = userAnswer.toLowerCase().trim() === currentWord.baseForm.toLowerCase().trim()

    setIsCorrect(correct)
    setShowResult(true)

    // Add result to collection
    const result: PracticeResult = {
      wordId: currentWord.id,
      isCorrect: correct
    }
    setResults(prev => [...prev, result])

    // Play audio feedback (simple beep simulation)
    if (correct) {
      playSuccessSound()
    } else {
      playErrorSound()
    }

    // Haptic feedback for mobile
    if (navigator.vibrate) {
      navigator.vibrate(correct ? [100] : [100, 50, 100])
    }
  }

  const playSuccessSound = () => {
    if (typeof window !== 'undefined' && window.AudioContext) {
      const audioContext = new window.AudioContext()
      const oscillator = audioContext.createOscillator()
      const gainNode = audioContext.createGain()

      oscillator.connect(gainNode)
      gainNode.connect(audioContext.destination)

      oscillator.frequency.setValueAtTime(800, audioContext.currentTime)
      oscillator.frequency.setValueAtTime(1000, audioContext.currentTime + 0.1)
      gainNode.gain.setValueAtTime(0.3, audioContext.currentTime)
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.2)

      oscillator.start(audioContext.currentTime)
      oscillator.stop(audioContext.currentTime + 0.2)
    }
  }

  const playErrorSound = () => {
    if (typeof window !== 'undefined' && window.AudioContext) {
      const audioContext = new window.AudioContext()
      const oscillator = audioContext.createOscillator()
      const gainNode = audioContext.createGain()

      oscillator.connect(gainNode)
      gainNode.connect(audioContext.destination)

      oscillator.frequency.setValueAtTime(300, audioContext.currentTime)
      oscillator.frequency.setValueAtTime(200, audioContext.currentTime + 0.1)
      gainNode.gain.setValueAtTime(0.3, audioContext.currentTime)
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3)

      oscillator.start(audioContext.currentTime)
      oscillator.stop(audioContext.currentTime + 0.3)
    }
  }

  const nextWord = () => {
    if (currentWordIndex + 1 >= words.length) {
      // Session complete, submit results
      submitResults()
    } else {
      setCurrentWordIndex(prev => prev + 1)
      setUserAnswer('')
      setShowResult(false)
      setShowDefinition(true)
    }
  }

  const submitResults = async () => {
    try {
      await learning.submitResults(results)
      setSessionComplete(true)
    } catch (error) {
      console.error('Failed to submit results:', error)
      alert('Failed to save your progress. Please try again.')
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !showResult) {
      checkAnswer()
    } else if (e.key === 'Enter' && showResult) {
      nextWord()
    }
  }

  const toggleMode = () => {
    setShowDefinition(!showDefinition)
    setUserAnswer('')
    setShowResult(false)
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-2xl font-mono">LOADING PRACTICE SESSION...</div>
      </div>
    )
  }

  if (sessionComplete) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <div className="retro-border p-6 bg-black text-center">
            <h1 className="text-3xl font-bold mb-4">SESSION COMPLETE!</h1>

            <div className="mb-6">
              <div className="text-6xl font-bold mb-2">
                {Math.round((results.filter(r => r.isCorrect).length / results.length) * 100)}%
              </div>
              <div className="text-lg">ACCURACY</div>
            </div>

            <div className="grid grid-cols-2 gap-4 mb-6 text-sm">
              <div className="border border-white p-3">
                <div className="text-2xl font-bold text-green-400">
                  {results.filter(r => r.isCorrect).length}
                </div>
                <div>CORRECT</div>
              </div>
              <div className="border border-white p-3">
                <div className="text-2xl font-bold text-red-400">
                  {results.filter(r => !r.isCorrect).length}
                </div>
                <div>INCORRECT</div>
              </div>
            </div>

            <div className="mb-6 p-4 border border-white bg-gray-900">
              <p className="text-sm font-bold mb-2">💪 GREAT WORK!</p>
              <p className="text-xs">
                {results.filter(r => r.isCorrect).length === results.length
                  ? "Perfect score! You're mastering these words!"
                  : "Keep practicing to improve your accuracy. Every attempt makes you stronger!"
                }
              </p>
            </div>

            <button
              onClick={() => router.push('/dashboard')}
              className="retro-button w-full"
            >
              BACK TO DASHBOARD
            </button>
          </div>
        </div>
      </div>
    )
  }

  const currentWord = words[currentWordIndex]
  const progress = ((currentWordIndex + 1) / words.length) * 100

  return (
    <div className="min-h-screen p-4">
      <div className="max-w-2xl mx-auto">
        <header className="flex justify-between items-center mb-6">
          <button
            onClick={() => router.push('/dashboard')}
            className="retro-button flex items-center gap-2"
          >
            <ArrowLeft size={16} />
            BACK
          </button>

          <div className="text-sm font-mono">
            {currentWordIndex + 1} / {words.length}
          </div>
        </header>

        {/* Progress Bar */}
        <div className="mb-8">
          <div className="w-full bg-gray-800 border border-white h-4">
            <div
              className="bg-white h-full transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        <div className="retro-border p-8 bg-black">
          {/* Mode Toggle */}
          <div className="flex justify-center mb-6">
            <div className="flex border border-white">
              <button
                onClick={() => setShowDefinition(true)}
                className={`px-4 py-2 font-mono font-bold ${
                  showDefinition ? 'bg-white text-black' : 'bg-black text-white'
                }`}
              >
                DEFINITION → WORD
              </button>
              <button
                onClick={() => setShowDefinition(false)}
                className={`px-4 py-2 font-mono font-bold ${
                  !showDefinition ? 'bg-white text-black' : 'bg-black text-white'
                }`}
              >
                WORD → DEFINITION
              </button>
            </div>
          </div>

          {/* Question */}
          <div className="text-center mb-8">
            <div className="text-sm mb-2 opacity-75">
              {showDefinition ? 'What word matches this definition?' : 'What does this word mean?'}
            </div>

            <div className="text-2xl font-bold mb-4 p-4 border border-white bg-gray-900">
              {showDefinition ? currentWord.definition : currentWord.baseForm}
            </div>

            {currentWord.exampleSentence && (
              <div className="text-sm italic opacity-75">
                Example: "{currentWord.exampleSentence}"
              </div>
            )}
          </div>

          {/* Answer Input */}
          {!showResult ? (
            <div className="mb-6">
              <input
                type="text"
                value={userAnswer}
                onChange={(e) => setUserAnswer(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder={showDefinition ? "Type the word..." : "Type the definition..."}
                className="retro-input w-full p-4 text-lg text-center"
                autoFocus
              />

              <button
                onClick={checkAnswer}
                disabled={!userAnswer.trim()}
                className="retro-button w-full mt-4"
              >
                CHECK ANSWER
              </button>
            </div>
          ) : (
            <div className="mb-6">
              {/* Result Display */}
              <div className={`p-4 border-2 text-center text-lg font-bold ${
                isCorrect
                  ? 'border-green-400 bg-green-900 text-green-100'
                  : 'border-red-400 bg-red-900 text-red-100'
              }`}>
                {isCorrect ? '✓ CORRECT!' : '✗ INCORRECT'}
              </div>

              {!isCorrect && (
                <div className="mt-4 p-4 border border-white bg-gray-900 text-center">
                  <div className="text-sm mb-2">The correct answer was:</div>
                  <div className="text-xl font-bold">
                    {showDefinition ? currentWord.baseForm : currentWord.definition}
                  </div>
                </div>
              )}

              <button
                onClick={nextWord}
                className="retro-button w-full mt-4"
              >
                {currentWordIndex + 1 >= words.length ? 'FINISH SESSION' : 'NEXT WORD'}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}