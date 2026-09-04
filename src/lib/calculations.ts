// Swedish tax rules for company cars (förmånsbil) 2026
// Based on B3 RAM policies (B16: Lönepolicy fast ersättning RAM, C11: Riktlinjer för RAM)
// and Swedish tax regulations 2026

// Constants for 2026 (Skatteverket)
// Källa: https://www.skatteverket.se/privat/skatter/beloppochprocent/2026.4.1522bf3f19aea8075ba21.html
// Prisbasbelopp 2026 = 59 200 kr
// Statslåneränta (SLR) 30/11 2025 = 2,55%
const BENEFIT_BASE_AMOUNT = 17168 // 0,29 × prisbasbelopp (59 200) = förmånens grundbelopp
const PERCENT_OF_PRICE = 0.13 // 13% av bilens nybilspris (upp till 7,5 × prisbasbelopp)
const INTEREST_RATE_FACTOR = 0.02785 // Räntedel: 70% × SLR + 1% = 0,70 × 0,0255 + 0,01 = 2,785%
const RUNNING_COSTS = 5328 // 0,09 × prisbasbelopp = löpande kostnader per år (äldre bilar)

// Miljöbilsreduktioner 2026
// Elbilar: 10 000 kr per helår (max 50% av förmånsvärdet)
// Laddhybrider: Beror på elektrisk räckvidd
const ELECTRIC_CAR_REDUCTION_PER_YEAR = 10000 // kr per år för elbil
const MAX_REDUCTION_PERCENTAGE = 0.50 // Max 50% av beräknat förmånsvärde

// Average assumptions
const AVERAGE_ANNUAL_KM = 15000 // Average annual kilometers
const AVERAGE_KM_PER_MILE = 10 // 1 mil = 10 km

// Tax rates (RAM system standard rates)
const MARGINAL_TAX_RATE = 0.50 // Average marginal tax rate (50%)
const EMPLOYER_SOCIAL_FEE = 0.3142 // 31.42% employer social fees (arbetsgivaravgifter)

// RAM system specific constants (based on B16 and C11 policies)
// According to RAM policy:
// - Förmånsvärde is taxed as income (counts as taxable salary)
// - Company may compensate employee for the tax on förmånsvärde
// - Total cost from RAM includes: car operating costs + tax compensation + employer fees
// - The "ramen" (frame) is a fundamental concept in the salary model

export interface CarInput {
  id?: string
  model: string
  purchasePrice: number
  benefitValue: number
  isElectric?: boolean
  isPluginHybrid?: boolean
  annualKm?: number
  isLeasing?: boolean
  interestRate?: number // Årlig ränta i procent
  leasingPeriod?: number // Leasingperiod i månader
  annualLeasingCost?: number
  serviceMiles?: number // Tjänstemil per år (för momsberäkning OCH förmånsvärde)
  insuranceIncludedInLeasing?: boolean // Om försäkring ingår i leasing
  maintenanceIncludedInLeasing?: boolean // Om underhåll ingår i leasing
  registeredAfterJuly2022?: boolean // Om bilen registrerades efter 1 juli 2022
  vehicleTax?: number // Fordonsskatt 2026 (kr/år)
  extraEquipment?: number // Extrautrustning (kr)
  electricRange?: number // Elektrisk räckvidd i km (för laddhybrider)
}

export interface CarCalculations {
  id?: string
  model: string
  purchasePrice: number
  benefitValue: number
  benefitValuePerMonth?: number // Förmånsvärde per månad
  tcoPrivate: number
  totalCostFromRAM: number
  salaryEquivalent: number
  costPerMile: number
  isElectric?: boolean
  isPluginHybrid?: boolean
  annualKm?: number
  isLeasing?: boolean
  interestRate?: number
  leasingPeriod?: number
  annualLeasingCost?: number
  serviceMiles?: number
  insuranceIncludedInLeasing?: boolean
  maintenanceIncludedInLeasing?: boolean
  registeredAfterJuly2022?: boolean
  vehicleTax?: number
  extraEquipment?: number
  electricRange?: number
}

