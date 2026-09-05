import { useState, type FormEvent } from 'react'
import { Cloud, HardDrive, LogOut, Mail } from 'lucide-react'
import type { User } from '@supabase/supabase-js'
import { signInWithMagicLink, signOut } from '../lib/auth'
import { Dialog } from './ui/Dialog'
import { Field, TextInput } from './ui/Field'

interface AuthSectionProps {
  user: User | null
  onSignOut: () => void
}

/** Lagringsstatus och inloggning i sidhuvudet. */
export default function AuthSection({ user, onSignOut }: AuthSectionProps) {
  const [loginOpen, setLoginOpen] = useState(false)

  const handleSignOut = async () => {
    await signOut()
    onSignOut()
  }

  if (user) {
    return (
      <div className="flex items-center gap-3 text-sm">
        <span className="hidden items-center gap-1.5 text-white/70 sm:inline-flex">
          <Cloud size={15} className="text-accent" aria-hidden="true" />
          <span className="max-w-[16rem] truncate">{user.email}</span>
        </span>
        <button type="button" onClick={handleSignOut} className="btn btn-sm btn-inverse">
          <LogOut size={15} aria-hidden="true" />
          Logga ut
        </button>
      </div>
    )
  }

  return (
    <div className="flex items-center gap-3 text-sm">
      <span className="hidden items-center gap-1.5 text-white/60 md:inline-flex">
        <HardDrive size={15} aria-hidden="true" />
        Sparas i webbläsaren
      </span>
      <button type="button" onClick={() => setLoginOpen(true)} className="btn btn-sm btn-inverse">
        Logga in
      </button>
      {loginOpen && <LoginDialog onClose={() => setLoginOpen(false)} />}
    </div>
  )
}

function LoginDialog({ onClose }: { onClose: () => void }) {
  const [email, setEmail] = useState('')
  const [status, setStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle')
  const [errorMessage, setErrorMessage] = useState('')

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    const address = email.trim()
    if (!address) return

    setStatus('sending')
    setErrorMessage('')
    const { error } = await signInWithMagicLink(address)
    if (error) {
      setStatus('error')
      setErrorMessage(error.message)
    } else {
      setStatus('sent')
    }
  }

  if (status === 'sent') {
    return (
      <Dialog
        title="Länk skickad"
        onClose={onClose}
        size="sm"
        footer={
          <button type="button" className="btn btn-primary" onClick={onClose}>
            Stäng
          </button>
        }
      >
        <div className="flex gap-3">
          <Mail size={20} className="mt-0.5 shrink-0 text-accent-ink" aria-hidden="true" />
          <p className="text-ink-soft">
            Öppna mejlet till <strong className="font-medium text-ink">{email.trim()}</strong> och klicka på
            länken. Du loggas in här i webbläsaren.
          </p>
        </div>
      </Dialog>
    )
  }

  return (
    <Dialog
      title="Logga in"
      description="Spara dina bilar på ett konto och nå dem från andra enheter."
      onClose={onClose}
      size="sm"
      footer={
        <>
          <button type="button" className="btn btn-secondary" onClick={onClose}>
            Avbryt
          </button>
          <button
            type="submit"
            form="login-form"
            className="btn btn-primary"
            disabled={status === 'sending' || !email.trim()}
          >
            {status === 'sending' ? 'Skickar…' : 'Skicka inloggningslänk'}
          </button>
        </>
      }
    >
      <form id="login-form" onSubmit={handleSubmit} noValidate>
        <Field
          label="E-postadress"
          htmlFor="login-email"
          hint="Vi mejlar en inloggningslänk. Inget lösenord behövs."
          error={status === 'error' ? errorMessage : undefined}
        >
          <TextInput
            id="login-email"
            type="email"
            autoComplete="email"
            data-autofocus
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="fornamn.efternamn@b3.se"
            invalid={status === 'error'}
          />
        </Field>
      </form>
    </Dialog>
  )
}
