'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function DevRoleSwitcher() {
  const [currentRole, setCurrentRole] = useState<string>('')
  const router = useRouter()

  useEffect(() => {
    const userData = localStorage.getItem('user')
    if (userData) {
      const user = JSON.parse(userData)
      setCurrentRole(user.role)
    }
  }, [])

  const switchRole = async (newRole: 'student' | 'teacher' | 'administrator') => {
    try {
      console.log('Switching to role:', newRole)

      // Call dev login endpoint with new role
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/auth/dev-login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          email: 'jelledekeersmaecker@gmail.com',
          role: newRole
        })
      })

      console.log('Response status:', response.status)

      if (response.ok) {
        const data = await response.json()
        console.log('Response data:', data)

        // Store new token and user data
        localStorage.setItem('token', data.token)
        localStorage.setItem('user', JSON.stringify(data.user))

        setCurrentRole(newRole)

        // Small delay to ensure state updates
        setTimeout(() => {
          // Redirect based on role
          switch (newRole) {
            case 'student':
              router.push('/dashboard')
              break
            case 'teacher':
              router.push('/teacher/dashboard')
              break
            case 'administrator':
              router.push('/admin/dashboard')
              break
          }
        }, 100)
      } else {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }))
        console.error('Failed to switch role:', response.status, errorData)
        alert(`Failed to switch role: ${errorData.message || errorData.error || 'Unknown error'}`)
      }
    } catch (error) {
      console.error('Error switching role:', error)
      alert(`Error switching role: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  // Show for specific developer email or in development mode
  if (typeof window !== 'undefined') {
    const userData = localStorage.getItem('user')
    if (userData) {
      const user = JSON.parse(userData)
      // Always show for your email
      if (user.email !== 'jelledekeersmaecker@gmail.com' && process.env.NODE_ENV === 'production') {
        return null
      }
    } else if (process.env.NODE_ENV === 'production') {
      return null
    }
  }

  return (
    <div className="fixed bottom-4 left-4 z-50 retro-border p-4 bg-black">
      <div className="text-xs font-mono mb-2 text-yellow-400">DEV MODE</div>
      <div className="flex gap-2">
        <button
          onClick={() => switchRole('student')}
          className={`px-3 py-1 text-xs font-mono uppercase ${
            currentRole === 'student'
              ? 'bg-white text-black'
              : 'bg-black text-white border border-white'
          }`}
        >
          Leerling
        </button>
        <button
          onClick={() => switchRole('teacher')}
          className={`px-3 py-1 text-xs font-mono uppercase ${
            currentRole === 'teacher'
              ? 'bg-white text-black'
              : 'bg-black text-white border border-white'
          }`}
        >
          Leraar
        </button>
        <button
          onClick={() => switchRole('administrator')}
          className={`px-3 py-1 text-xs font-mono uppercase ${
            currentRole === 'administrator'
              ? 'bg-white text-black'
              : 'bg-black text-white border border-white'
          }`}
        >
          Admin
        </button>
      </div>
      <div className="text-xs font-mono mt-2 opacity-50">
        Huidige rol: {currentRole || 'geen'}
      </div>
    </div>
  )
}