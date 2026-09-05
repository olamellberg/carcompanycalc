import { useEffect, useId, useRef, type MouseEvent, type ReactNode } from 'react'
import { X } from 'lucide-react'

interface DialogProps {
  title: string
  description?: string
  onClose: () => void
  children: ReactNode
  footer?: ReactNode
  size?: 'sm' | 'lg'
}

/**
 * Modal byggd på nativ <dialog>: öppnas med showModal(), fokus hålls i dialogen,
 * Escape och klick utanför stänger (closedby="any" med fallback).
 */
export function Dialog({ title, description, onClose, children, footer, size = 'lg' }: DialogProps) {
  const ref = useRef<HTMLDialogElement>(null)
  const titleId = useId()
  const descId = useId()

  useEffect(() => {
    const el = ref.current
    if (!el) return
    el.setAttribute('closedby', 'any')
    if (!el.open) el.showModal()
    // Låt ett fält med data-autofocus få fokus i stället för stängknappen.
    el.querySelector<HTMLElement>('[data-autofocus]')?.focus()
  }, [])

  // Fallback för webbläsare utan stöd för closedby: klick på bakgrunden stänger.
  const handleClick = (e: MouseEvent<HTMLDialogElement>) => {
    if ('closedBy' in HTMLDialogElement.prototype) return
    if (e.target !== e.currentTarget) return
    const r = e.currentTarget.getBoundingClientRect()
    const inside =
      r.top <= e.clientY && e.clientY <= r.bottom && r.left <= e.clientX && e.clientX <= r.right
    if (!inside) onClose()
  }

  return (
    <dialog
      ref={ref}
      className={`sheet${size === 'sm' ? ' sheet-sm' : ''}`}
      aria-labelledby={titleId}
      aria-describedby={description ? descId : undefined}
      onClose={onClose}
      onClick={handleClick}
    >
      <div className="sheet-head">
        <div className="min-w-0">
          <h2 id={titleId} className="text-lg font-semibold">
            {title}
          </h2>
          {description && (
            <p id={descId} className="mt-0.5 text-sm text-ink-soft">
              {description}
            </p>
          )}
        </div>
        <button type="button" onClick={onClose} className="icon-btn -mr-1 -mt-1" aria-label="Stäng">
          <X size={20} />
        </button>
      </div>
      <div className="sheet-body">{children}</div>
      {footer && <div className="sheet-foot">{footer}</div>}
    </dialog>
  )
}

interface ConfirmDialogProps {
  title: string
  message: string
  confirmLabel: string
  onConfirm: () => void | Promise<void>
  onClose: () => void
  busy?: boolean
}

export function ConfirmDialog({ title, message, confirmLabel, onConfirm, onClose, busy }: ConfirmDialogProps) {
  return (
    <Dialog
      title={title}
      onClose={onClose}
      size="sm"
      footer={
        <>
          <button type="button" className="btn btn-secondary" onClick={onClose} disabled={busy} data-autofocus>
            Avbryt
          </button>
          <button type="button" className="btn btn-danger" onClick={() => void onConfirm()} disabled={busy}>
            {confirmLabel}
          </button>
        </>
      }
    >
      <p className="text-ink-soft">{message}</p>
    </Dialog>
  )
}
