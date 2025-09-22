'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { learning } from '@/lib/api'
import { LogOut, Play, BookOpen } from 'lucide-react'

interface WordList {
  id: string
  title: string
  theme: string
  total_words: number
  active_words: number
}

export default function Dashboard() {
  const [wordLists, setWordLists] = useState<WordList[]>([])
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

    fetchWordLists()
  }, [router])

  const fetchWordLists = async () => {
    try {
      // Fetch available word lists
      const listsResponse = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/learning/word-lists`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      })

      if (listsResponse.ok) {
        const listsData = await listsResponse.json()
        setWordLists(listsData.wordLists || [])
      }
    } catch (error) {
      console.error('Failed to fetch data:', error)
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
            <p className="text-lg">Welkom terug, {user?.name}</p>
            {user?.class_code && (
              <p className="text-sm opacity-75">Klas: {user.class_code}</p>
            )}
          </div>
          <button
            onClick={handleLogout}
            className="retro-button flex items-center gap-2"
          >
            <LogOut size={16} />
            UITLOGGEN
          </button>
        </header>

        <div className="retro-border p-6">
          <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
            <BookOpen size={24} />
            Beschikbare Woordenlijsten
          </h2>

          {wordLists.length === 0 ? (
            <div className="text-center py-12">
              <BookOpen size={64} className="mx-auto mb-4 opacity-30" />
              <h3 className="text-xl font-bold mb-2">Nog geen woordenlijsten beschikbaar</h3>
              <p className="text-lg mb-2">Er zijn nog geen woordenlijsten toegewezen aan jouw klas.</p>
              <p className="text-sm opacity-75">Neem contact op met je leraar om woordenlijsten toegewezen te krijgen!</p>
            </div>
          ) : (
            <div className="grid gap-4">
              {wordLists.map((list) => (
                <div key={list.id} className="retro-border p-6 bg-gray-900 hover:bg-gray-800 transition-colors">
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex-1">
                      <h3 className="text-2xl font-bold mb-2">{list.title}</h3>
                      {list.theme && (
                        <p className="text-lg opacity-75 mb-2">📚 Thema: {list.theme}</p>
                      )}
                      <div className="flex gap-4 text-sm opacity-75">
                        <span>✨ {list.active_words} actieve woorden</span>
                        <span>📝 {list.total_words} totaal</span>
                      </div>
                    </div>
                    <button
                      onClick={() => startPractice(list.id)}
                      className="retro-button bg-green-600 hover:bg-green-700 flex items-center gap-2 text-lg px-6 py-3"
                    >
                      <Play size={20} />
                      START OEFENING
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {wordLists.length > 0 && (
          <div className="mt-8 retro-border p-6 bg-gray-900">
            <h3 className="text-xl font-bold mb-4">🎯 Tips voor Effectief Oefenen</h3>
            <div className="grid md:grid-cols-2 gap-4 text-sm">
              <div className="space-y-2">
                <p>• Oefen regelmatig, liefst dagelijks</p>
                <p>• Focus op de woorden die je moeilijk vindt</p>
                <p>• Probeer de woorden in zinnen te gebruiken</p>
              </div>
              <div className="space-y-2">
                <p>• Herhaal moeilijke woorden meerdere keren</p>
                <p>• Oefen zowel de betekenis als de spelling</p>
                <p>• Vraag hulp aan je leraar bij twijfels</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}