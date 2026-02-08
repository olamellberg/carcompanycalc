import { useState, useEffect, useMemo, useCallback } from 'react'
import { Plus } from 'lucide-react'
import { calculateCarMetrics, type CarInput, type CarCalculations } from './lib/calculations'
import { getSession, onAuthStateChange } from './lib/auth'
import { createStorage, mapRowToCarInput, hasLocalCars, migrateLocalToSupabase } from './lib/storage'
import CarModal from './components/CarModal'
import CarTable from './components/CarTable'
import GlobalSettings, { type UserSettings } from './components/GlobalSettings'
import AuthSection from './components/AuthSection'
import type { User } from '@supabase/supabase-js'

// Default personliga inställningar
const DEFAULT_SETTINGS: UserSettings = {
  grossSalary: 55000, // 55 000 kr/mån = vanlig tjänstemannalön
  annualKm: 15000, // 15 000 km/år = 1 500 mil
  marginalTaxRate: 0.52 // Statlig + kommunal skatt
}

// Ladda sparade inställningar från localStorage
function loadSettings(): UserSettings {
  try {
    const saved = localStorage.getItem('companyCarCalc_settings')
    if (saved) {
      return JSON.parse(saved)
    }
  } catch (e) {
    console.error('Error loading settings:', e)
  }
  return DEFAULT_SETTINGS
}

