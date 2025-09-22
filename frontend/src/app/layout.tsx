import type { Metadata } from 'next'
import { JetBrains_Mono } from 'next/font/google'
import './globals.css'
import DevRoleSwitcher from '@/components/DevRoleSwitcher'

export const dynamic = 'force-dynamic'

const jetbrainsMono = JetBrains_Mono({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Octovox - Vocabulary Learning',
  description: 'Learn vocabulary with spaced repetition and active recall',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={jetbrainsMono.className}>
        <div className="min-h-screen bg-black text-white">
          {children}
          <DevRoleSwitcher />
        </div>
      </body>
    </html>
  )
}