/**
 * Calculate förmånsvärde (benefit value) based on Swedish tax rules 2026
 *
 * Beräkningsformel enligt Skatteverket:
 *
 * För bilar registrerade EFTER 1 juli 2022:
 * Förmånsvärde = Grundbelopp + Procent av pris + Räntedel + Fordonsskatt
 *
 * För bilar registrerade FÖRE 1 juli 2022:
 * Förmånsvärde = Grundbelopp + Procent av pris + Räntedel + Löpande kostnader
 *
 * Där:
 * - Grundbelopp = 0,29 × prisbasbelopp (59 200) = 17 168 kr
 * - Procent av pris = 13% × (nybilspris + extrautrustning)
 * - Räntedel = (70% × SLR + 1%) × (nybilspris + extrautrustning) = 2,785%
 * - Fordonsskatt = Faktisk fordonsskatt för 2026
 * - Löpande kostnader = 0,09 × prisbasbelopp = 5 328 kr (endast för äldre bilar)
 *
 * Tjänstekörningsreduktion:
 * - Om bilen körs minst 3000 mil i tjänsten per år → 25% reduktion på grundbeloppet
 *
 * Miljöbilsreduktioner:
 * - ELBILAR: Reduktion med 10 000 kr/år (max 50% av beräknat förmånsvärde)
 * - LADDHYBRIDER: Reduktion beroende på elektrisk räckvidd
 *
 * Källa: https://www.skatteverket.se/privat/skatter/beloppochprocent/2026.4.1522bf3f19aea8075ba21.html
 */
export function calculateBenefitValue(
  purchasePrice: number,
  isElectric: boolean = false,
  isPluginHybrid: boolean = false,
  electricRange?: number, // Elektrisk räckvidd i km (för laddhybrider)
  registeredAfterJuly2022: boolean = true, // Antar nyare bil som default
  vehicleTax: number = 5328, // Default = löpande kostnader
  extraEquipment: number = 0, // Extrautrustning
  serviceMilesPerYear: number = 500 // Tjänstekörning mil/år (default 500 = INGEN reduktion)
): number {
  if (purchasePrice <= 0) {
    return 0
  }

  // Steg 1: Beräkna grundbelopp (med eventuell tjänstekörningsreduktion)
  let grundbelopp = BENEFIT_BASE_AMOUNT // 17 168 kr
  
  // Om bilen körs minst 3000 mil i tjänsten → 25% reduktion på grundbeloppet
  const hasServiceMileReduction = serviceMilesPerYear >= 3000
  if (hasServiceMileReduction) {
    grundbelopp = grundbelopp * 0.75 // 25% reduktion
  }

  // Steg 2: Beräkna baserat på pris + extrautrustning
  const totalPrice = purchasePrice + extraEquipment
  const percentOfPrice = totalPrice * PERCENT_OF_PRICE // 13% av totalpris
  const interestComponent = totalPrice * INTEREST_RATE_FACTOR // Räntedel
  
  // Steg 3: Lägg till fordonsskatt eller löpande kostnader
  let taxOrRunningCosts = 0
  if (registeredAfterJuly2022) {
    // Bilar registrerade efter 1 juli 2022: Använd faktisk fordonsskatt
    taxOrRunningCosts = vehicleTax
  } else {
    // Äldre bilar: Använd schablonbelopp för löpande kostnader
    taxOrRunningCosts = RUNNING_COSTS // 5 328 kr
  }
  
  let benefitValue = grundbelopp + percentOfPrice + interestComponent + taxOrRunningCosts

  // Steg 4: Tillämpa miljöbilsreduktion
  if (isElectric) {
    // Elbil: Reduktion 10 000 kr/år, max 50% av förmånsvärdet
    const maxReduction = benefitValue * MAX_REDUCTION_PERCENTAGE
    const reduction = Math.min(ELECTRIC_CAR_REDUCTION_PER_YEAR, maxReduction)
    benefitValue = benefitValue - reduction
  } else if (isPluginHybrid) {
    // Laddhybrid: Reduktion beroende på elektrisk räckvidd
    // Förenklad beräkning: ca 50% av elbilsreduktionen om ingen räckvidd angiven
    // TODO: Implementera exakt beräkning baserat på elektrisk räckvidd
    const hybridReduction = electricRange 
      ? calculatePluginHybridReduction(electricRange, benefitValue)
      : Math.min(ELECTRIC_CAR_REDUCTION_PER_YEAR * 0.5, benefitValue * MAX_REDUCTION_PERCENTAGE)
    
    benefitValue = benefitValue - hybridReduction
  }

  return Math.round(benefitValue)
}

