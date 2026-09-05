import { useEffect, useId, useLayoutEffect, useRef, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'

interface TooltipProps {
  /** Innehållet i tooltipen. */
  content: ReactNode
  /** Utlösaren (renderas i en knapp). */
  children: ReactNode
  className?: string
  /** Tillgängligt namn för ikon-knappar. */
  label?: string
}

interface Position {
  top: number
  left: number
}

const GAP = 8
const EDGE = 8

/**
 * Tooltip som öppnas vid hover och fokus, går att hovra över,
 * stängs med Escape och positioneras ovanför utlösaren (under om det inte finns plats).
 */
export function Tooltip({ content, children, className, label }: TooltipProps) {
  const id = useId()
  const [open, setOpen] = useState(false)
  const [pos, setPos] = useState<Position | null>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const tipRef = useRef<HTMLDivElement>(null)
  const hideTimer = useRef<number>()

  const show = () => {
    window.clearTimeout(hideTimer.current)
    setOpen(true)
  }
  const hideSoon = () => {
    window.clearTimeout(hideTimer.current)
    hideTimer.current = window.setTimeout(() => setOpen(false), 120)
  }
  const hideNow = () => {
    window.clearTimeout(hideTimer.current)
    setOpen(false)
  }

  useLayoutEffect(() => {
    if (!open || !triggerRef.current || !tipRef.current) return
    const trigger = triggerRef.current.getBoundingClientRect()
    const tip = tipRef.current.getBoundingClientRect()
    const fitsAbove = trigger.top - tip.height - GAP >= EDGE
    const top = fitsAbove ? trigger.top - tip.height - GAP : trigger.bottom + GAP
    const centre = trigger.left + trigger.width / 2
    const half = tip.width / 2
    const left = Math.min(Math.max(centre, half + EDGE), window.innerWidth - half - EDGE)
    setPos({ top, left })
  }, [open])

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') hideNow()
    }
    const onScroll = () => hideNow()
    document.addEventListener('keydown', onKey)
    window.addEventListener('scroll', onScroll, true)
    return () => {
      document.removeEventListener('keydown', onKey)
      window.removeEventListener('scroll', onScroll, true)
    }
  }, [open])

  useEffect(() => () => window.clearTimeout(hideTimer.current), [])

  return (
    <>
      <button
        type="button"
        ref={triggerRef}
        className={className}
        aria-label={label}
        aria-describedby={open ? id : undefined}
        onMouseEnter={show}
        onMouseLeave={hideSoon}
        onFocus={show}
        onBlur={hideNow}
      >
        {children}
      </button>
      {open &&
        createPortal(
          <div
            ref={tipRef}
            id={id}
            role="tooltip"
            className="tip"
            style={
              pos
                ? { top: pos.top, left: pos.left, transform: 'translateX(-50%)' }
                : { top: 0, left: 0, visibility: 'hidden' }
            }
            onMouseEnter={show}
            onMouseLeave={hideSoon}
          >
            {content}
          </div>,
          document.body
        )}
    </>
  )
}
