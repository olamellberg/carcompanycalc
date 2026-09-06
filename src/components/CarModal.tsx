import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react'
import { ChevronDown, ExternalLink, Fuel, Loader2, PlugZap, Search, Zap } from 'lucide-react'
import {
  calculateAnnualLeasing,
  calculateBenefitValueBreakdown,
  type CarCalculations,
  type CarInput,
} from '../lib/calculations'
import { searchCarModels, type CarSearchResult } from '../lib/carSearchApi'
import { fmtInt } from '../lib/format'
import { Dialog } from './ui/Dialog'
import { Field, Select, TextInput } from './ui/Field'

// Hårdkodad lista med bilmärken
const CAR_BRANDS = [
  'Alfa Romeo', 'Alpine', 'Audi', 'BMW', 'BYD', 'Cadillac', 'Citroën', 'Cupra',
  'Dacia', 'Defender', 'Discovery', 'DS', 'Fiat', 'Ford', 'Honda', 'Hongqi',
  'Hyundai', 'INEOS', 'JAC', 'Jaguar', 'Jeep', 'KGM', 'KIA', 'Lexus', 'Lotus',
  'Lynk & Co', 'Mazda', 'Mercedes-Benz', 'MG', 'Mini', 'Mitsubishi', 'NIO',
  'Nissan', 'Opel', 'ORA', 'Peugeot', 'Polestar', 'Porsche', 'Range Rover',
  'Renault', 'Seat', 'Skoda', 'Smart', 'Subaru', 'Suzuki', 'Tesla', 'Toyota',
  'Volkswagen', 'Volvo', 'WEY', 'Xpeng', 'Zeekr',
]

// Generera år: nuvarande år till 10 år bakåt
const currentYear = new Date().getFullYear()
const YEARS = Array.from({ length: 11 }, (_, i) => (currentYear - i).toString())

const DEFAULT_ANNUAL_KM = 15000
const ELECTRIC_VEHICLE_TAX = '360' // Grundavgift för elbil när registret saknar uppgift

type Drivetrain = 'ice' | 'electric' | 'hybrid'