/**
 * Beräknar reduktion för laddhybrid baserat på elektrisk räckvidd
 * Exakt formel från Skatteverket saknas i denna implementation
 */
function calculatePluginHybridReduction(electricRange: number, baseBenefitValue: number): number {
  // Förenklad approximation - ju längre räckvidd, desto högre reduktion
  // Räckvidd > 60 km: närmare elbilsreduktion
  // Räckvidd < 30 km: lägre reduktion
  
  if (electricRange >= 60) {
    return Math.min(ELECTRIC_CAR_REDUCTION_PER_YEAR * 0.8, baseBenefitValue * MAX_REDUCTION_PERCENTAGE)
  } else if (electricRange >= 45) {
    return Math.min(ELECTRIC_CAR_REDUCTION_PER_YEAR * 0.6, baseBenefitValue * MAX_REDUCTION_PERCENTAGE)
  } else if (electricRange >= 30) {
    return Math.min(ELECTRIC_CAR_REDUCTION_PER_YEAR * 0.4, baseBenefitValue * MAX_REDUCTION_PERCENTAGE)
  } else {
    return Math.min(ELECTRIC_CAR_REDUCTION_PER_YEAR * 0.2, baseBenefitValue * MAX_REDUCTION_PERCENTAGE)
  }
}

/**
 * Calculate TCO (Total Cost of Ownership) for private ownership
 * This represents what it would cost to own the car privately
 * Includes: purchase price, depreciation, insurance, maintenance, fuel, taxes
 * 
 * Note: This is different from RAM cost, as RAM excludes fuel (drivmedel)
 * according to C11 policy
 */
export function calculateTCOPrivate(
  purchasePrice: number,
  annualKm: number = AVERAGE_ANNUAL_KM,
  isElectric: boolean = false,
  isPluginHybrid: boolean = false
): number {
  // Depreciation (assume 20% per year, 5 year ownership)
  const annualDepreciation = purchasePrice * 0.20
  
  // Insurance (estimate 1.5% of purchase price per year)
  const annualInsurance = purchasePrice * 0.015
  
  // Maintenance and service (estimate 0.5% of purchase price per year)
  const annualMaintenance = purchasePrice * 0.005
  
  // Fuel costs - differentiated by car type
  // Note: In RAM system, fuel does NOT belastar ramen (handled via körjournal)
  // But for private TCO, we include it
  let fuelCostPerKm = 1.5 // Default för bensin/diesel
  if (isElectric) {
    fuelCostPerKm = 0.4 // Elbil (ca 2 kr/kWh, 20 kWh/100km = 0.4 kr/km)
  } else if (isPluginHybrid) {
    fuelCostPerKm = 1.0 // Laddhybrid (mix el/bensin, ca 30% el + 70% bensin)
  }
  const annualFuel = annualKm * fuelCostPerKm
  
  // Vehicle tax - differentiated by car type
  // Elbilar: 0 kr i fordonsskatt de första 5 åren
  // Laddhybrider: Reducerad skatt
  // Bensin/diesel: ~6000 kr/år (varierar med CO2)
  let annualTax = 6000 // Default för bensin/diesel
  if (isElectric) {
    annualTax = 0 // Elbilar har noll fordonsskatt i 5 år
  } else if (isPluginHybrid) {
    annualTax = 3000 // Reducerad skatt för laddhybrider
  }
  
  // Total annual cost for private ownership
  const annualCost = annualDepreciation + annualInsurance + annualMaintenance + annualFuel + annualTax
  
  // Return annual TCO
  return Math.round(annualCost)
}

