import { useState } from 'react'
import { LogIn, LogOut, Mail, Cloud, HardDrive } from 'lucide-react'
import { signInWithMagicLink, signOut } from '../lib/auth'
import type { User } from '@supabase/supabase-js'

interface AuthSectionProps {
  user: User | null
  onSignOut: () => void
}

export default function AuthSection({ user, onSignOut }: AuthSectionProps) {
  const [email, setEmail] = useState('')
  const [status, setStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle')
  const [errorMessage, setErrorMessage] = useState('')

  const handleSendMagicLink = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email.trim()) return

    setStatus('sending')
    setErrorMessage('')

    const { error } = await signInWithMagicLink(email.trim())

    if (error) {
      setStatus('error')
      setErrorMessage(error.message)
    } else {
      setStatus('sent')
    }
  }

  const handleSignOut = async () => {
    await signOut()
    setStatus('idle')
    setEmail('')
    onSignOut()
  }

  // Inloggad
  if (user) {
    return (
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-1.5 text-sm text-gray-500">
          <Cloud size={14} className="text-b3-turquoise" />
          <span className="hidden sm:inline">{user.email}</span>
        </div>
        <button
          onClick={handleSignOut}
          className="flex items-center gap-1.5 text-sm text-gray-400 hover:text-gray-600 transition-colors"
        >
          <LogOut size={14} />
          <span className="hidden sm:inline">Logga ut</span>
        </button>
      </div>
    )
  }

  // Magic link skickad
  if (status === 'sent') {
    return (
      <div className="flex items-center gap-2 text-sm">
        <Mail size={14} className="text-b3-turquoise" />
        <span className="text-gray-600">
          Kolla din inkorg! Klicka pa lanken vi skickade till <strong>{email}</strong>
        </span>
        <button
          onClick={() => { setStatus('idle'); setEmail('') }}
          className="text-gray-400 hover:text-gray-600 underline ml-1"
        >
          Avbryt
        </button>
      </div>
    )
  }

  // Ej inloggad - visa formulär
  return (
    <div className="flex items-center gap-2">
      <div className="flex items-center gap-1.5 text-sm text-gray-400">
        <HardDrive size={14} />
        <span className="hidden lg:inline">Sparas lokalt</span>
      </div>
      <div className="w-px h-4 bg-gray-200 mx-1" />
      <form onSubmit={handleSendMagicLink} className="flex items-center gap-2">
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="din@email.se"
          className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-b3-turquoise focus:border-transparent w-40 sm:w-48"
        />
        <button
          type="submit"
          disabled={status === 'sending' || !email.trim()}
          className="flex items-center gap-1.5 bg-b3-turquoise hover:bg-b3-turquoise-dark disabled:opacity-50 text-white px-3 py-1.5 rounded-lg transition-all text-sm font-medium whitespace-nowrap"
        >
          <LogIn size={14} />
          {status === 'sending' ? 'Skickar...' : 'Logga in'}
        </button>
      </form>
      {status === 'error' && (
        <span className="text-red-500 text-xs">{errorMessage}</span>
      )}
    </div>
  )
}
