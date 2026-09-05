import { useCallback, useEffect, useMemo, useState } from 'react'
import { Loader2, Plus } from 'lucide-react'
import type { User } from '@supabase/supabase-js'
import { calculateCarMetrics, type CarCalculations, type CarInput } from './lib/calculations'
import { getSession, onAuthStateChange } from './lib/auth'
import { createStorage, hasLocalCars, mapRowToCarInput, migrateLocalToSupabase } from './lib/storage'
import AuthSection from './components/AuthSection'
import CarModal from './components/CarModal'
import CarTable from './components/CarTable'
import GlobalSettings, { calculateMarginalTax, type UserSettings } from './components/GlobalSettings'
import { ConfirmDialog } from './components/ui/Dialog'

const SETTINGS_KEY = 'companyCarCalc_settings'

// Default personliga inställningar
const DEFAULT_SETTINGS: UserSettings = {
  grossSalary: 55000, // 55 000 kr/mån = vanlig tjänstemannalön
  annualKm: 15000, // 15 000 km/år = 1 500 mil
  marginalTaxRate: 0.52,
}

// Ladda sparade inställningar från localStorage (marginalskatten räknas alltid om från lönen)
function loadSettings(): UserSettings {
  try {
    const saved = localStorage.getItem(SETTINGS_KEY)
    if (saved) {
      const parsed = { ...DEFAULT_SETTINGS, ...JSON.parse(saved) } as UserSettings
      return { ...parsed, marginalTaxRate: calculateMarginalTax(parsed.grossSalary) }
    }
  } catch (e) {
    console.error('Error loading settings:', e)
  }
  return DEFAULT_SETTINGS
}

function B3Mark({ className = '' }: { className?: string }) {
  return (
    <span
      className={`grid shrink-0 place-items-center rounded-lg bg-accent font-bold leading-none text-ink ${className}`}
      aria-hidden="true"
    >
      B3
    </span>
  )
}