/**
 * Calculate total cost from RAM (company perspective)
 * According to B16 and C11 RAM policies:
 * 
 * Förmånsbilskostnader som belastar ramen:
 * - Leasing (eller depreciation vid köp)
 * - Underhåll
 * - Tillbehör
 * - Skatt (fordonsskatt)
 * - Försäkring
 * - EJ drivmedel (drivmedel belastar inte ramen enligt C11)
 * 
 * Momsregler (C11):
 * - B3 får lyfta halva momsen på leasing
 * - Vid mindre än 100 tjänstemil per år → ingen moms lyfts på leasing
 * 
 * Ytterligare kostnader:
 * - Arbetsgivaravgifter på förmånsvärdet (31,42% - obligatoriskt)
 * - NOTE: B3 ger INGEN skatteersättning - anställd betalar förmånsskatten själv
 */
export function calculateTotalCostFromRAM(
  purchasePrice: number,
  benefitValue: number,
  annualKm: number = AVERAGE_ANNUAL_KM,
  isLeasing: boolean = false,
  annualLeasingCost: number = 0,
  serviceMiles: number = 0, // Tjänstemil per år
  isElectric: boolean = false,
  isPluginHybrid: boolean = false,
  insuranceIncludedInLeasing: boolean = false,
  maintenanceIncludedInLeasing: boolean = false
): number {
  // 1. Car operating costs that BELASTAR RAMEN (enligt C11)
  // Note: Drivmedel belastar INTE ramen - det hanteras via körjournal
  
  let carOperatingCosts = 0
  
  if (isLeasing && annualLeasingCost > 0) {
    // Leasing kostnad
    // Moms: B3 får lyfta halva momsen (om >= 100 tjänstemil/år)
    // Vid < 100 tjänstemil/år → ingen moms lyfts
    const serviceMilesPerYear = serviceMiles || annualKm / 10 // Convert km to mil
    const canLiftHalfVAT = serviceMilesPerYear >= 100
    
    if (canLiftHalfVAT) {
      // B3 får lyfta halva momsen, så ramen belastas med 90% av leasingkostnaden
      // Leasingkostnad inkl. 25% moms = X
      // Total moms = X * 0.2 (eftersom X / 1.25 * 0.25 = X * 0.2)
      // Halva momsen = X * 0.1
      // Ramen belastas: X - (X * 0.1) = X * 0.9
      carOperatingCosts = annualLeasingCost * 0.9
    } else {
      // Ingen moms lyfts, så ramen belastas med full leasing kostnad inkl. moms
      carOperatingCosts = annualLeasingCost
    }
  } else {
    // Vid köp: depreciation (company asset, typically 20% per year over 5 years)
    carOperatingCosts = purchasePrice * 0.20
  }
  
  // Insurance (estimate 1.5% of purchase price per year)
  // Belastar ramen enligt C11 (om inte inkluderat i leasing)
  const annualInsurance = (!isLeasing || !insuranceIncludedInLeasing) 
    ? purchasePrice * 0.015 
    : 0
  
  // Maintenance and service (estimate 0.5% of purchase price per year)
  // Belastar ramen enligt C11 (underhåll) (om inte inkluderat i leasing)
  const annualMaintenance = (!isLeasing || !maintenanceIncludedInLeasing)
    ? purchasePrice * 0.005
    : 0
  
  // Vehicle tax - differentiated by car type
  // Belastar ramen enligt C11 (skatt)
  let annualTax = 6000 // Default för bensin/diesel
  if (isElectric) {
    annualTax = 0 // Elbilar har noll fordonsskatt i 5 år
  } else if (isPluginHybrid) {
    annualTax = 3000 // Reducerad skatt för laddhybrider
  }
  
  // NOTE: Drivmedel belastar INTE ramen enligt C11
  // Det hanteras via körjournal istället
  
  carOperatingCosts += annualInsurance + annualMaintenance + annualTax
  
  // 2. Arbetsgivaravgifter på förmånsvärdet (obligatoriskt, 31.42%)
  // Förmånsvärdet är underlag för arbetsgivaravgifter oavsett om skatteersättning ges
  const employerSocialFees = benefitValue * EMPLOYER_SOCIAL_FEE

  // NOTE: B3 kompenserar INTE den anställde för skatten på förmånsvärdet.
  // Den anställde betalar förmånsskatten själv via löneavdrag.
  // Därför ingår ingen skatteersättning i RAM-kostnaden.

  // Total annual cost from RAM perspective
  // This is what belastar ramen enligt B16 och C11
  const totalCost = carOperatingCosts + employerSocialFees
  
  return Math.round(totalCost)
}

