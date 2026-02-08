import { useState, useEffect, useRef, useMemo } from 'react'
import { X, Loader2, ChevronDown, Search } from 'lucide-react'
import { calculateBenefitValue, type CarInput, type CarCalculations } from '../lib/calculations'
import { calculateAnnualLeasing } from '../lib/skatteverketApi'
import { searchCarModels, type CarSearchResult } from '../lib/carSearchApi'

// Hårdkodad lista med bilmärken
const CAR_BRANDS = [
  'Alfa Romeo', 'Alpine', 'Audi', 'BMW', 'BYD', 'Cadillac', 'Citroën', 'Cupra', 
  'Dacia', 'Defender', 'Discovery', 'DS', 'Fiat', 'Ford', 'Honda', 'Hongqi', 
  'Hyundai', 'INEOS', 'JAC', 'Jaguar', 'Jeep', 'KGM', 'KIA', 'Lexus', 'Lotus', 
  'Lynk & Co', 'Mazda', 'Mercedes-Benz', 'MG', 'Mini', 'Mitsubishi', 'NIO', 
  'Nissan', 'Opel', 'ORA', 'Peugeot', 'Polestar', 'Porsche', 'Range Rover', 
  'Renault', 'Seat', 'Skoda', 'Smart', 'Subaru', 'Suzuki', 'Tesla', 'Toyota', 
  'Volkswagen', 'Volvo', 'WEY', 'Xpeng', 'Zeekr'
]

// Generera år: nuvarande år till 10 år bakåt
const currentYear = new Date().getFullYear()
const YEARS = Array.from({ length: 11 }, (_, i) => (currentYear - i).toString())

interface CarModalProps {
  car: CarCalculations | null
  onClose: () => void
  onSave: (car: CarInput) => Promise<void>
}

