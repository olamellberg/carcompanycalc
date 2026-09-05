import { type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes } from 'react'
import { ChevronDown } from 'lucide-react'

interface FieldProps {
  label: ReactNode
  htmlFor?: string
  hint?: ReactNode
  error?: string
  children: ReactNode
  className?: string
}

/** Etikett + kontroll + hjälptext/felmeddelande. */
export function Field({ label, htmlFor, hint, error, children, className }: FieldProps) {
  return (
    <div className={className}>
      <label htmlFor={htmlFor} className="field-label">
        {label}
      </label>
      {children}
      {error ? (
        <p className="field-error" role="alert">
          {error}
        </p>
      ) : (
        hint && <p className="field-hint">{hint}</p>
      )}
    </div>
  )
}

interface TextInputProps extends InputHTMLAttributes<HTMLInputElement> {
  /** Enhet som visas inuti fältet, t.ex. "kr" eller "km/år". */
  suffix?: string
  invalid?: boolean
}

export function TextInput({ suffix, invalid, className = '', readOnly, ...props }: TextInputProps) {
  const state = `${invalid ? ' is-invalid' : ''}${readOnly ? ' is-readonly' : ''}`
  return (
    <div className={`control${state} ${className}`}>
      <input className="control-input" readOnly={readOnly} aria-invalid={invalid || undefined} {...props} />
      {suffix && <span className="control-suffix">{suffix}</span>}
    </div>
  )
}

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  children: ReactNode
}

export function Select({ children, className = '', ...props }: SelectProps) {
  return (
    <div className={`control relative ${className}`}>
      <select className="control-input control-select" {...props}>
        {children}
      </select>
      <ChevronDown
        size={16}
        aria-hidden="true"
        className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-ink-faint"
      />
    </div>
  )
}
