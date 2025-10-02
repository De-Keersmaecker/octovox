'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Eye, EyeOff } from 'lucide-react'
import { auth } from '@/lib/api'
import Link from 'next/link'

export default function Login() {
  const [isStudent, setIsStudent] = useState(true)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [teacherCode, setTeacherCode] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [showTeacherCode, setShowTeacherCode] = useState(false)
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      let response
      if (isStudent) {
        response = await auth.login(email, password)
      } else {
        response = await auth.teacherLogin(email, teacherCode)
      }

      const { token, user } = response.data
      localStorage.setItem('token', token)
      localStorage.setItem('user', JSON.stringify(user))

      if (user.role === 'student') {
        router.push('/dashboard')
      } else if (user.role === 'teacher') {
        router.push('/teacher/dashboard')
      } else if (user.role === 'administrator') {
        router.push('/admin/dashboard')
      }
    } catch (err: any) {
      setError(err.response?.data?.error || 'Login failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-6xl font-bold mb-2">OCTOVOX</h1>
          <p className="text-lg">Woordenschat Leerplatform</p>
        </div>

        <div className="retro-border p-6 bg-black">
          <div className="flex mb-6">
            <button
              type="button"
              onClick={() => setIsStudent(true)}
              className={`flex-1 py-2 px-4 font-mono font-bold uppercase ${
                isStudent ? 'bg-white text-black' : 'bg-black text-white border border-white'
              }`}
            >
              Leerling
            </button>
            <button
              type="button"
              onClick={() => setIsStudent(false)}
              className={`flex-1 py-2 px-4 font-mono font-bold uppercase ${
                !isStudent ? 'bg-white text-black' : 'bg-black text-white border border-white'
              }`}
            >
              Leraar
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
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

            {isStudent ? (
              <div>
                <label className="block text-sm font-bold mb-2">WACHTWOORD</label>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="retro-input w-full p-3 pr-12"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 hover:opacity-75"
                    aria-label={showPassword ? "Verberg wachtwoord" : "Toon wachtwoord"}
                  >
                    {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                  </button>
                </div>
              </div>
            ) : (
              <div>
                <label className="block text-sm font-bold mb-2">LERAAR CODE</label>
                <div className="relative">
                  <input
                    type={showTeacherCode ? "text" : "password"}
                    value={teacherCode}
                    onChange={(e) => setTeacherCode(e.target.value)}
                    className="retro-input w-full p-3 pr-12"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowTeacherCode(!showTeacherCode)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 hover:opacity-75"
                    aria-label={showTeacherCode ? "Verberg code" : "Toon code"}
                  >
                    {showTeacherCode ? <EyeOff size={20} /> : <Eye size={20} />}
                  </button>
                </div>
              </div>
            )}

            {error && (
              <div className="text-red-500 font-mono text-sm">{error}</div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="retro-button w-full"
            >
              {loading ? 'INLOGGEN...' : 'INLOGGEN'}
            </button>
          </form>

          {isStudent && (
            <div className="mt-6 text-center">
              <Link
                href="/register"
                className="text-white hover:underline font-mono"
              >
                Nog geen account? Registreer hier
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}