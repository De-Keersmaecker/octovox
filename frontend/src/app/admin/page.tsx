'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export default function AdminLogin() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/auth/admin-login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Login failed')
      }

      const { token, user } = data
      localStorage.setItem('token', token)
      localStorage.setItem('user', JSON.stringify(user))

      router.push('/admin/dashboard')
    } catch (err: any) {
      setError(err.message || 'Administrator login failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-6xl font-bold mb-2">OCTOVOX</h1>
          <p className="text-lg">Administrator Toegang</p>
        </div>

        <div className="retro-border p-6 bg-black">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-bold mb-2">EMAIL</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="retro-input w-full p-3"
                required
                autoFocus
              />
            </div>

            <div>
              <label className="block text-sm font-bold mb-2">WACHTWOORD</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="retro-input w-full p-3"
                required
              />
            </div>

            {error && (
              <div className="text-red-500 font-mono text-sm">{error}</div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="retro-button w-full"
            >
              {loading ? 'INLOGGEN...' : 'ADMINISTRATOR INLOGGEN'}
            </button>
          </form>

          <div className="mt-6 text-center">
            <Link
              href="/login"
              className="text-white hover:underline font-mono text-sm"
            >
              ← Terug naar normale login
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}