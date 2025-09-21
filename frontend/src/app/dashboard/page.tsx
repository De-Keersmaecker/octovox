'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { learning } from '@/lib/api'
import { LogOut, Play, BookOpen } from 'lucide-react'

interface ProgressItem {
  listId: string
  title: string
  totalWords: number
  masteredWords: number
  learningWords: number
  unseenWords: number
  progressPercentage: number
}

export default function Dashboard() {
  const [progress, setProgress] = useState<ProgressItem[]>([])
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState<any>(null)
  const router = useRouter()

  useEffect(() => {
    const userData = localStorage.getItem('user')
    if (!userData) {
      router.push('/login')
      return
    }

    const parsedUser = JSON.parse(userData)
    setUser(parsedUser)

    if (parsedUser.role !== 'student') {
      router.push('/login')
      return
    }

    fetchProgress()
  }, [router])

  const fetchProgress = async () => {
    try {
      const response = await learning.getProgress()
      setProgress(response.data.progress)
    } catch (error) {
      console.error('Failed to fetch progress:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleLogout = () => {
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    router.push('/login')
  }

  const startPractice = (listId: string) => {
    router.push(`/practice/${listId}`)
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-2xl font-mono">LOADING...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen p-4">
      <div className="max-w-4xl mx-auto">
        <header className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-4xl font-bold mb-2">OCTOVOX</h1>
            <p className="text-lg">Welcome back, {user?.name}</p>
          </div>
          <button
            onClick={handleLogout}
            className="retro-button flex items-center gap-2"
          >
            <LogOut size={16} />
            LOGOUT
          </button>
        </header>

        <div className="grid gap-6">
          <div className="retro-border p-6">
            <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
              <BookOpen size={24} />
              YOUR WORD LISTS
            </h2>

            {progress.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-lg mb-4">No word lists assigned yet.</p>
                <p className="text-sm opacity-75">Contact your teacher to get started!</p>
              </div>
            ) : (
              <div className="space-y-4">
                {progress.map((item) => (
                  <div key={item.listId} className="border border-white p-4 bg-black">
                    <div className="flex justify-between items-start mb-3">
                      <h3 className="text-xl font-bold">{item.title}</h3>
                      <button
                        onClick={() => startPractice(item.listId)}
                        className="retro-button flex items-center gap-2 text-sm"
                      >
                        <Play size={14} />
                        {item.masteredWords === 0 ? 'START' : 'CONTINUE'}
                      </button>
                    </div>

                    <div className="mb-3">
                      <div className="flex justify-between text-sm mb-1">
                        <span>Progress</span>
                        <span>{item.masteredWords}/{item.totalWords} words</span>
                      </div>
                      <div className="w-full bg-gray-800 border border-white">
                        <div
                          className="bg-white h-2"
                          style={{ width: `${item.progressPercentage}%` }}
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-4 text-sm">
                      <div className="text-center">
                        <div className="text-lg font-bold text-green-400">
                          {item.masteredWords}
                        </div>
                        <div>Mastered</div>
                      </div>
                      <div className="text-center">
                        <div className="text-lg font-bold text-yellow-400">
                          {item.learningWords}
                        </div>
                        <div>Learning</div>
                      </div>
                      <div className="text-center">
                        <div className="text-lg font-bold text-gray-400">
                          {item.unseenWords}
                        </div>
                        <div>New</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}