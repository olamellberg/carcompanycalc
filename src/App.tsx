import { useState, useEffect } from 'react'
import { Plus, ExternalLink } from 'lucide-react'
import { supabase } from './lib/supabase'
import { calculateCarMetrics, type CarInput, type CarCalculations } from './lib/calculations'
import CarModal from './components/CarModal'
import CarTable from './components/CarTable'
import GlobalSettings, { type UserSettings } from './components/GlobalSettings'

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

  useEffect(() => {
    loadCars()
  }, [])

  // Spara inställningar till localStorage och räkna om bilar när de ändras
  const handleSettingsChange = (newSettings: UserSettings) => {
    setUserSettings(newSettings)
    localStorage.setItem('companyCarCalc_settings', JSON.stringify(newSettings))
  }

  // Räkna om bilar när inställningar ändras
  useEffect(() => {
    if (cars.length > 0) {
      // Ladda om bilarna med nya inställningar
      loadCars()
    }
  }, [userSettings.marginalTaxRate, userSettings.annualKm])

  const loadCars = async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('cars')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) throw error

      if (data) {
        const calculatedCars = data.map((car: any) => calculateCarMetrics({
          id: car.id,
          model: car.model,
          purchasePrice: car.purchase_price,
          benefitValue: car.benefit_value,
          isElectric: car.is_electric,
          isPluginHybrid: car.is_plugin_hybrid,
          annualKm: userSettings.annualKm, // Använd personlig inställning
          isLeasing: car.is_leasing,
          interestRate: car.interest_rate,
          leasingPeriod: car.leasing_period,
          annualLeasingCost: car.annual_leasing_cost,
          serviceMiles: car.service_miles,
          insuranceIncludedInLeasing: car.insurance_included_in_leasing,
          maintenanceIncludedInLeasing: car.maintenance_included_in_leasing,
          registeredAfterJuly2022: car.registered_after_july_2022,
          vehicleTax: car.vehicle_tax,
          extraEquipment: car.extra_equipment,
          electricRange: car.electric_range
        }, userSettings.marginalTaxRate))
        setCars(calculatedCars)
      }
    } catch (error) {
      console.error('Error loading cars:', error)
      // If table doesn't exist, continue with empty array
      setCars([])
    } finally {
      setLoading(false)
    }
  }

  const handleSaveCar = async (carInput: CarInput) => {
    try {
      console.log('💾 handleSaveCar called with:', carInput)
      
      const carData = {
        model: carInput.model,
        purchase_price: carInput.purchasePrice,
        benefit_value: carInput.benefitValue,
        is_electric: carInput.isElectric || false,
        is_plugin_hybrid: carInput.isPluginHybrid || false,
        annual_km: carInput.annualKm || 15000,
        is_leasing: carInput.isLeasing !== undefined ? carInput.isLeasing : true,
        interest_rate: carInput.interestRate || 5.0,
        leasing_period: carInput.leasingPeriod || 36,
        annual_leasing_cost: carInput.annualLeasingCost || null,
        service_miles: carInput.serviceMiles || 500,
        insurance_included_in_leasing: carInput.insuranceIncludedInLeasing || false,
        maintenance_included_in_leasing: carInput.maintenanceIncludedInLeasing || false,
        registered_after_july_2022: carInput.registeredAfterJuly2022 !== undefined ? carInput.registeredAfterJuly2022 : true,
        vehicle_tax: carInput.vehicleTax || 5292,
        extra_equipment: carInput.extraEquipment || 0,
        electric_range: carInput.electricRange || null
      }

      console.log('📦 Prepared carData for Supabase:', carData)

      if (editingCar?.id) {
        // Update existing car
        console.log('🔄 Updating existing car with id:', editingCar.id)
        const { data, error } = await supabase
          .from('cars')
          .update(carData)
          .eq('id', editingCar.id)
          .select()

        if (error) {
          console.error('❌ Supabase update error:', error)
          throw error
        }
        console.log('✅ Car updated successfully:', data)
      } else {
        // Insert new car
        console.log('➕ Inserting new car')
        const { data, error } = await supabase
          .from('cars')
          .insert([carData])
          .select()

        if (error) {
          console.error('❌ Supabase insert error:', error)
          throw error
        }
        console.log('✅ Car inserted successfully:', data)
      }

      await loadCars()
      setIsModalOpen(false)
      setEditingCar(null)
      console.log('✅ Save completed, modal closed')
    } catch (error) {
      console.error('❌ Error saving car:', error)
      alert(`Kunde inte spara bilen: ${error instanceof Error ? error.message : 'Okänt fel'}. Kontrollera konsolen för mer information.`)
      throw error // Re-throw så att CarModal kan hantera det
    }
  }

  const handleDeleteCar = async (id: string) => {
    if (!confirm('Är du säker på att du vill ta bort denna bil?')) return

    try {
      const { error } = await supabase
        .from('cars')
        .delete()
        .eq('id', id)

      if (error) throw error
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
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <a href="https://b3.se" target="_blank" rel="noopener noreferrer" className="b3-logo">
                <div className="bg-b3-turquoise text-white font-bold text-2xl px-3 py-1.5 rounded-lg">
                  b3
                </div>
              </a>
              <nav className="hidden md:flex items-center gap-6 text-gray-600">
                <span className="font-semibold text-b3-turquoise border-b-2 border-b3-turquoise pb-1">
                  Förmånsbilskalkylator
                </span>
                <a href="https://b3.se/case" target="_blank" rel="noopener noreferrer" 
                   className="hover:text-b3-turquoise transition-colors flex items-center gap-1">
                  Case <ExternalLink size={14} />
                </a>
                <a href="https://b3.se/karriar" target="_blank" rel="noopener noreferrer"
                   className="hover:text-b3-turquoise transition-colors flex items-center gap-1">
                  Karriär <ExternalLink size={14} />
                </a>
              </nav>
            </div>
            <a href="https://b3.se/kontakt" target="_blank" rel="noopener noreferrer"
               className="hidden sm:flex items-center gap-2 bg-b3-turquoise hover:bg-b3-turquoise-dark text-white px-4 py-2 rounded-lg font-medium transition-colors">
              Kontakt
            </a>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="bg-gray-100 border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-6 py-12">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
            <div>
              <p className="text-sm font-medium text-b3-turquoise uppercase tracking-wider mb-2">
                Verktyg
              </p>
              <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
                Förmånsbilskalkylator
              </h1>
              <p className="text-lg text-gray-600 max-w-2xl">
                Jämför total ägandekostnad för förmånsbilar enligt B3s RAM-modell. 
                Beräkna förmånsvärde, RAM-kostnad och kostnad per mil baserat på dina personliga förutsättningar.
              </p>
            </div>
            <div className="flex-shrink-0">
              <button
                onClick={() => {
                  setEditingCar(null)
                  setIsModalOpen(true)
                }}
                className="flex items-center gap-2 bg-b3-turquoise hover:bg-b3-turquoise-dark text-white px-8 py-4 rounded-xl transition-all shadow-lg hover:shadow-xl font-semibold text-lg"
              >
                <Plus size={24} />
                Lägg till bil
              </button>
            </div>
          </div>
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
              />
            )}
          </div>
        </div>
      </main>

      {/* B3 Footer */}
      <footer className="bg-gray-900 text-white mt-auto">
        <div className="max-w-7xl mx-auto px-6 py-12">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Logo & tagline */}
            <div>
              <div className="bg-b3-turquoise text-white font-bold text-2xl px-3 py-1.5 rounded-lg inline-block mb-4">
                b3
              </div>
              <p className="text-gray-400 italic">Creating possibilities together</p>
            </div>

            {/* Contact */}
            <div>
              <h3 className="font-semibold text-lg mb-4">Kontakta oss</h3>
              <div className="space-y-2 text-gray-400">
                <p>Telefon: 08-410 143 40</p>
                <p>E-post: info@b3.se</p>
                <p>Besöksadress: Wallingatan 2, vån 5, Stockholm</p>
              </div>
            </div>

            {/* Links */}
            <div>
              <h3 className="font-semibold text-lg mb-4">Länkar</h3>
              <div className="space-y-2">
                <a href="https://b3.se" target="_blank" rel="noopener noreferrer" 
                   className="block text-gray-400 hover:text-b3-turquoise transition-colors">
                  b3.se
                </a>
                <a href="https://b3.se/karriar" target="_blank" rel="noopener noreferrer"
                   className="block text-gray-400 hover:text-b3-turquoise transition-colors">
                  Lediga tjänster
                </a>
                <a href="https://b3.se/case" target="_blank" rel="noopener noreferrer"
                   className="block text-gray-400 hover:text-b3-turquoise transition-colors">
                  Kundcase
                </a>
              </div>
            </div>
          </div>

          <div className="border-t border-gray-800 mt-8 pt-8 flex flex-col sm:flex-row justify-between items-center gap-4">
            <p className="text-gray-500 text-sm">
              © {new Date().getFullYear()} B3 Consulting Group. Alla rättigheter förbehållna.
            </p>
            <div className="flex gap-4 text-gray-500 text-sm">
              <a href="https://b3.se/integritetspolicy" target="_blank" rel="noopener noreferrer"
                 className="hover:text-b3-turquoise transition-colors">
                Integritetspolicy
              </a>
              <a href="https://b3.se/code-of-conduct" target="_blank" rel="noopener noreferrer"
                 className="hover:text-b3-turquoise transition-colors">
                Code of Conduct
              </a>
            </div>
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
