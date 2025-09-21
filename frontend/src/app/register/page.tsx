'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { auth } from '@/lib/api'
import Link from 'next/link'

export default function Register() {
  const [email, setEmail] = useState('')
  const [name, setName] = useState('')
  const [password, setPassword] = useState('')
  const [classCode, setClassCode] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const response = await auth.register(email, name, password, classCode)
      const { token, user } = response.data

      localStorage.setItem('token', token)
      localStorage.setItem('user', JSON.stringify(user))

      router.push('/dashboard')
    } catch (err: any) {
      setError(err.response?.data?.error || 'Registration failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-6xl font-bold mb-2">OCTOVOX</h1>
          <p className="text-lg">Create Your Account</p>
        </div>

        <div className="retro-border p-6 bg-black">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-bold mb-2">NAME</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="retro-input w-full p-3"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-bold mb-2">EMAIL</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="retro-input w-full p-3"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-bold mb-2">PASSWORD</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="retro-input w-full p-3"
                placeholder="Minimum 6 characters"
                minLength={6}
                required
              />
            </div>

            <div>
              <label className="block text-sm font-bold mb-2">CLASS CODE</label>
              <input
                type="text"
                value={classCode}
                onChange={(e) => setClassCode(e.target.value.toUpperCase())}
                className="retro-input w-full p-3"
                placeholder="e.g. KL3A2024"
                maxLength={10}
                required
              />
              <p className="text-xs mt-1 opacity-75">
                Get this code from your teacher
              </p>
            </div>

            {error && (
              <div className="text-red-500 font-mono text-sm">{error}</div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="retro-button w-full"
            >
              {loading ? 'REGISTERING...' : 'REGISTER'}
            </button>
          </form>

          <div className="mt-6 text-center">
            <Link
              href="/login"
              className="text-white hover:underline font-mono"
            >
              Already have an account? Login here
            </Link>
          </div>
        </div>

        <div className="mt-6 p-4 border border-gray-600 bg-gray-900">
          <p className="text-sm font-bold mb-2">TEST CLASS CODES:</p>
          <ul className="text-xs space-y-1">
            <li>• KL3A2024 - Dutch & Sports vocabulary</li>
            <li>• KL3B2024 - Dutch & English vocabulary</li>
          </ul>
        </div>
      </div>
    </div>
  )
}