function App() {
  const [cars, setCars] = useState<CarCalculations[]>([])
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingCar, setEditingCar] = useState<CarCalculations | null>(null)
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
      const calculatedCars = rows.map(row => {
        const carInput = mapRowToCarInput(row)
        return calculateCarMetrics({
          ...carInput,
          annualKm: userSettings.annualKm, // Använd personlig inställning
        }, userSettings.marginalTaxRate)
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
    getSession().then(session => {
      setUser(session?.user ?? null)
      setAuthLoading(false)
    })

    // 2. Lyssna på auth-ändringar (magic link callback, sign out, etc.)
    const { data: { subscription } } = onAuthStateChange((event, session) => {
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
    localStorage.setItem('companyCarCalc_settings', JSON.stringify(newSettings))
  }

  const handleSaveCar = async (carInput: CarInput) => {
    try {
      console.log('💾 handleSaveCar called with:', carInput)
      await storage.saveCar(carInput, editingCar?.id)
      await loadCars()
      setIsModalOpen(false)
      setEditingCar(null)
      console.log('✅ Save completed, modal closed')
    } catch (error) {
      console.error('❌ Error saving car:', error)
      alert(`Kunde inte spara bilen: ${error instanceof Error ? error.message : 'Okänt fel'}. Kontrollera konsolen för mer information.`)
      throw error
    }
  }

  const handleDeleteCar = async (id: string) => {
    if (!confirm('Är du säker på att du vill ta bort denna bil?')) return

    try {
      await storage.deleteCar(id)
      await loadCars()
    } catch (error) {
      console.error('Error deleting car:', error)
      alert('Kunde inte ta bort bilen.')
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
      const count = await migrateLocalToSupabase(user.id)
      console.log(`✅ Migrerade ${count} bilar till molnet`)
      setShowMigrationPrompt(false)
      await loadCars()
    } catch (error) {
      console.error('Migreringsfel:', error)
      alert('Kunde inte flytta bilarna. Försök igen.')
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
    return sortDirection === 'asc'
      ? aStr.localeCompare(bStr, 'sv')
      : bStr.localeCompare(aStr, 'sv')
  })

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* B3 Zick-zack decoration */}
      <div className="b3-zigzag h-3"></div>

      {/* B3 Header */}
      <header className="bg-white shadow-sm sticky top-0 z-40">
        <div className="max-w-[1800px] mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <a href="https://b3.se" target="_blank" rel="noopener noreferrer" className="b3-logo">
                <div className="bg-b3-turquoise text-white font-bold text-2xl px-3 py-1.5 rounded-lg">
                  B3
                </div>
              </a>
              <span className="font-semibold text-b3-turquoise text-xl">
                Förmånsbilskalkylator
              </span>
            </div>
            <AuthSection
              user={user}
              onSignOut={() => loadCars()}
            />
          </div>
        </div>
      </header>

      {/* Migreringspromp */}
      {showMigrationPrompt && (
        <div className="bg-blue-50 border-b border-blue-200">
          <div className="max-w-[1800px] mx-auto px-6 py-3">
            <div className="flex items-center justify-between flex-wrap gap-3">
              <p className="text-blue-800 text-sm">
                Du har <strong>{migrationCount}</strong> bil{migrationCount !== 1 ? 'ar' : ''} sparade lokalt. Vill du flytta dem till ditt konto?
              </p>
              <div className="flex gap-2">
                <button
                  onClick={handleMigrate}
                  className="bg-b3-turquoise hover:bg-b3-turquoise-dark text-white px-4 py-1.5 rounded-lg text-sm font-medium transition-all"
                >
                  Ja, flytta
                </button>
                <button
                  onClick={handleSkipMigration}
                  className="bg-white hover:bg-gray-100 text-gray-600 px-4 py-1.5 rounded-lg text-sm border border-gray-300 transition-all"
                >
                  Nej, börja om
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Hero Section */}
      <section className="bg-gray-100 border-b border-gray-200">
        <div className="max-w-[1800px] mx-auto px-6 py-8">
          <p className="text-gray-600">
            Jämför total ägandekostnad för förmånsbilar enligt B3s RAM-modell.
            Beräkna förmånsvärde, RAM-kostnad och kostnad per mil baserat på dina personliga förutsättningar.
          </p>
        </div>
      </section>

      {/* Main Content */}
      <main className="flex-grow">
        <div className="max-w-[1800px] mx-auto px-6 py-8">
          {/* Personliga inställningar */}
          <GlobalSettings
            settings={userSettings}
            onSettingsChange={handleSettingsChange}
          />

          {/* Car Table */}
          <div className="bg-white rounded-2xl shadow-lg p-8 overflow-visible mt-8">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">Dina bilar</h2>
                <p className="text-gray-500 mt-1">
                  Beräkna TCO, total kostnad från RAM, lönemotsvarande och kostnad per mil
                </p>
              </div>
              <button
                onClick={() => {
                  setEditingCar(null)
                  setIsModalOpen(true)
                }}
                className="flex items-center gap-2 bg-b3-turquoise hover:bg-b3-turquoise-dark text-white px-6 py-3 rounded-xl transition-all shadow-md hover:shadow-lg font-semibold"
              >
                <Plus size={20} />
                Lägg till bil
              </button>
            </div>

            {loading ? (
              <div className="text-center py-16">
                <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-b3-turquoise border-t-transparent"></div>
                <p className="mt-4 text-gray-600">Laddar bilar...</p>
              </div>
            ) : cars.length === 0 ? (
              <div className="text-center py-16 bg-gray-50 rounded-xl border-2 border-dashed border-gray-300">
                <div className="mb-4">
                  <svg className="w-16 h-16 mx-auto text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                  </svg>
                </div>
                <p className="text-gray-600 mb-4 font-medium">Inga bilar tillagda ännu.</p>
                <button
                  onClick={() => {
                    setEditingCar(null)
                    setIsModalOpen(true)
                  }}
                  className="bg-b3-turquoise hover:bg-b3-turquoise-dark text-white px-6 py-3 rounded-xl font-semibold transition-all shadow-md hover:shadow-lg"
                >
                  Lägg till din första bil
                </button>
              </div>
            ) : (
              <CarTable
                cars={sortedCars}
                sortField={sortField}
                sortDirection={sortDirection}
                onSort={handleSort}
                onEdit={handleEditCar}
                onDelete={handleDeleteCar}
                marginalTaxRate={userSettings.marginalTaxRate}
              />
            )}
          </div>
        </div>
      </main>

      {/* B3 Footer */}
      <footer className="bg-gray-900 text-white mt-auto">
        <div className="max-w-[1800px] mx-auto px-6 py-6">
          <div className="flex items-center gap-4">
            <a href="https://b3.se" target="_blank" rel="noopener noreferrer" className="b3-logo">
              <div className="bg-b3-turquoise text-white font-bold text-xl px-2.5 py-1 rounded-lg">
                B3
              </div>
            </a>
            <p className="text-gray-400 italic text-sm">Creating possibilities together</p>
          </div>
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
    </div>
  )
}

export default App
