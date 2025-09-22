'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function Home() {
  const router = useRouter()

  useEffect(() => {
    const token = localStorage.getItem('token')
    if (token) {
      const userData = localStorage.getItem('user')
      if (userData) {
        const user = JSON.parse(userData)
        if (user.role === 'student') {
          router.push('/dashboard')
        } else if (user.role === 'teacher' || user.role === 'administrator') {
          router.push('/admin')
        }
      }
    } else {
      router.push('/login')
    }
  }, [router])

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <div className="text-6xl font-bold mb-4">OCTOVOX</div>
        <div className="text-xl">Loading...</div>
      </div>
    </div>
  )
}