interface FormErrors {
  model?: string
  purchasePrice?: string
  benefitValue?: string
}

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
  const [isLeasing, setIsLeasing] = useState(true)
  const [interestRate, setInterestRate] = useState('5')
  const [leasingPeriod, setLeasingPeriod] = useState('36')
  const [annualLeasingCost, setAnnualLeasingCost] = useState('')
  const [serviceMiles, setServiceMiles] = useState('500') // 500 mil/år = ingen tjänstekörningsreduktion
  const [residualValue, setResidualValue] = useState('50')
  const [insuranceIncludedInLeasing, setInsuranceIncludedInLeasing] = useState(false)
  const [autoCalculateBenefit, setAutoCalculateBenefit] = useState(true)
  const [registeredAfterJuly2022, setRegisteredAfterJuly2022] = useState(true)
  const [vehicleTax, setVehicleTax] = useState('')
  const [extraEquipment, setExtraEquipment] = useState('0')

  const [errors, setErrors] = useState<FormErrors>({})
  const [saveError, setSaveError] = useState('')
  const [saving, setSaving] = useState(false)

  const drivetrain: Drivetrain = isElectric ? 'electric' : isPluginHybrid ? 'hybrid' : 'ice'
  const setDrivetrain = (value: Drivetrain) => {
    setIsElectric(value === 'electric')
    setIsPluginHybrid(value === 'hybrid')
  }

  // Filtrera modeller baserat på sökfråga
  const filteredModels = useMemo(() => {
    if (!modelSearchQuery.trim()) return availableModels
    const q = modelSearchQuery.toLowerCase()
    return availableModels.filter(
      (m) => m.modell.toLowerCase().includes(q) || m.bransletyp.toLowerCase().includes(q)
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
        .then((models) => setAvailableModels(models))
        .catch((err) => console.error('Error loading models:', err))
        .finally(() => setIsLoadingModels(false))
    }
  }, [selectedYear, selectedBrand])

  // Hantera modell-val
  const handleModelSelect = (modelId: string) => {
    setSelectedModelId(modelId)
    const selectedCar = availableModels.find((m) => m.id === modelId)
    if (!selectedCar) return

    setModel(`${selectedCar.marke} ${selectedCar.modell} (${selectedCar.tillverkningsar})`)

    // Nybilspris (Skatteverket, för förmånsvärde) och inköpspris (för leasing)
    if (selectedCar.nybilspris > 0) {
      setNybilspris(selectedCar.nybilspris.toString())
      setPurchasePrice(selectedCar.nybilspris.toString())
    }

    // Detektera drivlina
    const bransle = selectedCar.bransletyp?.toLowerCase() || ''
    const isElectricCar = bransle.includes('el') && !bransle.includes('hybrid')
    const isPluginHybridCar = bransle.includes('hybrid') || bransle.includes('laddhybrid')
    setIsElectric(isElectricCar)
    setIsPluginHybrid(isPluginHybridCar)

    // Fordonsskatt från registret om den finns, annars grundavgiften för elbil eller tomt
    if (selectedCar.fordonsskatt) {
      setVehicleTax(selectedCar.fordonsskatt.toString())
    } else {
      setVehicleTax(isElectricCar ? ELECTRIC_VEHICLE_TAX : '')
    }

    setAutoCalculateBenefit(true)
  }

  // Beräkna leasingkostnad (annuitet med restvärde, momsjustering vid ≥100 tjänstemil)
  useEffect(() => {
    if (isLeasing && purchasePrice && interestRate && leasingPeriod && residualValue) {
      const price = parseFloat(purchasePrice)
      const rate = parseFloat(interestRate)
      const months = parseInt(leasingPeriod)
      const residual = parseFloat(residualValue) / 100
      const miles = parseFloat(serviceMiles) || 0

      if (!isNaN(price) && !isNaN(rate) && !isNaN(months) && !isNaN(residual) && price > 0) {
        let annualCost = calculateAnnualLeasing(price, rate, months, residual)
        // Enligt C11: B3 får lyfta halva momsen på leasing om ≥100 tjänstemil.
        // Moms 25 %, halva lyfts: kostnad × (1 − 0,5 × 0,25) = kostnad × 0,875
        if (miles >= 100) {
          annualCost = annualCost * 0.875
        }
        setAnnualLeasingCost(Math.round(annualCost).toString())
      }
    }
  }, [isLeasing, purchasePrice, interestRate, leasingPeriod, residualValue, serviceMiles])

  // Fyll formuläret vid redigering, nollställ vid ny bil
  useEffect(() => {
    if (car) {
      setModel(car.model)
      setNybilspris(car.purchasePrice.toString())
      setPurchasePrice(car.purchasePrice.toString())
      setBenefitValue(car.benefitValue.toString())
      setIsElectric(car.isElectric || false)
      setIsPluginHybrid(car.isPluginHybrid || false)
      setIsLeasing(car.isLeasing !== undefined ? car.isLeasing : true)
      setInterestRate((car.interestRate || 5).toString())
      setLeasingPeriod((car.leasingPeriod || 36).toString())
      setAnnualLeasingCost((car.annualLeasingCost || 0).toString())
      setServiceMiles((car.serviceMiles || 500).toString())
      setResidualValue('50')
      setInsuranceIncludedInLeasing(car.insuranceIncludedInLeasing || false)
      setRegisteredAfterJuly2022(car.registeredAfterJuly2022 !== undefined ? car.registeredAfterJuly2022 : true)
      setVehicleTax(car.vehicleTax != null ? car.vehicleTax.toString() : '')
      setExtraEquipment((car.extraEquipment || 0).toString())
      setAutoCalculateBenefit(false)
    } else {
      setModel('')
      setNybilspris('')
      setPurchasePrice('')
      setBenefitValue('')
      setIsElectric(false)
      setIsPluginHybrid(false)
      setIsLeasing(true)
      setInterestRate('5')
      setLeasingPeriod('36')
      setAnnualLeasingCost('')
      setServiceMiles('500')
      setResidualValue('50')
      setRegisteredAfterJuly2022(true)
      setVehicleTax('')
      setExtraEquipment('0')
      setAutoCalculateBenefit(true)
    }
  }, [car])

  // Förmånsvärdets uppställning enligt Skatteverket (visas i formuläret och styr autoberäkningen)
  const benefitBreakdown = useMemo(() => {
    const price = parseFloat(nybilspris)
    if (isNaN(price) || price <= 0) return null
    return calculateBenefitValueBreakdown(
      price,
      isElectric,
      isPluginHybrid,
      registeredAfterJuly2022,
      parseFloat(vehicleTax) || 0,
      parseFloat(extraEquipment) || 0,
      parseFloat(serviceMiles) || 0
    )
  }, [nybilspris, isElectric, isPluginHybrid, registeredAfterJuly2022, vehicleTax, extraEquipment, serviceMiles])

  useEffect(() => {
    if (autoCalculateBenefit && benefitBreakdown) {
      setBenefitValue(benefitBreakdown.total.toString())
    }
  }, [autoCalculateBenefit, benefitBreakdown])

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()

    const price = parseFloat(purchasePrice)
    const benefit = parseFloat(benefitValue)

    const nextErrors: FormErrors = {}
    if (!model.trim()) nextErrors.model = 'Ange ett namn på bilen.'
    if (isNaN(price) || price <= 0) nextErrors.purchasePrice = 'Ange ett inköpspris över 0 kr.'
    if (isNaN(benefit) || benefit < 0) nextErrors.benefitValue = 'Ange ett förmånsvärde.'
    setErrors(nextErrors)
    if (Object.keys(nextErrors).length > 0) return

    const carData: CarInput = {
      id: car?.id,
      model: model.trim(),
      purchasePrice: price,
      benefitValue: benefit,
      isElectric,
      isPluginHybrid,
      annualKm: car?.annualKm ?? DEFAULT_ANNUAL_KM,
      isLeasing,
      interestRate: isLeasing && interestRate ? parseFloat(interestRate) : undefined,
      leasingPeriod: isLeasing && leasingPeriod ? parseInt(leasingPeriod) : undefined,
      annualLeasingCost: isLeasing && annualLeasingCost ? parseFloat(annualLeasingCost) : undefined,
      serviceMiles: serviceMiles ? parseFloat(serviceMiles) : undefined,
      insuranceIncludedInLeasing: isLeasing ? insuranceIncludedInLeasing : undefined,
      registeredAfterJuly2022,
      vehicleTax: vehicleTax ? parseFloat(vehicleTax) : undefined,
      extraEquipment: extraEquipment ? parseFloat(extraEquipment) : undefined,
    }

    setSaving(true)
    setSaveError('')
    try {
      await onSave(carData)
    } catch (error) {
      const detail = error instanceof Error ? ` ${error.message}` : ''
      setSaveError(`Bilen kunde inte sparas.${detail}`)
    } finally {
      setSaving(false)
    }
  }

  const noModelsFound = !!selectedBrand && availableModels.length === 0 && !isLoadingModels
  const selectedModel = availableModels.find((m) => m.id === selectedModelId)
  const miles = parseFloat(serviceMiles) || 0
  const priceNumber = parseFloat(purchasePrice)
  const residualKr = !isNaN(priceNumber) ? Math.round((priceNumber * parseFloat(residualValue)) / 100) : null
  const benefitNumber = parseFloat(benefitValue)
  const leasingNumber = parseFloat(annualLeasingCost)

  const serviceMilesHint =
    miles >= 3000
      ? 'Minst 3 000 mil sätter ned förmånsvärdet till 75 %.'
      : miles < 100
        ? 'Under 100 mil lyfts ingen moms på leasingen.'
        : 'Minst 100 mil gör att halva momsen lyfts på leasingen. Minst 3 000 mil sätter ned förmånsvärdet till 75 %.'

  return (
    <Dialog
      title={car ? 'Redigera bil' : 'Lägg till bil'}
      description={car ? undefined : 'Hämta uppgifter från Skatteverkets register eller fyll i dem själv.'}
      onClose={onClose}
      footer={
        <>
          {saveError && (
            <p className="field-error mr-auto !mt-0" role="alert">
              {saveError}
            </p>
          )}
          <button type="button" className="btn btn-secondary" onClick={onClose} disabled={saving}>
            Avbryt
          </button>
          <button type="submit" form="car-form" className="btn btn-primary" disabled={saving}>
            {saving ? 'Sparar…' : car ? 'Spara ändringar' : 'Lägg till bil'}
          </button>
        </>
      }
    >
      <form id="car-form" onSubmit={handleSubmit} noValidate className="space-y-8">
        {/* Bil */}
        <fieldset className="min-w-0 space-y-4">
          <legend className="mb-1 font-semibold">Bil</legend>

          <div className="grid gap-3 sm:grid-cols-3">
            <Field label="Årsmodell" htmlFor="year">
              <Select id="year" value={selectedYear} onChange={(e) => setSelectedYear(e.target.value)}>
                {YEARS.map((year) => (
                  <option key={year} value={year}>
                    {year}
                  </option>
                ))}
              </Select>
            </Field>

            <Field label="Märke" htmlFor="brand">
              <Select
                id="brand"
                value={selectedBrand}
                onChange={(e) => setSelectedBrand(e.target.value)}
                data-autofocus
              >
                <option value="">Välj märke</option>
                {CAR_BRANDS.map((brand) => (
                  <option key={brand} value={brand}>
                    {brand}
                  </option>
                ))}
              </Select>
            </Field>

            <div ref={modelDropdownRef}>
              <span className="field-label">Modell</span>
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
                  disabled={!selectedBrand || isLoadingModels || availableModels.length === 0}
                  aria-haspopup="listbox"
                  aria-expanded={isModelDropdownOpen}
                  className="control w-full pr-9 text-left disabled:cursor-not-allowed"
                >
                  <span className={`control-input truncate ${selectedModel ? '' : 'text-ink-faint'}`}>
                    {isLoadingModels
                      ? 'Hämtar modeller…'
                      : !selectedBrand
                        ? 'Välj märke först'
                        : availableModels.length === 0
                          ? 'Inga modeller'
                          : selectedModel
                            ? selectedModel.modell
                            : 'Välj modell'}
                  </span>
                </button>
                {isLoadingModels ? (
                  <Loader2
                    size={16}
                    aria-hidden="true"
                    className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 animate-spin text-accent-ink"
                  />
                ) : (
                  <ChevronDown
                    size={16}
                    aria-hidden="true"
                    className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-ink-faint"
                  />
                )}

                {isModelDropdownOpen && availableModels.length > 0 && (
                  <div className="absolute left-0 right-0 z-20 mt-1 flex max-h-80 min-w-[18rem] flex-col overflow-hidden rounded-control border border-line-strong bg-surface shadow-float">
                    <div className="border-b border-line p-2">
                      <div className="relative">
                        <Search
                          size={15}
                          aria-hidden="true"
                          className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-faint"
                        />
                        <input
                          ref={modelSearchInputRef}
                          type="text"
                          value={modelSearchQuery}
                          onChange={(e) => setModelSearchQuery(e.target.value)}
                          placeholder="Sök modell"
                          aria-label="Sök modell"
                          className="w-full rounded-tag border border-line bg-surface py-1.5 pl-9 pr-3 text-sm"
                        />
                      </div>
                      <p className="mt-1 px-1 text-2xs text-ink-faint">
                        {filteredModels.length} av {availableModels.length} modeller
                      </p>
                    </div>
                    <div className="flex-1 overflow-y-auto" role="listbox">
                      {filteredModels.length === 0 ? (
                        <p className="p-3 text-center text-sm text-ink-soft">
                          Inga modeller matchar ”{modelSearchQuery}”
                        </p>
                      ) : (
                        filteredModels.map((m) => (
                          <button
                            key={m.id}
                            type="button"
                            role="option"
                            aria-selected={selectedModelId === m.id}
                            onClick={() => {
                              handleModelSelect(m.id)
                              setIsModelDropdownOpen(false)
                              setModelSearchQuery('')
                            }}
                            className={`flex w-full items-baseline justify-between gap-3 px-3 py-2 text-left text-sm hover:bg-surface-muted ${
                              selectedModelId === m.id ? 'bg-accent-tint font-medium' : ''
                            }`}
                          >
                            <span className="min-w-0">
                              {m.modell} <span className="text-ink-faint">{m.bransletyp}</span>
                            </span>
                            <span className="num shrink-0 text-ink-soft">{fmtInt(m.nybilspris)} kr</span>
                          </button>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {noModelsFound && (
            <p className="text-sm text-ink-soft">
              Registret har inga modeller för {selectedBrand} {selectedYear}. Fyll i uppgifterna själv nedan.
            </p>
          )}

          <Field
            label="Bilens namn"
            htmlFor="model"
            hint="Fylls i från registret och går att ändra."
            error={errors.model}
          >
            <TextInput
              id="model"
              type="text"
              value={model}
              onChange={(e) => setModel(e.target.value)}
              placeholder="T.ex. Volvo XC60 T8"
              invalid={!!errors.model}
            />
          </Field>

          <div>
            <span className="field-label">Drivlina</span>
            <div className="seg" role="radiogroup" aria-label="Drivlina">
              <label>
                <input
                  type="radio"
                  name="drivetrain"
                  value="ice"
                  checked={drivetrain === 'ice'}
                  onChange={() => setDrivetrain('ice')}
                />
                <Fuel size={14} aria-hidden="true" />
                Bensin/diesel
              </label>
              <label>
                <input
                  type="radio"
                  name="drivetrain"
                  value="electric"
                  checked={drivetrain === 'electric'}
                  onChange={() => setDrivetrain('electric')}
                />
                <Zap size={14} aria-hidden="true" />
                Elbil
              </label>
              <label>
                <input
                  type="radio"
                  name="drivetrain"
                  value="hybrid"
                  checked={drivetrain === 'hybrid'}
                  onChange={() => setDrivetrain('hybrid')}
                />
                <PlugZap size={14} aria-hidden="true" />
                Laddhybrid
              </label>
            </div>
            <p className="field-hint">
              Elbilar får nybilspriset nedsatt med 350 000 kr och laddhybrider med 140 000 kr när förmånsvärdet
              räknas, dock högst hälften av priset. Gäller bilar som togs i trafik 1 juli 2022 eller senare.
            </p>
          </div>

        </fieldset>

        {/* Pris */}
        <fieldset className="min-w-0 space-y-4">
          <legend className="mb-1 font-semibold">Pris</legend>
          <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3">
            <Field
              label="Nybilspris enligt Skatteverket"
              htmlFor="nybilspris"
              hint="Grund för förmånsvärdet."
            >
              <TextInput
                id="nybilspris"
                type="number"
                inputMode="numeric"
                min={0}
                step={1}
                suffix="kr"
                value={nybilspris}
                onChange={(e) => setNybilspris(e.target.value)}
                placeholder="Fylls i från registret"
              />
            </Field>
            <Field
              label="Faktiskt inköpspris"
              htmlFor="purchasePrice"
              hint="Grund för leasingkostnaden. Kan skilja sig vid rabatt eller tillval."
              error={errors.purchasePrice}
            >
              <TextInput
                id="purchasePrice"
                type="number"
                inputMode="numeric"
                min={0}
                step={1}
                suffix="kr"
                value={purchasePrice}
                onChange={(e) => setPurchasePrice(e.target.value)}
                placeholder="450000"
                invalid={!!errors.purchasePrice}
              />
            </Field>
            <Field
              label="Extrautrustning"
              htmlFor="extraEquipment"
              hint="Läggs till nybilspriset när förmånsvärdet räknas."
            >
              <TextInput
                id="extraEquipment"
                type="number"
                inputMode="numeric"
                min={0}
                step={1000}
                suffix="kr"
                value={extraEquipment}
                onChange={(e) => setExtraEquipment(e.target.value)}
              />
            </Field>
          </div>
        </fieldset>

        {/* Förmånsvärde */}
        <fieldset className="min-w-0 space-y-4">
          <legend className="mb-1 font-semibold">Förmånsvärde</legend>

          <label className="check">
            <input
              type="checkbox"
              checked={registeredAfterJuly2022}
              onChange={(e) => setRegisteredAfterJuly2022(e.target.checked)}
            />
            <span>
              Bilen togs i trafik 1 juli 2022 eller senare
              <span className="block text-xs text-ink-faint">
                Styr om schablonnedsättningen för elbilar och laddhybrider gäller. Äldre miljöbilar värderas
                utifrån en jämförbar bil, vilket kalkylatorn inte räknar på.
              </span>
            </span>
          </label>

          <div className="grid gap-3 sm:grid-cols-2">
            <Field
              label="Fordonsskatt 2026"
              htmlFor="vehicleTax"
              hint={
                <>
                  Slå upp hos{' '}
                  <a
                    href="https://fordon-fu-regnr.transportstyrelsen.se/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-0.5 text-accent-ink underline-offset-2 hover:underline"
                  >
                    Transportstyrelsen
                    <ExternalLink size={12} aria-hidden="true" />
                  </a>
                  . Läggs till förmånsvärdet.
                  {!vehicleTax && ' Registret saknar uppgift för den här bilen.'}
                </>
              }
            >
              <TextInput
                id="vehicleTax"
                type="text"
                inputMode="numeric"
                suffix="kr/år"
                value={vehicleTax}
                onChange={(e) => setVehicleTax(e.target.value.replace(/[^0-9]/g, ''))}
                placeholder="0"
              />
            </Field>
            <Field label="Tjänstemil per år" htmlFor="serviceMiles" hint={serviceMilesHint}>
              <TextInput
                id="serviceMiles"
                type="number"
                inputMode="numeric"
                min={0}
                step={100}
                suffix="mil"
                value={serviceMiles}
                onChange={(e) => setServiceMiles(e.target.value)}
                placeholder="500"
              />
            </Field>
          </div>

          <div className="rounded-2xl border border-line bg-surface-muted p-4">
            <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
              <span className="font-semibold">Förmånsvärde</span>
              <label className="check text-sm text-ink-soft">
                <input
                  type="checkbox"
                  checked={autoCalculateBenefit}
                  onChange={(e) => setAutoCalculateBenefit(e.target.checked)}
                />
                <span>Beräkna automatiskt</span>
              </label>
            </div>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <Field label="Per år" htmlFor="benefitValue" error={errors.benefitValue}>
                <TextInput
                  id="benefitValue"
                  type="number"
                  inputMode="numeric"
                  min={0}
                  step={100}
                  suffix="kr"
                  value={benefitValue}
                  readOnly={autoCalculateBenefit}
                  onChange={(e) => setBenefitValue(e.target.value)}
                  placeholder={autoCalculateBenefit ? 'Räknas fram' : '0'}
                  invalid={!!errors.benefitValue}
                  className="font-semibold"
                />
              </Field>
              <div>
                <span className="field-label">Per månad</span>
                <p className="num flex min-h-10 items-center text-lg font-semibold">
                  {!isNaN(benefitNumber) ? fmtInt(benefitNumber / 12) : '–'}
                  <span className="ml-1.5 text-sm font-normal text-ink-faint">kr</span>
                </p>
              </div>
            </div>
            {autoCalculateBenefit && benefitBreakdown ? (
              <dl className="mt-3 max-w-md space-y-0.5 text-xs text-ink-soft">
                {benefitBreakdown.priceReduction > 0 && (
                  <>
                    <BreakdownRow
                      label="Nybilspris inklusive extrautrustning"
                      value={fmtInt(benefitBreakdown.listPrice)}
                    />
                    <BreakdownRow
                      label={`Schablonnedsättning, ${isElectric ? 'elbil' : 'laddhybrid'}`}
                      value={`−${fmtInt(benefitBreakdown.priceReduction)}`}
                    />
                  </>
                )}
                <BreakdownRow label="Förmånsgrundande pris" value={fmtInt(benefitBreakdown.taxablePrice)} strong />
                <BreakdownRow label="Prisbasbeloppsdel, 29 % av 59 200 kr" value={fmtInt(benefitBreakdown.baseAmount)} />
                <BreakdownRow label="Räntedel, 2,785 %" value={fmtInt(benefitBreakdown.interestPart)} />
                <BreakdownRow label="Prisdel, 13 %" value={fmtInt(benefitBreakdown.pricePart)} />
                <BreakdownRow label="Fordonsskatt" value={fmtInt(benefitBreakdown.vehicleTax)} />
                {benefitBreakdown.serviceMilesReduction && (
                  <BreakdownRow
                    label="Minst 3 000 tjänstemil: 75 % av värdet"
                    value={`${fmtInt(benefitBreakdown.fullValue)} × 0,75`}
                  />
                )}
                <BreakdownRow label="Förmånsvärde per år" value={fmtInt(benefitBreakdown.total)} strong />
              </dl>
            ) : (
              <p className="mt-3 text-xs text-ink-soft">
                {autoCalculateBenefit
                  ? 'Fyll i nybilspris så räknas förmånsvärdet fram.'
                  : benefitBreakdown && benefitBreakdown.total !== parseFloat(benefitValue)
                    ? `Manuellt angivet värde. Enligt Skatteverkets regler för 2026 blir det ${fmtInt(benefitBreakdown.total)} kr per år. Kryssa i Beräkna automatiskt för att använda det.`
                    : 'Manuellt angivet värde.'}
              </p>
            )}
          </div>
        </fieldset>

        {/* Leasing */}
        <fieldset className="min-w-0 space-y-4">
          <legend className="mb-1 font-semibold">Leasing</legend>

          <label className="check">
            <input type="checkbox" checked={isLeasing} onChange={(e) => setIsLeasing(e.target.checked)} />
            <span>
              Bilen leasas
              <span className="block text-xs text-ink-faint">
                Om bilen köps i stället belastas ramen med 20 % värdeminskning per år.
              </span>
            </span>
          </label>

          {isLeasing && (
            <>
              <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3">
                <Field label="Ränta" htmlFor="interestRate">
                  <TextInput
                    id="interestRate"
                    type="number"
                    inputMode="decimal"
                    min={0}
                    max={20}
                    step={0.1}
                    suffix="%"
                    value={interestRate}
                    onChange={(e) => setInterestRate(e.target.value)}
                    placeholder="5"
                  />
                </Field>
                <Field label="Leasingperiod" htmlFor="leasingPeriod">
                  <TextInput
                    id="leasingPeriod"
                    type="number"
                    inputMode="numeric"
                    min={12}
                    max={72}
                    step={12}
                    suffix="mån"
                    value={leasingPeriod}
                    onChange={(e) => setLeasingPeriod(e.target.value)}
                    placeholder="36"
                  />
                </Field>
                <div className="sm:col-span-2 md:col-span-1">
                  <div className="flex items-baseline justify-between gap-4">
                    <label htmlFor="residualValue" className="field-label">
                      Restvärde efter perioden
                    </label>
                    <span className="num text-sm">
                      {residualValue} %{residualKr !== null && ` (${fmtInt(residualKr)} kr)`}
                    </span>
                  </div>
                  <input
                    type="range"
                    id="residualValue"
                    value={residualValue}
                    onChange={(e) => setResidualValue(e.target.value)}
                    min={45}
                    max={55}
                    step={1}
                    className="range block"
                  />
                  <div className="mt-1 flex justify-between text-2xs text-ink-faint">
                    <span>45 %</span>
                    <span>55 %</span>
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border border-line bg-surface-muted p-4">
                <span className="font-semibold">Leasingkostnad</span>
                <p className="num mt-1 text-lg font-semibold">
                  {!isNaN(leasingNumber) ? fmtInt(leasingNumber / 12) : '–'}
                  <span className="ml-1.5 text-sm font-normal text-ink-faint">kr/mån</span>
                </p>
                <p className="mt-1 text-xs text-ink-soft">
                  {!isNaN(leasingNumber) && `${fmtInt(leasingNumber)} kr per år inklusive moms. `}
                  {miles >= 100
                    ? 'Halva momsen lyfts eftersom bilen körs minst 100 tjänstemil.'
                    : 'Ingen moms lyfts eftersom bilen körs under 100 tjänstemil.'}
                </p>
              </div>
            </>
          )}
        </fieldset>
      </form>
    </Dialog>
  )
}

function BreakdownRow({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className={`flex justify-between gap-4${strong ? ' font-medium text-ink' : ''}`}>
      <dt>{label}</dt>
      <dd className="num">{value}</dd>
    </div>
  )
}
