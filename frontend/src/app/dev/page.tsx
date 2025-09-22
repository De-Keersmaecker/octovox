'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function DevLogin() {
  const router = useRouter()

  useEffect(() => {
    // Set up dev user with administrator role by default
    const devUser = {
      id: 'dev-user',
      email: 'jelledekeersmaecker@gmail.com',
      name: 'Jelle De Keersmaecker',
      role: 'administrator'
    }

    // Set dev token
    localStorage.setItem('token', 'dev-token-' + Date.now())
    localStorage.setItem('user', JSON.stringify(devUser))

    // Redirect to admin dashboard
    router.push('/admin/dashboard')
  }, [router])

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <div className="text-6xl font-bold mb-4">OCTOVOX</div>
        <div className="text-xl">Setting up development mode...</div>
      </div>
    </div>
  )
}