export default function CarModal({ car, onClose, onSave }: CarModalProps) {
  // Steg 1-3: År, Märke, Modell
  const [selectedYear, setSelectedYear] = useState(currentYear.toString())
  const [selectedBrand, setSelectedBrand] = useState('')
  const [selectedModelId, setSelectedModelId] = useState('')
  const [availableModels, setAvailableModels] = useState<CarSearchResult[]>([])
  const [isLoadingModels, setIsLoadingModels] = useState(false)
  const [modelSearchQuery, setModelSearchQuery] = useState('')
  const [isModelDropdownOpen, setIsModelDropdownOpen] = useState(false)
  const modelDropdownRef = useRef<HTMLDivElement>(null)
  const modelSearchInputRef = useRef<HTMLInputElement>(null)
  
  const [model, setModel] = useState('')
  const [nybilspris, setNybilspris] = useState('') // Skatteverkets nybilspris (för förmånsvärde)
  const [purchasePrice, setPurchasePrice] = useState('') // Faktiskt inköpspris (för leasing)
  const [benefitValue, setBenefitValue] = useState('')
  const [isElectric, setIsElectric] = useState(false)
  const [isPluginHybrid, setIsPluginHybrid] = useState(false)
  const [annualKm, setAnnualKm] = useState('15000')
  const [isLeasing, setIsLeasing] = useState(true) // Default true
  const [interestRate, setInterestRate] = useState('5') // Default 5%
  const [leasingPeriod, setLeasingPeriod] = useState('36') // Default 36 månader
  const [annualLeasingCost, setAnnualLeasingCost] = useState('')
  const [serviceMiles, setServiceMiles] = useState('500') // Default 500 mil/år (INGEN tjänstekörningsreduktion)
  const [residualValue, setResidualValue] = useState('50') // Default 50% restvärde
  const [insuranceIncludedInLeasing, setInsuranceIncludedInLeasing] = useState(false)
  const [maintenanceIncludedInLeasing, setMaintenanceIncludedInLeasing] = useState(false)
  const [autoCalculateBenefit, setAutoCalculateBenefit] = useState(true)
  
  // Nya fält för förmånsvärdesberäkning
  const [registeredAfterJuly2022, setRegisteredAfterJuly2022] = useState(true) // Default: ja
  const [vehicleTax, setVehicleTax] = useState('5292') // Default: schablonbelopp
  const [extraEquipment, setExtraEquipment] = useState('0') // Default: ingen extrautrustning
  const [electricRange, setElectricRange] = useState('') // Elektrisk räckvidd för laddhybrider
  
  // Filtrera modeller baserat på sökfråga
  const filteredModels = useMemo(() => {
    if (!modelSearchQuery.trim()) return availableModels
    const q = modelSearchQuery.toLowerCase()
    return availableModels.filter(m =>
      m.modell.toLowerCase().includes(q) ||
      m.bransletyp.toLowerCase().includes(q)
    )
  }, [availableModels, modelSearchQuery])

  // Stäng dropdown vid klick utanför
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (modelDropdownRef.current && !modelDropdownRef.current.contains(e.target as Node)) {
        setIsModelDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Ladda modeller när år och märke väljs
  useEffect(() => {
    if (selectedYear && selectedBrand) {
      setIsLoadingModels(true)
      setAvailableModels([])
      setSelectedModelId('')
      
      searchCarModels(selectedYear, selectedBrand)
        .then(models => {
          setAvailableModels(models)
          console.log(`📋 Loaded ${models.length} models for ${selectedBrand} ${selectedYear}`)
        })
        .catch(err => {
          console.error('Error loading models:', err)
        })
        .finally(() => {
          setIsLoadingModels(false)
        })
    }
  }, [selectedYear, selectedBrand])
  
  // Hantera modell-val
  const handleModelSelect = (modelId: string) => {
    setSelectedModelId(modelId)
    const selectedCar = availableModels.find(m => m.id === modelId)
    
    if (selectedCar) {
      // Sätt modellnamn
      setModel(`${selectedCar.marke} ${selectedCar.modell} (${selectedCar.tillverkningsar})`)
      
      // Sätt nybilspris (Skatteverket, för förmånsvärde) och inköpspris (för leasing)
      if (selectedCar.nybilspris > 0) {
        setNybilspris(selectedCar.nybilspris.toString())
        setPurchasePrice(selectedCar.nybilspris.toString()) // Förfyll med nybilspris, kan ändras
      }
      
      // Detektera drivlina
      const bransle = selectedCar.bransletyp?.toLowerCase() || ''
      const isElectricCar = bransle.includes('el') && !bransle.includes('hybrid')
      const isPluginHybridCar = bransle.includes('hybrid') || bransle.includes('laddhybrid')
      
      setIsElectric(isElectricCar)
      setIsPluginHybrid(isPluginHybridCar)
      
      // Sätt fordonsskatt
      if (isElectricCar) {
        setVehicleTax('0')
      } else if (selectedCar.fordonsskatt) {
        setVehicleTax(selectedCar.fordonsskatt.toString())
      } else {
        setVehicleTax('5292')
      }
      
      setAutoCalculateBenefit(true)
      console.log('🚗 Selected:', selectedCar.label, '- Price:', selectedCar.nybilspris)
    }
  }
  

  // Calculate leasing cost automatically with residual value and VAT adjustment
  useEffect(() => {
    if (isLeasing && purchasePrice && interestRate && leasingPeriod && residualValue) {
      const price = parseFloat(purchasePrice)
      const rate = parseFloat(interestRate)
      const months = parseInt(leasingPeriod)
      const residual = parseFloat(residualValue) / 100 // Convert percentage to decimal
      const miles = parseFloat(serviceMiles) || 0
      
      if (!isNaN(price) && !isNaN(rate) && !isNaN(months) && !isNaN(residual) && price > 0) {
        // Beräkna grundläggande leasingkostnad (inkl. moms)
        let annualCost = calculateAnnualLeasing(price, rate, months, residual)
        
        // Justera för momslättnad om ≥100 tjänstemil
        // Enligt C11: "B3 får lyfta halva momsen på leasing" om ≥100 tjänstemil
        const canLiftHalfVAT = miles >= 100
        if (canLiftHalfVAT) {
          // Moms är 25%, kan lyfta 50% av momsen
          // Ny kostnad = kostnad × (1 - 0.5 × 0.25) = kostnad × 0.875
          annualCost = annualCost * 0.875
          console.log('✅ Tjänstemil ≥100 → Kan lyfta halva momsen på leasing (-12.5%)')
        } else {
          console.log('⚠️ Tjänstemil <100 → Ingen moms lyfts på leasing')
        }
        
        setAnnualLeasingCost(Math.round(annualCost).toString())
      }
    }
  }, [isLeasing, purchasePrice, interestRate, leasingPeriod, residualValue, serviceMiles])

  useEffect(() => {
    if (car) {
      setModel(car.model)
      setNybilspris(car.purchasePrice.toString()) // Nybilspris från sparad data
      setPurchasePrice(car.purchasePrice.toString())
      setBenefitValue(car.benefitValue.toString())
      setIsElectric(car.isElectric || false)
      setIsPluginHybrid(car.isPluginHybrid || false)
      setAnnualKm((car.annualKm || 15000).toString())
      setIsLeasing(car.isLeasing !== undefined ? car.isLeasing : true)
      setInterestRate((car.interestRate || 5).toString())
      setLeasingPeriod((car.leasingPeriod || 36).toString())
      setAnnualLeasingCost((car.annualLeasingCost || 0).toString())
      setServiceMiles((car.serviceMiles || 500).toString())
      setResidualValue('50') // Default, kan läggas till i CarCalculations om behövs
      setInsuranceIncludedInLeasing(car.insuranceIncludedInLeasing || false)
      setMaintenanceIncludedInLeasing(car.maintenanceIncludedInLeasing || false)
      setRegisteredAfterJuly2022(car.registeredAfterJuly2022 !== undefined ? car.registeredAfterJuly2022 : true)
      setVehicleTax((car.vehicleTax || 5292).toString())
      setExtraEquipment((car.extraEquipment || 0).toString())
      setElectricRange((car.electricRange || 0).toString())
      setAutoCalculateBenefit(false)
    } else {
      setModel('')
      setNybilspris('')
      setPurchasePrice('')
      setBenefitValue('')
      setIsElectric(false)
      setIsPluginHybrid(false)
      setAnnualKm('15000')
      setIsLeasing(true) // Default true
      setInterestRate('5') // Default 5%
      setLeasingPeriod('36') // Default 36 månader
      setAnnualLeasingCost('')
      setServiceMiles('500') // Default 500 mil (INGEN tjänstekörningsreduktion)
      setResidualValue('50') // Default 50% restvärde
      setRegisteredAfterJuly2022(true) // Default: ja (efter 1 juli 2022)
      setVehicleTax('5292') // Default: schablonbelopp
      setExtraEquipment('0')
      setElectricRange('')
      setAutoCalculateBenefit(true)
    }
  }, [car])

  useEffect(() => {
    if (autoCalculateBenefit && nybilspris) {
      const price = parseFloat(nybilspris)
      const tax = parseFloat(vehicleTax) || 0
      const equipment = parseFloat(extraEquipment) || 0
      const range = parseFloat(electricRange) || undefined
      const miles = parseFloat(serviceMiles) || 3000
      
      if (!isNaN(price) && price > 0) {
        const calculated = calculateBenefitValue(
          price,
          isElectric,
          isPluginHybrid,
          range,
          registeredAfterJuly2022,
          tax,
          equipment,
          miles
        )
        setBenefitValue(calculated.toString())
      }
    }
  }, [
    nybilspris,
    isElectric,
    isPluginHybrid,
    electricRange,
    registeredAfterJuly2022,
    vehicleTax,
    extraEquipment,
    serviceMiles,
    autoCalculateBenefit
  ])


  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    const price = parseFloat(purchasePrice)
    const benefit = parseFloat(benefitValue)
    const km = parseFloat(annualKm)

    if (!model.trim()) {
      alert('Vänligen ange bilmodell')
      return
    }

    if (isNaN(price) || price <= 0) {
      alert('Vänligen ange ett giltigt inköpspris')
      return
    }

    if (isNaN(benefit) || benefit < 0) {
      alert('Vänligen ange ett giltigt förmånsvärde')
      return
    }

    if (isNaN(km) || km <= 0) {
      alert('Vänligen ange ett giltigt antal kilometer per år')
      return
    }

    const carData: CarInput = {
      id: car?.id,
      model: model.trim(),
      purchasePrice: price,
      benefitValue: benefit,
      isElectric,
      isPluginHybrid,
      annualKm: km,
      isLeasing,
      interestRate: isLeasing && interestRate ? parseFloat(interestRate) : undefined,
      leasingPeriod: isLeasing && leasingPeriod ? parseInt(leasingPeriod) : undefined,
      annualLeasingCost: isLeasing && annualLeasingCost ? parseFloat(annualLeasingCost) : undefined,
      serviceMiles: serviceMiles ? parseFloat(serviceMiles) : undefined,
      insuranceIncludedInLeasing: isLeasing ? insuranceIncludedInLeasing : undefined,
      maintenanceIncludedInLeasing: isLeasing ? maintenanceIncludedInLeasing : undefined,
      registeredAfterJuly2022,
      vehicleTax: vehicleTax ? parseFloat(vehicleTax) : undefined,
      extraEquipment: extraEquipment ? parseFloat(extraEquipment) : undefined,
      electricRange: electricRange ? parseFloat(electricRange) : undefined
    }

    console.log('💾 Saving car data:', carData)
    try {
      await onSave(carData)
      console.log('✅ Car saved successfully')
    } catch (error) {
      console.error('❌ Error saving car:', error)
      alert('Kunde inte spara bilen. Se konsolen för mer information.')
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-b3 shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto border-t-8 border-b3-turquoise">
        <div className="sticky top-0 bg-white border-b-2 border-b3-beige px-6 py-4 flex justify-between items-center rounded-t-b3">
          <div className="flex items-center gap-3">
            <div className="bg-b3-turquoise text-white font-bold text-xl px-3 py-1 rounded-lg">
              B3
            </div>
            <h2 className="text-2xl font-bold text-b3-grey">
              {car ? 'Redigera bil' : 'Lägg till bil'}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="text-b3-grey-light hover:text-b3-grey transition-colors"
          >
            <X size={24} />
          </button>
        </div>

        <form onSubmit={handleSubmit} noValidate className="p-6 space-y-6">
          {/* Steg 1-3: Välj bil */}
          <div className="bg-gray-50 p-4 rounded-lg space-y-4">
            <h3 className="font-semibold text-gray-700 flex items-center gap-2">
              <span className="bg-b3-turquoise text-white w-6 h-6 rounded-full flex items-center justify-center text-sm">1</span>
              Välj bil från Skatteverkets databas
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Steg 1: Tillverkningsår */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Tillverkningsår *
                </label>
                <div className="relative">
                  <select
                    value={selectedYear}
                    onChange={(e) => setSelectedYear(e.target.value)}
                    className="w-full px-4 py-2 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-b3-turquoise focus:border-transparent appearance-none bg-white"
                  >
                    {YEARS.map(year => (
                      <option key={year} value={year}>{year}</option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" size={18} />
                </div>
              </div>
              
              {/* Steg 2: Bilmärke */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Bilmärke *
                </label>
                <div className="relative">
                  <select
                    value={selectedBrand}
                    onChange={(e) => setSelectedBrand(e.target.value)}
                    className="w-full px-4 py-2 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-b3-turquoise focus:border-transparent appearance-none bg-white"
                  >
                    <option value="">Välj märke...</option>
                    {CAR_BRANDS.map(brand => (
                      <option key={brand} value={brand}>{brand}</option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" size={18} />
                </div>
              </div>
              
              {/* Steg 3: Bilmodell (sökbar dropdown) */}
              <div ref={modelDropdownRef}>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Bilmodell *
                </label>
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => {
                      if (selectedBrand && !isLoadingModels) {
                        setIsModelDropdownOpen(!isModelDropdownOpen)
                        setModelSearchQuery('')
                        setTimeout(() => modelSearchInputRef.current?.focus(), 50)
                      }
                    }}
                    disabled={!selectedBrand || isLoadingModels}
                    className="w-full px-4 py-2 pr-10 border border-gray-300 rounded-lg text-left bg-white disabled:bg-gray-100 disabled:text-gray-500 focus:ring-2 focus:ring-b3-turquoise focus:border-transparent"
                  >
                    {isLoadingModels ? (
                      'Laddar modeller...'
                    ) : !selectedBrand ? (
                      'Välj märke först...'
                    ) : availableModels.length === 0 ? (
                      'Inga modeller hittades'
                    ) : selectedModelId ? (
                      <span className="truncate block">
                        {availableModels.find(m => m.id === selectedModelId)?.modell || 'Välj modell...'}
                      </span>
                    ) : (
                      'Välj modell...'
                    )}
                  </button>
                  {isLoadingModels ? (
                    <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 text-b3-turquoise animate-spin" size={18} />
                  ) : (
                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" size={18} />
                  )}

                  {/* Dropdown med sökfält */}
                  {isModelDropdownOpen && availableModels.length > 0 && (
                    <div className="absolute z-50 mt-1 w-full bg-white border border-gray-300 rounded-lg shadow-xl max-h-80 flex flex-col">
                      {/* Sökfält */}
                      <div className="p-2 border-b border-gray-200 sticky top-0 bg-white">
                        <div className="relative">
                          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                          <input
                            ref={modelSearchInputRef}
                            type="text"
                            value={modelSearchQuery}
                            onChange={(e) => setModelSearchQuery(e.target.value)}
                            placeholder="Sök modell..."
                            className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-md text-sm focus:ring-2 focus:ring-b3-turquoise focus:border-transparent"
                          />
                        </div>
                        <p className="text-xs text-gray-400 mt-1">
                          {filteredModels.length} av {availableModels.length} modeller
                        </p>
                      </div>

                      {/* Modellista */}
                      <div className="overflow-y-auto flex-1">
                        {filteredModels.length === 0 ? (
                          <div className="p-3 text-sm text-gray-500 text-center">
                            Inga modeller matchar "{modelSearchQuery}"
                          </div>
                        ) : (
                          filteredModels.map(m => (
                            <button
                              key={m.id}
                              type="button"
                              onClick={() => {
                                handleModelSelect(m.id)
                                setIsModelDropdownOpen(false)
                                setModelSearchQuery('')
                              }}
                              className={`w-full text-left px-3 py-2 text-sm hover:bg-b3-turquoise hover:bg-opacity-10 transition-colors ${
                                selectedModelId === m.id ? 'bg-b3-turquoise bg-opacity-15 font-medium' : ''
                              }`}
                            >
                              {m.modell} <span className="text-gray-400">({m.bransletyp})</span> – {m.nybilspris.toLocaleString('sv-SE')} kr
                            </button>
                          ))
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
            
            {/* Manuell inmatning */}
            {selectedBrand && availableModels.length === 0 && !isLoadingModels && (
              <div className="mt-3 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                <p className="text-sm text-yellow-800">
                  Inga modeller hittades för {selectedBrand} {selectedYear}. 
                  Du kan fylla i biluppgifterna manuellt nedan.
                </p>
              </div>
            )}
            
            {/* Visa vald bil */}
            {model && (
              <div className="mt-3 p-3 bg-b3-turquoise bg-opacity-10 border border-b3-turquoise border-opacity-30 rounded-lg">
                <p className="text-sm text-b3-turquoise-darker font-medium">
                  ✓ Vald bil: {model}
                </p>
              </div>
            )}
          </div>
          
          {/* Manuell inmatning av modellnamn om ingen valdes */}
          {!model && (
            <div>
              <label htmlFor="manualModel" className="block text-sm font-medium text-gray-700 mb-2">
                Eller ange bilmodell manuellt
              </label>
              <input
                type="text"
                id="manualModel"
                value={model}
                onChange={(e) => setModel(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-b3-turquoise focus:border-transparent"
                placeholder="T.ex. Volvo XC90 T8"
              />
            </div>
          )}

          <div>
            <label htmlFor="nybilspris" className="block text-sm font-medium text-gray-700 mb-2">
              Nybilspris enligt Skatteverket (kr) *
            </label>
            <input
              type="number"
              id="nybilspris"
              value={nybilspris}
              onChange={(e) => setNybilspris(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-b3-turquoise focus:border-transparent bg-gray-50"
              placeholder="Fylls i automatiskt vid modellval"
              min="0"
              step="1"
              required
            />
            <p className="text-xs text-gray-500 mt-1">
              Används för beräkning av förmånsvärde. Hämtas automatiskt från Skatteverkets databas.
            </p>
          </div>

          <div>
            <label htmlFor="purchasePrice" className="block text-sm font-medium text-gray-700 mb-2">
              Faktiskt inköpspris (kr) *
            </label>
            <input
              type="number"
              id="purchasePrice"
              value={purchasePrice}
              onChange={(e) => setPurchasePrice(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-b3-turquoise focus:border-transparent"
              placeholder="t.ex. 450000"
              min="0"
              step="1"
              required
            />
            <p className="text-xs text-gray-500 mt-1">
              Priset du faktiskt betalar. Används för leasingberäkning. Kan skilja från nybilspris vid rabatt/tillval.
            </p>
          </div>

          <div>
            <label htmlFor="annualKm" className="block text-sm font-medium text-gray-700 mb-2">
              Årlig körsträcka (km) *
            </label>
            <input
              type="number"
              id="annualKm"
              value={annualKm}
              onChange={(e) => setAnnualKm(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-b3-turquoise focus:border-transparent"
              placeholder="t.ex. 15000"
              min="0"
              step="1000"
              required
            />
            <p className="text-sm text-gray-500 mt-1">Standard: 15 000 km/år</p>
          </div>

          <div>
            <label className="flex items-center gap-2 cursor-pointer mb-4">
              <input
                type="checkbox"
                checked={isLeasing}
                onChange={(e) => setIsLeasing(e.target.checked)}
                className="w-4 h-4 text-b3-turquoise border-gray-300 rounded focus:ring-b3-turquoise"
              />
              <span className="text-sm font-medium text-gray-700">Leasing (istället för köp)</span>
            </label>

            {isLeasing && (
              <div className="space-y-4 pl-6 border-l-2 border-b3-blue-light">
                {/* Ränta */}
                <div>
                  <label htmlFor="interestRate" className="block text-sm font-medium text-gray-700 mb-2">
                    Ränta (%)
                  </label>
                  <input
                    type="number"
                    id="interestRate"
                    value={interestRate}
                    onChange={(e) => setInterestRate(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-b3-turquoise focus:border-transparent"
                    placeholder="5"
                    min="0"
                    max="20"
                    step="0.1"
                  />
                  <p className="text-sm text-gray-500 mt-1">Standard: 5%</p>
                </div>

                {/* Leasingperiod */}
                <div>
                  <label htmlFor="leasingPeriod" className="block text-sm font-medium text-gray-700 mb-2">
                    Leasingperiod (månader)
                  </label>
                  <input
                    type="number"
                    id="leasingPeriod"
                    value={leasingPeriod}
                    onChange={(e) => setLeasingPeriod(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-b3-turquoise focus:border-transparent"
                    placeholder="36"
                    min="12"
                    max="72"
                    step="12"
                  />
                  <p className="text-sm text-gray-500 mt-1">Standard: 36 månader (3 år)</p>
                </div>

                {/* Restvärde (slider 45-55%) */}
                <div>
                  <label htmlFor="residualValue" className="block text-sm font-medium text-gray-700 mb-2">
                    Restvärde efter leasingperiod: {residualValue}%
                  </label>
                  <div className="flex items-center gap-4">
                    <span className="text-sm text-gray-500">45%</span>
                    <input
                      type="range"
                      id="residualValue"
                      value={residualValue}
                      onChange={(e) => setResidualValue(e.target.value)}
                      className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                      min="45"
                      max="55"
                      step="1"
                    />
                    <span className="text-sm text-gray-500">55%</span>
                  </div>
                  <p className="text-sm text-gray-500 mt-1">
                    {purchasePrice && `Uppskattat restvärde: ${Math.round(parseFloat(purchasePrice) * parseFloat(residualValue) / 100).toLocaleString('sv-SE')} kr`}
                  </p>
                </div>

                {/* Beräknad leasingkostnad (read-only) */}
                <div className="space-y-3 bg-b3-turquoise bg-opacity-10 p-3 rounded-lg border border-b3-turquoise border-opacity-30">
                  <div>
                    <label htmlFor="annualLeasingCost" className="block text-sm font-medium text-gray-700 mb-2">
                      Årlig leasingkostnad (kr inkl. moms) - Beräknad
                    </label>
                    <input
                      type="number"
                      id="annualLeasingCost"
                      value={annualLeasingCost}
                      readOnly
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-white cursor-not-allowed font-semibold text-lg"
                      placeholder="Beräknas automatiskt"
                    />
                  </div>
                  
                  {annualLeasingCost && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Månatlig leasingkostnad (kr inkl. moms) - Beräknad
                      </label>
                      <div className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-white font-semibold text-lg text-b3-turquoise">
                        {Math.round(parseFloat(annualLeasingCost) / 12).toLocaleString('sv-SE')} kr/mån
                      </div>
                    </div>
                  )}
                  
                  <p className="text-sm text-gray-600 mt-2">
                    Beräknas från: Inköpspris, Restvärde, Ränta, Period
                    {parseFloat(serviceMiles) >= 100 && (
                      <span className="block text-green-700 font-medium mt-1">
                        ✅ Halva momsen kan lyftas (≥100 tjänstemil) → -12.5%
                      </span>
                    )}
                    {parseFloat(serviceMiles) < 100 && serviceMiles && (
                      <span className="block text-orange-600 font-medium mt-1">
                        ⚠️ Ingen moms lyfts (&lt;100 tjänstemil)
                      </span>
                    )}
                  </p>
                </div>

              </div>
            )}
          </div>

          {/* NYA FÄLT FÖR FÖRMÅNSVÄRDESBERÄKNING */}
          <div className="bg-b3-blue-light bg-opacity-20 p-4 rounded-lg space-y-4 border border-b3-blue-light">
            <h3 className="font-semibold text-b3-grey mb-3">Parametrar för förmånsvärdesberäkning</h3>
            
            {/* Registreringsdatum */}
            <div>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={registeredAfterJuly2022}
                  onChange={(e) => setRegisteredAfterJuly2022(e.target.checked)}
                  className="w-4 h-4 text-b3-turquoise border-gray-300 rounded focus:ring-b3-turquoise"
                />
                <span className="text-sm font-medium text-gray-700">
                  Bilen registrerades (togs i trafik) efter 1 juli 2022
                </span>
              </label>
              <p className="text-sm text-gray-500 mt-1 ml-6">
                📅 Använder schablonbelopp (5 292 kr) för beräkningen
              </p>
            </div>

            {/* Fordonsskatt */}
            <div>
              <label htmlFor="vehicleTax" className="block text-sm font-medium text-gray-700 mb-2">
                Bilens fordonsskatt för 2026 (kr/år){' '}
                <a
                  href="https://fordon-fu-regnr.transportstyrelsen.se/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-b3-turquoise hover:underline text-xs font-normal"
                >
                  Sök fordonsskatt ↗
                </a>
              </label>
              <input
                type="text"
                inputMode="numeric"
                id="vehicleTax"
                value={vehicleTax}
                onChange={(e) => {
                  const value = e.target.value.replace(/[^0-9]/g, '')
                  setVehicleTax(value)
                }}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-b3-turquoise focus:border-transparent"
                placeholder="5292"
              />
              <p className="text-sm text-gray-500 mt-1">
                {registeredAfterJuly2022 
                  ? 'Fyll i bilens faktiska fordonsskatt från Transportstyrelsen (används i förmånsvärdet)' 
                  : 'Används endast för äldre bilar (före 1 juli 2022)'}
              </p>
            </div>

            {/* Extrautrustning */}
            <div>
              <label htmlFor="extraEquipment" className="block text-sm font-medium text-gray-700 mb-2">
                Summa för bilens extrautrustning (kr)
              </label>
              <input
                type="number"
                id="extraEquipment"
                value={extraEquipment}
                onChange={(e) => setExtraEquipment(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-b3-turquoise focus:border-transparent"
                placeholder="0"
                min="0"
                step="1000"
              />
              <p className="text-sm text-gray-500 mt-1">
                Läggs till inköpspriset vid beräkning av förmånsvärde
              </p>
            </div>

            {/* Tjänstemil (flyttad hit) */}
            <div>
              <label htmlFor="serviceMiles" className="block text-sm font-medium text-gray-700 mb-2">
                Tjänstemil per år (mil)
              </label>
              <input
                type="number"
                id="serviceMiles"
                value={serviceMiles}
                onChange={(e) => setServiceMiles(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-b3-turquoise focus:border-transparent"
                placeholder="500"
                min="0"
                step="100"
              />
              <p className="text-sm text-gray-500 mt-1">
                {parseFloat(serviceMiles) >= 3000 
                  ? '✅ Bilen körs ≥3000 mil i tjänsten → 25% reduktion på grundbelopp!'
                  : parseFloat(serviceMiles) < 100 
                    ? '⚠️ Vid <100 mil/år lyfts ingen moms på leasing' 
                    : '💡 Vid ≥3000 mil/år får du 25% reduktion på förmånsvärde (grundbelopp)'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={isElectric}
                onChange={(e) => {
                  setIsElectric(e.target.checked)
                  if (e.target.checked) setIsPluginHybrid(false)
                }}
                className="w-4 h-4 text-b3-turquoise border-gray-300 rounded focus:ring-b3-turquoise"
              />
              <span className="text-sm font-medium text-gray-700">Elbil</span>
            </label>

            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={isPluginHybrid}
                onChange={(e) => {
                  setIsPluginHybrid(e.target.checked)
                  if (e.target.checked) setIsElectric(false)
                }}
                className="w-4 h-4 text-b3-turquoise border-gray-300 rounded focus:ring-b3-turquoise"
              />
              <span className="text-sm font-medium text-gray-700">Laddhybrid</span>
            </label>
          </div>

          {/* Elektrisk räckvidd (endast för laddhybrider) */}
          {isPluginHybrid && (
            <div>
              <label htmlFor="electricRange" className="block text-sm font-medium text-gray-700 mb-2">
                Elektrisk räckvidd (km) - för laddhybrider
              </label>
              <input
                type="number"
                id="electricRange"
                value={electricRange}
                onChange={(e) => setElectricRange(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-b3-turquoise focus:border-transparent"
                placeholder="t.ex. 60"
                min="0"
                step="5"
              />
              <p className="text-sm text-gray-500 mt-1">
                Påverkar miljöbilsreduktionen (längre räckvidd = högre reduktion)
              </p>
            </div>
          )}

          <div className="bg-b3-turquoise bg-opacity-10 p-4 rounded-lg border border-b3-turquoise border-opacity-30">
            <div className="flex items-center justify-between mb-2">
              <label htmlFor="benefitValue" className="block text-sm font-medium text-gray-700">
                Förmånsvärde *
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={autoCalculateBenefit}
                  onChange={(e) => setAutoCalculateBenefit(e.target.checked)}
                  className="w-4 h-4 text-b3-turquoise border-gray-300 rounded focus:ring-b3-turquoise"
                />
                <span className="text-sm text-gray-600">Beräkna automatiskt</span>
              </label>
            </div>
            
            {/* Visar både per år och per månad */}
            <div className="space-y-3">
              <div className="relative">
                <label className="block text-xs text-gray-600 mb-1">Per år (kr)</label>
                <input
                  type="number"
                  id="benefitValue"
                  value={benefitValue}
                  onChange={(e) => {
                    setBenefitValue(e.target.value)
                    setAutoCalculateBenefit(false)
                  }}
                  disabled={autoCalculateBenefit}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-b3-turquoise focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed text-lg font-semibold"
                  placeholder="Beräknas automatiskt"
                  min="0"
                  step="100"
                  required
                />
                {autoCalculateBenefit && benefitValue && (
                  <div className="absolute right-3 top-8 transform -translate-y-1/2 text-green-600">
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                  </div>
                )}
              </div>
              
              {benefitValue && (
                <div className="bg-white p-3 rounded border border-gray-200">
                  <div className="text-xs text-gray-600 mb-1">Per månad (kr)</div>
                  <div className="text-lg font-semibold text-b3-turquoise">
                    {Math.round(parseFloat(benefitValue) / 12).toLocaleString('sv-SE')} kr/mån
                  </div>
                </div>
              )}
            </div>
            
            <p className="text-sm text-gray-600 mt-3">
              {autoCalculateBenefit ? (
                <>
                  ✅ Beräknas automatiskt enligt Skatteverkets regler 2026
                  {parseFloat(serviceMiles) >= 3000 && <span className="text-green-700 font-medium block mt-1">🚗 Tjänstekörningsreduktion: -25% på grundbelopp</span>}
                  {isElectric && <span className="text-green-700 font-medium block mt-1">⚡ Elbilsreduktion: -10 000 kr/år</span>}
                  {isPluginHybrid && <span className="text-green-700 font-medium block mt-1">🔌 Laddhybridreduktion tillämpad</span>}
                </>
              ) : (
                'Manuellt angivet värde (autoberäkning av)'
              )}
            </p>
          </div>

          <div className="flex gap-4 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-3 border-2 border-gray-300 text-b3-grey rounded-b3 hover:bg-b3-beige transition-colors font-semibold"
            >
              Avbryt
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-3 bg-b3-turquoise text-white rounded-b3 hover:bg-b3-turquoise-dark transition-all shadow-md hover:shadow-lg font-semibold"
            >
              {car ? 'Uppdatera' : 'Lägg till'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

