'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

export default function DevLogin() {
  const router = useRouter()
  const [error, setError] = useState('')
  const [showSetup, setShowSetup] = useState(false)
  const [setupLoading, setSetupLoading] = useState(false)
  const [setupResult, setSetupResult] = useState<any>(null)

  useEffect(() => {
    const setupDevMode = async () => {
      try {
        // Call dev login endpoint
        const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/auth/dev-login`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            email: 'jelledekeersmaecker@gmail.com'
          })
        })

        if (!response.ok) {
          throw new Error('Dev login failed')
        }

        const data = await response.json()

        // Store token and user data
        localStorage.setItem('token', data.token)
        localStorage.setItem('user', JSON.stringify(data.user))

        // Redirect to admin dashboard
        router.push('/admin/dashboard')
      } catch (err) {
        console.error('Dev login error:', err)
        setError('Failed to set up dev mode')

        // Fallback: set up local dev user
        const devUser = {
          id: 'dev-user',
          email: 'jelledekeersmaecker@gmail.com',
          name: 'Jelle De Keersmaecker',
          role: 'administrator'
        }
        localStorage.setItem('user', JSON.stringify(devUser))

        // Still redirect even with error
        setTimeout(() => router.push('/admin/dashboard'), 2000)
      }
    }

    if (!showSetup) {
      setupDevMode()
    }
  }, [router, showSetup])

  const setupTestData = async () => {
    setSetupLoading(true)
    setSetupResult(null)

    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/dev/setup-test-data`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          email: 'jelledekeersmaecker@gmail.com'
        })
      })

      const data = await response.json()

      if (response.ok) {
        setSetupResult(data)
      } else {
        setError(`Setup failed: ${data.error}`)
      }
    } catch (err) {
      setError('Failed to setup test data')
    } finally {
      setSetupLoading(false)
    }
  }

  if (showSetup) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="retro-border p-8 bg-black max-w-2xl w-full">
          <div className="text-center mb-6">
            <div className="text-4xl font-bold mb-2">OCTOVOX DEV SETUP</div>
            <p className="text-lg opacity-75">Setup test data for development</p>
          </div>

          {setupResult ? (
            <div className="text-center">
              <div className="text-2xl mb-4">✅ Setup Complete!</div>
              <div className="space-y-2 mb-6">
                <p>Test Users: {setupResult.stats.testUsers}</p>
                <p>Test Classes: {setupResult.stats.testClasses}</p>
                <p>List Assignments: {setupResult.stats.listAssignments}</p>
              </div>
              <button
                onClick={() => router.push('/admin/dashboard')}
                className="retro-button"
              >
                GO TO DASHBOARD
              </button>
            </div>
          ) : (
            <div className="text-center">
              <div className="mb-6">
                <p className="mb-4">
                  This will create test students, teachers, classes, and assign word lists.
                </p>
                <p className="text-sm opacity-75">
                  Test accounts: anna@test.com, teacher@test.com (password: student123/teacher123)
                </p>
              </div>

              {error && (
                <div className="retro-border p-4 mb-4 bg-red-900 border-red-600">
                  {error}
                </div>
              )}

              <div className="flex gap-4 justify-center">
                <button
                  onClick={setupTestData}
                  disabled={setupLoading}
                  className="retro-button bg-green-600 hover:bg-green-700"
                >
                  {setupLoading ? 'SETTING UP...' : 'SETUP TEST DATA'}
                </button>
                <button
                  onClick={() => router.push('/admin/dashboard')}
                  className="retro-button-secondary"
                >
                  SKIP SETUP
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <div className="text-6xl font-bold mb-4">OCTOVOX</div>
        <div className="text-xl">
          {error ? error : 'Setting up development mode...'}
        </div>
        {error && (
          <button
            onClick={() => setShowSetup(true)}
            className="retro-button mt-4"
          >
            MANUAL SETUP
          </button>
        )}
      </div>
    </div>
  )
}