function App() {
  const [cars, setCars] = useState<CarCalculations[]>([])
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingCar, setEditingCar] = useState<CarCalculations | null>(null)
  const [pendingDelete, setPendingDelete] = useState<CarCalculations | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [notice, setNotice] = useState<string | null>(null)
  const [sortField, setSortField] = useState<keyof CarCalculations | null>(null)
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc')
  const [loading, setLoading] = useState(true)
  const [userSettings, setUserSettings] = useState<UserSettings>(loadSettings)

  // Auth state
  const [user, setUser] = useState<User | null>(null)
  const [authLoading, setAuthLoading] = useState(true)
  const [showMigrationPrompt, setShowMigrationPrompt] = useState(false)
  const [migrationCount, setMigrationCount] = useState(0)

  // Storage baserat på auth-state
  const storage = useMemo(() => createStorage(user?.id ?? null), [user?.id])

  // Ladda bilar med current storage
  const loadCars = useCallback(async () => {
    try {
      setLoading(true)
      const rows = await storage.loadCars()
      const calculatedCars = rows.map((row) => {
        const carInput = mapRowToCarInput(row)
        return calculateCarMetrics(
          {
            ...carInput,
            annualKm: userSettings.annualKm, // Använd personlig inställning
          },
          userSettings.marginalTaxRate
        )
      })
      setCars(calculatedCars)
    } catch (error) {
      console.error('Error loading cars:', error)
      setCars([])
    } finally {
      setLoading(false)
    }
  }, [storage, userSettings.marginalTaxRate, userSettings.annualKm])

  // Auth-initialisering
  useEffect(() => {
    // 1. Kolla befintlig session
    getSession().then((session) => {
      setUser(session?.user ?? null)
      setAuthLoading(false)
    })

    // 2. Lyssna på auth-ändringar (magic link callback, sign out, etc.)
    const {
      data: { subscription },
    } = onAuthStateChange((event, session) => {
      const newUser = session?.user ?? null
      setUser(newUser)

      // Vid inloggning: kolla om det finns lokala bilar att migrera
      if (event === 'SIGNED_IN' && newUser && hasLocalCars()) {
        try {
          const localCars = JSON.parse(localStorage.getItem('companyCarCalc_cars') || '[]')
          setMigrationCount(localCars.length)
          setShowMigrationPrompt(true)
        } catch {
          // Ignorera parse-fel
        }
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  // Ladda bilar när auth är klar eller user ändras
  useEffect(() => {
    if (!authLoading) {
      loadCars()
    }
  }, [authLoading, loadCars])

  // Spara inställningar till localStorage och räkna om bilar när de ändras
  const handleSettingsChange = (newSettings: UserSettings) => {
    setUserSettings(newSettings)
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(newSettings))
  }

  const openNewCar = () => {
    setEditingCar(null)
    setIsModalOpen(true)
  }

  const handleSaveCar = async (carInput: CarInput) => {
    await storage.saveCar(carInput, editingCar?.id)
    await loadCars()
    setIsModalOpen(false)
    setEditingCar(null)
  }

  const handleConfirmDelete = async () => {
    if (!pendingDelete?.id) return
    try {
      setDeleting(true)
      await storage.deleteCar(pendingDelete.id)
      setPendingDelete(null)
      await loadCars()
    } catch (error) {
      console.error('Error deleting car:', error)
      setPendingDelete(null)
      setNotice('Bilen kunde inte tas bort. Försök igen.')
    } finally {
      setDeleting(false)
    }
  }

  const handleEditCar = (car: CarCalculations) => {
    setEditingCar(car)
    setIsModalOpen(true)
  }

  const handleSort = (field: keyof CarCalculations) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortDirection('asc')
    }
  }

  const handleMigrate = async () => {
    if (!user) return
    try {
      await migrateLocalToSupabase(user.id)
      setShowMigrationPrompt(false)
      await loadCars()
    } catch (error) {
      console.error('Migreringsfel:', error)
      setNotice('Bilarna kunde inte flyttas till kontot. Försök igen.')
    }
  }

  const handleSkipMigration = () => {
    // Rensa lokala bilar utan att migrera
    localStorage.removeItem('companyCarCalc_cars')
    setShowMigrationPrompt(false)
    loadCars()
  }

  const sortedCars = [...cars].sort((a, b) => {
    if (!sortField) return 0

    const aValue = a[sortField]
    const bValue = b[sortField]

    if (aValue === undefined || aValue === null) return 1
    if (bValue === undefined || bValue === null) return -1

    if (typeof aValue === 'number' && typeof bValue === 'number') {
      return sortDirection === 'asc' ? aValue - bValue : bValue - aValue
    }

    const aStr = String(aValue)
    const bStr = String(bValue)
    return sortDirection === 'asc' ? aStr.localeCompare(bStr, 'sv') : bStr.localeCompare(aStr, 'sv')
  })

  return (
    <div className="flex min-h-dvh flex-col">
      <header className="bg-b3-grey-dark text-white">
        <div className="mx-auto flex max-w-page items-center justify-between gap-4 px-4 py-3 sm:px-6">
          <a
            href="https://b3.se"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-3 rounded-lg"
          >
            <B3Mark className="h-9 w-9 text-base" />
            <span className="text-md font-semibold tracking-tight">Förmånsbilskalkylator</span>
          </a>
          <AuthSection user={user} onSignOut={() => loadCars()} />
        </div>
      </header>
      <div className="zigzag" aria-hidden="true" />

      <main className="mx-auto w-full max-w-page flex-1 px-4 py-8 sm:px-6 sm:py-10">
        {showMigrationPrompt && (
          <div className="card mb-8 flex flex-wrap items-center justify-between gap-3 px-5 py-4" role="status">
            <p>
              Du har <strong className="font-semibold">{migrationCount}</strong>{' '}
              {migrationCount === 1 ? 'bil' : 'bilar'} sparade i webbläsaren. Vill du flytta{' '}
              {migrationCount === 1 ? 'den' : 'dem'} till ditt konto?
            </p>
            <div className="flex gap-2">
              <button type="button" onClick={handleMigrate} className="btn btn-primary btn-sm">
                Flytta till kontot
              </button>
              <button type="button" onClick={handleSkipMigration} className="btn btn-secondary btn-sm">
                Nej, ta bort {migrationCount === 1 ? 'den' : 'dem'}
              </button>
            </div>
          </div>
        )}

        {notice && (
          <div
            className="mb-8 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-danger bg-danger-tint px-5 py-3 text-sm"
            role="alert"
          >
            <p>{notice}</p>
            <button type="button" onClick={() => setNotice(null)} className="btn btn-ghost btn-sm">
              Stäng
            </button>
          </div>
        )}

        <div className="max-w-2xl">
          <h1 className="text-xl font-semibold">Vad kostar en förmånsbil dig?</h1>
          <p className="mt-2 text-ink-soft">
            Jämför bilar på vad de kostar dig per månad och vad de belastar ramen med, enligt Skatteverkets
            regler för 2026 och B3:s RAM-policy.
          </p>
        </div>

        <div className="mt-8">
          <GlobalSettings settings={userSettings} onSettingsChange={handleSettingsChange} />
        </div>

        <section className="card mt-8 p-5 sm:p-7" aria-labelledby="cars-heading">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <h2 id="cars-heading" className="text-lg font-semibold">
                Jämförelse
              </h2>
              <p className="mt-1 text-sm text-ink-soft">
                {cars.length > 0 && `${cars.length} ${cars.length === 1 ? 'bil' : 'bilar'}. `}
                Alla belopp per månad om inget annat anges.
              </p>
            </div>
            <button type="button" onClick={openNewCar} className="btn btn-primary">
              <Plus size={18} aria-hidden="true" />
              Lägg till bil
            </button>
          </div>

          <div className="mt-6">
            {loading ? (
              <p className="flex items-center justify-center gap-2 py-14 text-ink-soft" role="status">
                <Loader2 size={18} className="animate-spin text-accent-ink" aria-hidden="true" />
                Hämtar bilar…
              </p>
            ) : cars.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-line-strong px-6 py-14 text-center">
                <p className="font-medium">Inga bilar att jämföra ännu.</p>
                <p className="mx-auto mt-1 max-w-md text-sm text-ink-soft">
                  Lägg till en bil från Skatteverkets register så ser du direkt vad den kostar dig per månad.
                </p>
                <button type="button" onClick={openNewCar} className="btn btn-primary mt-5">
                  <Plus size={18} aria-hidden="true" />
                  Lägg till första bilen
                </button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <CarTable
                  cars={sortedCars}
                  sortField={sortField}
                  sortDirection={sortDirection}
                  onSort={handleSort}
                  onEdit={handleEditCar}
                  onDelete={setPendingDelete}
                  marginalTaxRate={userSettings.marginalTaxRate}
                />
              </div>
            )}
          </div>
        </section>
      </main>

      <footer className="bg-b3-grey-dark text-white/70">
        <div className="mx-auto flex max-w-page flex-wrap items-center justify-between gap-x-8 gap-y-3 px-4 py-6 text-sm sm:px-6">
          <a
            href="https://b3.se"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-3 rounded-lg"
          >
            <B3Mark className="h-7 w-7 text-xs" />
            <span className="italic">Creating possibilities together</span>
          </a>
          <p>Beräkningar enligt Skatteverkets belopp för 2026 och B3:s riktlinjer för RAM (B16 och C11).</p>
        </div>
      </footer>

      {isModalOpen && (
        <CarModal
          car={editingCar}
          onClose={() => {
            setIsModalOpen(false)
            setEditingCar(null)
          }}
          onSave={handleSaveCar}
        />
      )}

      {pendingDelete && (
        <ConfirmDialog
          title="Ta bort bilen?"
          message={`${pendingDelete.model} försvinner från jämförelsen.`}
          confirmLabel="Ta bort"
          busy={deleting}
          onConfirm={handleConfirmDelete}
          onClose={() => setPendingDelete(null)}
        />
      )}
    </div>
  )
}

export default App
