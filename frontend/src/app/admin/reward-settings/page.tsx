'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Save, Play } from 'lucide-react'

interface RewardSettings {
  perfect_score_video_url: string
  perfect_score_message: string
}

export default function RewardSettings() {
  const [settings, setSettings] = useState<RewardSettings>({
    perfect_score_video_url: '',
    perfect_score_message: ''
  })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [showPreview, setShowPreview] = useState(false)
  const router = useRouter()

  useEffect(() => {
    const userData = localStorage.getItem('user')
    if (!userData) {
      router.push('/login')
      return
    }

    const user = JSON.parse(userData)
    if (user.role !== 'administrator') {
      router.push('/dashboard')
      return
    }

    fetchSettings()
  }, [router])

  const fetchSettings = async () => {
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/reward-settings`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      })

      if (response.ok) {
        const data = await response.json()
        setSettings({
          perfect_score_video_url: data.perfect_score_video_url || '',
          perfect_score_message: data.perfect_score_message || ''
        })
      }
    } catch (error) {
      console.error('Failed to fetch settings:', error)
    } finally {
      setLoading(false)
    }
  }

  const saveSettings = async () => {
    setSaving(true)

    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/admin/reward-settings`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(settings)
      })

      if (response.ok) {
        alert('Instellingen succesvol opgeslagen!')
      } else {
        const errorText = await response.text()
        console.error('Save error response:', errorText)
        alert('Er ging iets mis bij het opslaan. Neem contact op met de ontwikkelaar.')
      }
    } catch (error) {
      console.error('Failed to save settings:', error)
      alert('Er ging iets mis bij het opslaan.')
    } finally {
      setSaving(false)
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
      <div className="max-w-4xl mx-auto">
        <header className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.push('/admin/dashboard')}
              className="retro-button-small flex items-center gap-2"
            >
              <ArrowLeft size={16} />
              TERUG
            </button>
            <div>
              <h1 className="text-3xl font-bold">BELONING INSTELLINGEN</h1>
              <p className="text-lg opacity-75">Beheer perfect score beloningen</p>
            </div>
          </div>
        </header>

        <div className="retro-border p-6">
          <h2 className="text-2xl font-bold mb-6">Perfect Score Beloning</h2>
          <p className="text-sm opacity-75 mb-6">
            Deze beloning wordt getoond wanneer een leerling alle 4 woorden in fase 3 in één keer goed heeft.
          </p>

          <div className="space-y-6">
            <div>
              <label htmlFor="message" className="block text-sm font-bold mb-2">
                Beloningsbericht
              </label>
              <input
                id="message"
                type="text"
                value={settings.perfect_score_message}
                onChange={(e) => setSettings(prev => ({
                  ...prev,
                  perfect_score_message: e.target.value
                }))}
                className="w-full retro-input"
                placeholder="Geweldig! Je hebt alles in één keer goed! 🎉"
              />
            </div>

            <div>
              <label htmlFor="video" className="block text-sm font-bold mb-2">
                Video URL (YouTube embed)
              </label>
              <input
                id="video"
                type="url"
                value={settings.perfect_score_video_url}
                onChange={(e) => setSettings(prev => ({
                  ...prev,
                  perfect_score_video_url: e.target.value
                }))}
                className="w-full retro-input"
                placeholder="https://www.youtube.com/embed/VIDEO_ID"
              />
              <p className="text-xs opacity-75 mt-1">
                Gebruik YouTube embed URL format: https://www.youtube.com/embed/VIDEO_ID
              </p>
            </div>

            <div className="flex gap-4">
              <button
                onClick={saveSettings}
                disabled={saving}
                className="retro-button bg-green-600 hover:bg-green-700 flex items-center gap-2"
              >
                <Save size={16} />
                {saving ? 'OPSLAAN...' : 'OPSLAAN'}
              </button>

              <button
                onClick={() => setShowPreview(!showPreview)}
                className="retro-button-secondary flex items-center gap-2"
              >
                <Play size={16} />
                {showPreview ? 'VERBERG PREVIEW' : 'TOON PREVIEW'}
              </button>
            </div>
          </div>

          {/* Preview */}
          {showPreview && (
            <div className="mt-8 retro-border p-6 bg-gray-900">
              <h3 className="text-xl font-bold mb-4">Preview</h3>
              <div className="retro-border p-8 bg-black text-center">
                <div className="text-4xl mb-6">🎉</div>
                <h2 className="text-3xl font-bold mb-4 text-yellow-400">PERFECT SCORE!</h2>
                <p className="text-xl mb-6">
                  {settings.perfect_score_message || 'Geweldig! Je hebt alles in één keer goed!'}
                </p>

                {settings.perfect_score_video_url && (
                  <div className="mb-6">
                    <iframe
                      width="480"
                      height="270"
                      src={settings.perfect_score_video_url}
                      title="Beloning video preview"
                      frameBorder="0"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                      className="mx-auto retro-border"
                    ></iframe>
                  </div>
                )}

                <div className="flex gap-4 justify-center">
                  <button className="retro-button bg-green-600 hover:bg-green-700 text-xl px-8 py-4">
                    VERDER GAAN
                  </button>
                  <button className="retro-button-secondary text-xl px-8 py-4">
                    TERUG NAAR DASHBOARD
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="mt-8 retro-border p-6 bg-gray-900">
          <h3 className="text-xl font-bold mb-4">💡 Tips</h3>
          <ul className="text-sm space-y-2">
            <li>• Gebruik korte, motiverende berichten voor de beste ervaring</li>
            <li>• YouTube embed URLs zijn veilig en werken het beste</li>
            <li>• Test de preview om te zien hoe het eruitziet voor leerlingen</li>
            <li>• Zorg dat video's geschikt zijn voor de leeftijd van je leerlingen</li>
          </ul>
        </div>
      </div>
    </div>
  )
}