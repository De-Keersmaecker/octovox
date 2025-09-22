'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

export default function DevLogin() {
  const router = useRouter()
  const [error, setError] = useState('')

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

    setupDevMode()
  }, [router])

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <div className="text-6xl font-bold mb-4">OCTOVOX</div>
        <div className="text-xl">
          {error ? error : 'Setting up development mode...'}
        </div>
      </div>
    </div>
  )
}