/**
 * Calculate what net salary the employee could have received instead of the company car
 * 
 * This is a "löneväxling" calculation:
 * If the company didn't provide the car, but instead paid the money as salary,
 * how much net salary would the employee receive?
 * 
 * Formula:
 * 1. Employer's total cost = Leasing cost + Employer social fees on benefit value (31.42%)
 * 2. Gross salary equivalent = Total cost / 1.3142 (remove employer fees)
 * 3. Net salary = Gross salary × (1 - marginal tax rate)
 */
export function calculateSalaryEquivalent(
  annualLeasingCost: number,
  benefitValue: number,
  marginalTaxRate: number = MARGINAL_TAX_RATE
): number {
  // Arbetsgivarens totala kostnad för förmånsbilen:
  // 1. Leasingkostnad (eller driftkostnad)
  // 2. Arbetsgivaravgifter på förmånsvärdet (31.42%)
  const employerFeesOnBenefit = benefitValue * EMPLOYER_SOCIAL_FEE
  const totalEmployerCost = annualLeasingCost + employerFeesOnBenefit
  
  // Om företaget istället hade betalat ut detta som lön:
  // Bruttolön = Totalkostnad / 1.3142 (ta bort arbetsgivaravgifter)
  const grossSalaryEquivalent = totalEmployerCost / (1 + EMPLOYER_SOCIAL_FEE)
  
  // Nettolön = Bruttolön × (1 - marginalskatt)
  const netSalaryEquivalent = grossSalaryEquivalent * (1 - marginalTaxRate)
  
  
  return Math.round(netSalaryEquivalent)
}

/**
 * Calculate cost per mile (krona per mil)
 * Based on the net salary equivalent (what you "pay" in lost net salary per mile)
 */
/**
 * Calculate cost per mile (kostnad per mil)
 * 
 * Total privat kostnad per mil = (Motsv. nettolön + Förmånskostnad) / antal mil
 * 
 * @param netSalaryEquivalent - Motsvarande nettolön per år
 * @param benefitTaxCost - Förmånskostnad per år (förmånsvärde × marginalskatt)
 * @param annualKm - Årlig körsträcka i km
 */
export function calculateCostPerMile(
  netSalaryEquivalent: number,
  benefitTaxCost: number,
  annualKm: number = AVERAGE_ANNUAL_KM
): number {
  const annualMiles = annualKm / AVERAGE_KM_PER_MILE
  // Total privat kostnad = förlorad nettolön + skatt på förmånsvärdet
  const totalPrivateCost = netSalaryEquivalent + benefitTaxCost
  const costPerMile = totalPrivateCost / annualMiles
  return Math.round(costPerMile * 100) / 100 // Round to 2 decimals
}

/**
 * Calculate all metrics for a car
 * Based on B16 and C11 RAM policies
 * @param car - Car input data
 * @param marginalTaxRate - User's marginal tax rate (default 50%)
 */
