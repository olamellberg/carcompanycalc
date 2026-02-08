import { supabase } from './supabase'
import type { CarInput } from './calculations'

// localStorage-nyckel för bilar
const LOCAL_CARS_KEY = 'companyCarCalc_cars'

// Databasrad (snake_case, matchar Supabase-schemat)
export interface CarRow {
  id: string
  model: string
  purchase_price: number
  benefit_value: number
  is_electric: boolean
  is_plugin_hybrid: boolean
  annual_km: number
  is_leasing: boolean
  interest_rate: number | null
  leasing_period: number | null
  annual_leasing_cost: number | null
  service_miles: number | null
  insurance_included_in_leasing: boolean
  maintenance_included_in_leasing: boolean
  registered_after_july_2022: boolean
  vehicle_tax: number | null
  extra_equipment: number | null
  electric_range: number | null
  created_at: string
  updated_at: string
  user_id?: string
}

// --- Mappning mellan CarInput (camelCase) och CarRow (snake_case) ---

export function mapRowToCarInput(row: CarRow): CarInput & { id: string } {
  return {
    id: row.id,
    model: row.model,
    purchasePrice: row.purchase_price,
    benefitValue: row.benefit_value,
    isElectric: row.is_electric,
    isPluginHybrid: row.is_plugin_hybrid,
    annualKm: row.annual_km,
    isLeasing: row.is_leasing,
    interestRate: row.interest_rate ?? undefined,
    leasingPeriod: row.leasing_period ?? undefined,
    annualLeasingCost: row.annual_leasing_cost ?? undefined,
    serviceMiles: row.service_miles ?? undefined,
    insuranceIncludedInLeasing: row.insurance_included_in_leasing,
    maintenanceIncludedInLeasing: row.maintenance_included_in_leasing,
    registeredAfterJuly2022: row.registered_after_july_2022,
    vehicleTax: row.vehicle_tax ?? undefined,
    extraEquipment: row.extra_equipment ?? undefined,
    electricRange: row.electric_range ?? undefined,
  }
}

export function mapCarInputToRowData(carInput: CarInput): Omit<CarRow, 'id' | 'created_at' | 'updated_at' | 'user_id'> {
  return {
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
    electric_range: carInput.electricRange || null,
  }
}

// --- Lagringsinterface ---

export interface CarStorage {
  loadCars(): Promise<CarRow[]>
  saveCar(carInput: CarInput, existingId?: string): Promise<void>
  deleteCar(id: string): Promise<void>
}

// --- Supabase-implementation (för inloggade användare) ---

class SupabaseCarStorage implements CarStorage {
  private userId: string

  constructor(userId: string) {
    this.userId = userId
  }

  async loadCars(): Promise<CarRow[]> {
    const { data, error } = await supabase
      .from('cars')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) throw error
    return (data ?? []) as CarRow[]
  }

  async saveCar(carInput: CarInput, existingId?: string): Promise<void> {
    const rowData = mapCarInputToRowData(carInput)

    if (existingId) {
      const { error } = await supabase
        .from('cars')
        .update(rowData)
        .eq('id', existingId)

      if (error) throw error
    } else {
      const { error } = await supabase
        .from('cars')
        .insert([{ ...rowData, user_id: this.userId }])

      if (error) throw error
    }
  }

  async deleteCar(id: string): Promise<void> {
    const { error } = await supabase
      .from('cars')
      .delete()
      .eq('id', id)

    if (error) throw error
  }
}

// --- localStorage-implementation (för ej inloggade) ---

class LocalCarStorage implements CarStorage {
  private getAll(): CarRow[] {
    try {
      const saved = localStorage.getItem(LOCAL_CARS_KEY)
      return saved ? JSON.parse(saved) : []
    } catch {
      return []
    }
  }

  private saveAll(rows: CarRow[]): void {
    localStorage.setItem(LOCAL_CARS_KEY, JSON.stringify(rows))
  }

  async loadCars(): Promise<CarRow[]> {
    return this.getAll().sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    )
  }

  async saveCar(carInput: CarInput, existingId?: string): Promise<void> {
    const rows = this.getAll()
    const rowData = mapCarInputToRowData(carInput)
    const now = new Date().toISOString()

    if (existingId) {
      const index = rows.findIndex(r => r.id === existingId)
      if (index >= 0) {
        rows[index] = { ...rows[index], ...rowData, updated_at: now }
      }
    } else {
      const newRow: CarRow = {
        ...rowData,
        id: crypto.randomUUID(),
        created_at: now,
        updated_at: now,
      }
      rows.push(newRow)
    }

    this.saveAll(rows)
  }

  async deleteCar(id: string): Promise<void> {
    const rows = this.getAll().filter(r => r.id !== id)
    this.saveAll(rows)
  }
}

// --- Factory ---

export function createStorage(userId: string | null): CarStorage {
  if (userId) {
    return new SupabaseCarStorage(userId)
  }
  return new LocalCarStorage()
}

// --- Migrering av lokala bilar till Supabase ---

export async function migrateLocalToSupabase(userId: string): Promise<number> {
  const localStorage = new LocalCarStorage()
  const localCars = await localStorage.loadCars()

  if (localCars.length === 0) return 0

  // Skapa nya rader med user_id (utan id, låt Supabase generera nya)
  const rowsToInsert = localCars.map(car => {
    const { id: _id, created_at: _ca, updated_at: _ua, user_id: _uid, ...rest } = car
    return { ...rest, user_id: userId }
  })

  const { error } = await supabase.from('cars').insert(rowsToInsert)

  if (error) {
    console.error('Migreringsfel:', error)
    throw error
  }

  // Rensa lokala bilar efter lyckad migrering
  window.localStorage.removeItem(LOCAL_CARS_KEY)
  return localCars.length
}

// --- Kolla om det finns lokala bilar (för migreringspromp) ---

export function hasLocalCars(): boolean {
  try {
    const saved = window.localStorage.getItem(LOCAL_CARS_KEY)
    if (!saved) return false
    const cars = JSON.parse(saved)
    return Array.isArray(cars) && cars.length > 0
  } catch {
    return false
  }
}
