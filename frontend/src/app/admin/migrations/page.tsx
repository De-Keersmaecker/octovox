'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Database, CheckCircle, XCircle, Loader } from 'lucide-react'

export default function MigrationsPage() {
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<any>(null)
  const [error, setError] = useState('')
  const router = useRouter()

  const runMigration = async () => {
    if (!confirm('Weet je zeker dat je de database migration wilt uitvoeren? Dit kan niet ongedaan gemaakt worden.')) {
      return
    }

    setLoading(true)
    setError('')
    setResult(null)

    try {
      const token = localStorage.getItem('token')
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/admin/migrate-schema-fixes`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || data.details || 'Migration failed')
      }

      setResult(data)
    } catch (err: any) {
      console.error('Migration error:', err)
      setError(err.message || 'Failed to run migration')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen p-4">
      <div className="max-w-4xl mx-auto">
        <header className="mb-8">
          <div className="flex items-center gap-4 mb-4">
            <button
              onClick={() => router.push('/admin/dashboard')}
              className="retro-button flex items-center gap-2"
            >
              <ArrowLeft size={16} />
              TERUG
            </button>
            <h1 className="text-4xl font-bold">DATABASE MIGRATIONS</h1>
          </div>
          <p className="text-lg opacity-75">Voer database schema updates uit</p>
        </header>

        {/* Migration Card */}
        <div className="retro-border p-6 mb-6">
          <div className="flex items-start gap-4 mb-6">
            <Database size={48} className="flex-shrink-0" />
            <div>
              <h2 className="text-2xl font-bold mb-2">Schema Fix Migration</h2>
              <p className="opacity-90 mb-4">
                Deze migration lost kritieke database schema problemen op en voegt ontbrekende functionaliteit toe.
              </p>

              <div className="bg-gray-900 p-4 rounded border border-gray-700 mb-4">
                <h3 className="font-bold mb-2">Wat wordt er gefixt:</h3>
                <ul className="space-y-1 text-sm">
                  <li>✅ UUID vs INTEGER type conflicten</li>
                  <li>✅ Ontbrekende tabellen (practice_attempts, practice_sessions, upload_sessions, reward_settings)</li>
                  <li>✅ Theme kolom toevoegen aan word_lists</li>
                  <li>✅ Class_code kolom toevoegen aan users</li>
                  <li>✅ Administrator role support</li>
                  <li>✅ Alle benodigde indexes en constraints</li>
                </ul>
              </div>

              <div className="bg-yellow-900 bg-opacity-30 border border-yellow-600 p-4 rounded mb-4">
                <h3 className="font-bold mb-2 text-yellow-400">⚠️ Belangrijk:</h3>
                <ul className="space-y-1 text-sm">
                  <li>• Deze migration is <strong>safe</strong> - gebruikt IF NOT EXISTS</li>
                  <li>• Kan meerdere keren uitgevoerd worden zonder problemen</li>
                  <li>• Dropt en herstelt: word_statistics, class_word_lists</li>
                  <li>• Voert uit als database transaction</li>
                </ul>
              </div>

              <button
                onClick={runMigration}
                disabled={loading}
                className="retro-button w-full flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <Loader size={20} className="animate-spin" />
                    MIGRATION WORDT UITGEVOERD...
                  </>
                ) : (
                  <>
                    <Database size={20} />
                    VOER MIGRATION UIT
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Success Result */}
        {result && result.success && (
          <div className="retro-border p-6 mb-6 bg-green-900 bg-opacity-20 border-green-500">
            <div className="flex items-start gap-4">
              <CheckCircle size={32} className="text-green-500 flex-shrink-0" />
              <div>
                <h3 className="text-2xl font-bold text-green-400 mb-2">MIGRATION SUCCESVOL</h3>
                <p className="mb-4">{result.message}</p>

                {result.details && result.details.fixed && (
                  <div className="bg-black bg-opacity-50 p-4 rounded">
                    <h4 className="font-bold mb-2">Uitgevoerde fixes:</h4>
                    <ul className="space-y-1 text-sm">
                      {result.details.fixed.map((fix: string, index: number) => (
                        <li key={index}>✅ {fix}</li>
                      ))}
                    </ul>
                  </div>
                )}

                <p className="mt-4 text-sm opacity-75">
                  Timestamp: {result.timestamp}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Error Result */}
        {error && (
          <div className="retro-border p-6 mb-6 bg-red-900 bg-opacity-20 border-red-500">
            <div className="flex items-start gap-4">
              <XCircle size={32} className="text-red-500 flex-shrink-0" />
              <div>
                <h3 className="text-2xl font-bold text-red-400 mb-2">MIGRATION GEFAALD</h3>
                <p className="mb-2">Er is een fout opgetreden tijdens de migration:</p>
                <pre className="bg-black bg-opacity-50 p-4 rounded text-sm overflow-auto">
                  {error}
                </pre>
                <p className="mt-4 text-sm opacity-75">
                  Check de backend logs voor meer details.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Info */}
        <div className="retro-border p-6 bg-gray-900 bg-opacity-30">
          <h3 className="text-xl font-bold mb-4">ℹ️ Informatie</h3>
          <div className="space-y-2 text-sm opacity-90">
            <p>
              <strong>Wanneer uitvoeren?</strong> Deze migration moet uitgevoerd worden na de deployment van de nieuwe code.
            </p>
            <p>
              <strong>Is het veilig?</strong> Ja, de migration gebruikt IF NOT EXISTS en kan meerdere keren uitgevoerd worden.
            </p>
            <p>
              <strong>Wat als het faalt?</strong> De meeste stappen zijn idempotent. Check de error message en probeer opnieuw.
            </p>
            <p>
              <strong>Backup?</strong> Railway maakt automatisch backups van je database. Je kunt terugdraaien via het dashboard.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
