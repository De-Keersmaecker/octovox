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

  const switchRole = (newRole: 'student' | 'teacher' | 'administrator') => {
    // Get current user data
    const userData = localStorage.getItem('user')
    if (!userData) {
      // Create a development user if none exists
      const devUser = {
        id: 'dev-user',
        email: 'jelledekeersmaecker@gmail.com',
        name: 'Jelle De Keersmaecker',
        role: newRole
      }
      localStorage.setItem('user', JSON.stringify(devUser))

      // Set a dev token if none exists
      if (!localStorage.getItem('token')) {
        localStorage.setItem('token', 'dev-token-' + Date.now())
      }
    } else {
      // Update existing user role
      const user = JSON.parse(userData)
      user.role = newRole
      localStorage.setItem('user', JSON.stringify(user))
    }

    setCurrentRole(newRole)

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
  }

  // Only show in development mode
  if (process.env.NODE_ENV === 'production') {
    return null
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