export function calculateCarMetrics(car: CarInput, marginalTaxRate: number = MARGINAL_TAX_RATE): CarCalculations {
  const annualKm = car.annualKm || AVERAGE_ANNUAL_KM
  
  // Use provided benefit value or calculate it with all parameters
  const benefitValue = car.benefitValue || calculateBenefitValue(
    car.purchasePrice,
    car.isElectric || false,
    car.isPluginHybrid || false,
    car.electricRange,
    car.registeredAfterJuly2022 !== undefined ? car.registeredAfterJuly2022 : true,
    car.vehicleTax || 5328,
    car.extraEquipment || 0,
    car.serviceMiles || 500
  )
  
  const benefitValuePerMonth = Math.round(benefitValue / 12)
  
  const isElectric = car.isElectric || false
  const isPluginHybrid = car.isPluginHybrid || false
  
  const tcoPrivate = calculateTCOPrivate(car.purchasePrice, annualKm, isElectric, isPluginHybrid)
  const totalCostFromRAM = calculateTotalCostFromRAM(
    car.purchasePrice,
    benefitValue,
    annualKm,
    car.isLeasing || false,
    car.annualLeasingCost || 0,
    car.serviceMiles || 3000,
    isElectric,
    isPluginHybrid,
    car.insuranceIncludedInLeasing || false,
    car.maintenanceIncludedInLeasing || false
  )
  // Beräkna lönemotsvarande baserat på leasingkostnad och förmånsvärde
  const annualLeasingForCalc = car.annualLeasingCost || (car.purchasePrice * 0.20) // Fallback till 20% avskrivning
  const salaryEquivalent = calculateSalaryEquivalent(annualLeasingForCalc, benefitValue, marginalTaxRate)
  
  // Förmånskostnad per år = förmånsvärde × marginalskatt
  const benefitTaxCost = benefitValue * marginalTaxRate
  const costPerMile = calculateCostPerMile(salaryEquivalent, benefitTaxCost, annualKm)
  
  return {
    id: car.id,
    model: car.model,
    purchasePrice: car.purchasePrice,
    benefitValue: benefitValue,
    benefitValuePerMonth: benefitValuePerMonth,
    tcoPrivate: tcoPrivate,
    totalCostFromRAM: totalCostFromRAM,
    salaryEquivalent: salaryEquivalent,
    costPerMile: costPerMile,
    isElectric: car.isElectric,
    isPluginHybrid: car.isPluginHybrid,
    annualKm: annualKm,
    isLeasing: car.isLeasing,
    interestRate: car.interestRate,
    leasingPeriod: car.leasingPeriod,
    annualLeasingCost: car.annualLeasingCost,
    serviceMiles: car.serviceMiles,
    insuranceIncludedInLeasing: car.insuranceIncludedInLeasing,
    maintenanceIncludedInLeasing: car.maintenanceIncludedInLeasing,
    registeredAfterJuly2022: car.registeredAfterJuly2022,
    vehicleTax: car.vehicleTax,
    extraEquipment: car.extraEquipment,
    electricRange: car.electricRange
  }
}


/**
 * Månadsleasing med restvärde (annuitetsmetod)
 * Månadskostnad = [(Pris - Nuvärde av restvärde) × r × (1+r)^n] / [(1+r)^n - 1]
 */
export function calculateMonthlyLeasing(
  purchasePrice: number,
  interestRate: number, // Årlig ränta i procent (t.ex. 5)
  months: number,
  residualValuePercent: number = 0.50
): number {
  if (purchasePrice <= 0 || months <= 0) return 0

  const residualValue = purchasePrice * residualValuePercent
  const r = interestRate / 12 / 100
  if (r === 0) return (purchasePrice - residualValue) / months

  const growth = Math.pow(1 + r, months)
  const amountToFinance = purchasePrice - residualValue / growth
  return amountToFinance * (r * growth) / (growth - 1)
}

export function calculateAnnualLeasing(
  purchasePrice: number,
  interestRate: number,
  months: number,
  residualValuePercent: number = 0.50
): number {
  return calculateMonthlyLeasing(purchasePrice, interestRate, months, residualValuePercent) * 12
}
