import { Edit2, Trash2, ArrowUp, ArrowDown, HelpCircle } from 'lucide-react'
import { type CarCalculations } from '../lib/calculations'
import { useState } from 'react'

interface CarTableProps {
  cars: CarCalculations[]
  sortField: keyof CarCalculations | null
  sortDirection: 'asc' | 'desc'
  onSort: (field: keyof CarCalculations) => void
  onEdit: (car: CarCalculations) => void
  onDelete: (id: string) => void
  marginalTaxRate: number // Marginalskatt från personliga inställningar
}

// Förklaringar för varje kolumn
const columnDescriptions: Record<string, string> = {
  model: 'Bilens märke och modell från Skatteverkets databas.',
  purchasePrice: 'Bilens nybilspris i kr. Används som grund för beräkning av förmånsvärde och leasingkostnad.',
  annualLeasingCost: 'Månatlig leasingkostnad beräknad med annuitetsmetoden.\n• Baseras på inköpspris, ränta och restvärde\n• Inkluderar moms (halva momsen kan lyftas vid ≥100 tjänstemil)',
  benefitValue: 'Förmånsvärde per år enligt Skatteverkets regler 2025:\n• Grundbelopp: 0,29 × 0,625 × prisbasbelopp\n• + 9% av nybilspriset\n• + 1,96% (statslåneränta) × nybilspriset\n• + Fordonsskatt\n• - Miljöbilsreduktion\n• - 25% om ≥3000 tjänstemil/år',
  benefitTaxCost: 'Vad du betalar i skatt på förmånsvärdet per månad.\n\nBeräkning:\n• Förmånsvärde (år) ÷ 12 × din marginalskatt\n\nDetta är den faktiska kostnaden som dras från din nettolön varje månad för att ha förmånsbilen.',
  totalCostFromRAM: 'Total kostnad från RAM per år / månad:\n• Leasingkostnad\n• + Arbetsgivaravgifter på förmånsvärde (31,42%)\n• + Ev. driftskostnader som ej ingår i leasing',
  salaryEquivalent: 'Motsvarande nettolön om pengarna betalats ut som lön istället:\n\n• Arbetsgivarens kostnad = Leasing + arbetsgivaravgifter\n• Bruttolön = Kostnad ÷ 1,3142\n• Nettolön = Bruttolön × (1 - marginalskatt)',
  costPerMile: 'Kostnad per mil körning:\n• Motsv. Nettolön ÷ Årlig körsträcka i mil\n• Visar vad varje mil "kostar" dig i förlorad nettolön'
}

export default function CarTable({
  cars,
  sortField,
  sortDirection,
  onSort,
  onEdit,
  onDelete,
  marginalTaxRate
}: CarTableProps) {
  const [activeTooltip, setActiveTooltip] = useState<string | null>(null)

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('sv-SE', {
      style: 'currency',
      currency: 'SEK',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(value)
  }

  const formatNumber = (value: number, decimals: number = 0) => {
    return new Intl.NumberFormat('sv-SE', {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals
    }).format(value)
  }

  // Beräkna månatlig skattekostnad på förmånsvärde
  const calculateBenefitTaxCost = (benefitValue: number) => {
    return Math.round((benefitValue / 12) * marginalTaxRate)
  }

  const SortButton = ({ field, label, customDescription }: { field: keyof CarCalculations; label: string; customDescription?: string }) => {
    const isActive = sortField === field
    const description = customDescription || columnDescriptions[field]
    
    return (
      <div className="relative inline-flex items-center gap-1">
        <button
          onClick={() => onSort(field)}
          className="flex items-center gap-1 hover:text-b3-turquoise transition-colors"
        >
          <span>{label}</span>
          {isActive ? (
            sortDirection === 'asc' ? (
              <ArrowUp size={16} />
            ) : (
              <ArrowDown size={16} />
            )
          ) : (
            <span className="w-4 h-4" />
          )}
        </button>
        {description && (
          <div 
            className="relative"
            onMouseEnter={() => setActiveTooltip(field)}
            onMouseLeave={() => setActiveTooltip(null)}
          >
            <HelpCircle 
              size={14} 
              className="text-gray-400 hover:text-b3-turquoise cursor-help transition-colors" 
            />
            {activeTooltip === field && (
              <div 
                className="fixed z-[9999] w-80 p-4 bg-gray-900 text-white text-sm rounded-xl shadow-2xl whitespace-pre-line"
                style={{
                  top: '120px',
                  left: '50%',
                  transform: 'translateX(-50%)'
                }}
              >
                <div className="font-bold mb-2 text-b3-turquoise text-base">{label}</div>
                {description}
              </div>
            )}
          </div>
        )}
      </div>
    )
  }

  // Label som visar tooltip för förmånskostnad
  const BenefitTaxLabel = () => {
    const description = columnDescriptions.benefitTaxCost
    const label = `Förmånskostnad vid ${Math.round(marginalTaxRate * 100)}% skatt (mån)`
    
    return (
      <div className="relative inline-flex items-center gap-1">
        <span className="text-sm">{label}</span>
        <div 
          className="relative"
          onMouseEnter={() => setActiveTooltip('benefitTaxCost')}
          onMouseLeave={() => setActiveTooltip(null)}
        >
          <HelpCircle 
            size={14} 
            className="text-gray-400 hover:text-b3-turquoise cursor-help transition-colors" 
          />
          {activeTooltip === 'benefitTaxCost' && (
            <div 
              className="fixed z-[9999] w-80 p-4 bg-gray-900 text-white text-sm rounded-xl shadow-2xl whitespace-pre-line"
              style={{
                top: '120px',
                left: '50%',
                transform: 'translateX(-50%)'
              }}
            >
              <div className="font-bold mb-2 text-b3-turquoise text-base">{label}</div>
              {description}
            </div>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="overflow-x-auto overflow-y-visible">
      <table className="w-full">
        <thead>
          <tr className="border-b-2 border-gray-200">
            <th className="text-left py-3 px-4 font-semibold text-gray-700">
              <SortButton field="model" label="Bilmodell" />
            </th>
            <th className="text-right py-3 px-4 font-semibold text-gray-700">
              <SortButton field="purchasePrice" label="Inköpspris" />
            </th>
            <th className="text-right py-3 px-4 font-semibold text-gray-700">
              <SortButton field="annualLeasingCost" label="Leasing (mån)" />
            </th>
            <th className="text-right py-3 px-4 font-semibold text-gray-700">
              <SortButton field="totalCostFromRAM" label="RAM-kostnad (år/mån)" />
            </th>
            <th className="text-right py-3 px-4 font-semibold text-gray-700">
              <SortButton field="salaryEquivalent" label="Motsv. Nettolön (år/mån)" />
            </th>
            <th className="text-right py-3 px-4 font-semibold text-gray-700">
              <BenefitTaxLabel />
            </th>
            <th className="text-right py-3 px-4 font-semibold text-gray-700">
              <SortButton field="costPerMile" label="Kostnad/mil" />
            </th>
            <th className="text-center py-3 px-4 font-semibold text-gray-700">Åtgärder</th>
          </tr>
        </thead>
        <tbody>
          {cars.map((car) => (
            <tr
              key={car.id || Math.random()}
              className="border-b border-gray-100 hover:bg-gray-50 transition-colors"
            >
              <td className="py-3 px-4">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-gray-900">{car.model}</span>
                  {car.isElectric && (
                    <span className="text-xs bg-b3-turquoise bg-opacity-20 text-b3-turquoise-dark px-2 py-1 rounded">
                      Elbil
                    </span>
                  )}
                  {car.isPluginHybrid && (
                    <span className="text-xs bg-b3-blue bg-opacity-20 text-b3-blue-dark px-2 py-1 rounded">
                      Laddhybrid
                    </span>
                  )}
                </div>
              </td>
              <td className="py-3 px-4 text-right text-gray-700">
                {formatCurrency(car.purchasePrice)}
              </td>
              <td className="py-3 px-4 text-right text-gray-700">
                {car.annualLeasingCost 
                  ? formatCurrency(Math.round(car.annualLeasingCost / 12))
                  : <span className="text-gray-400">-</span>
                }
              </td>
              <td className="py-3 px-4 text-right text-gray-700">
                <span>{formatCurrency(car.totalCostFromRAM)}</span>
                <span className="text-gray-400 mx-1">/</span>
                <span className="text-gray-500">{formatCurrency(Math.round(car.totalCostFromRAM / 12))}</span>
              </td>
              <td className="py-3 px-4 text-right text-gray-700">
                <span>{formatCurrency(car.salaryEquivalent)}</span>
                <span className="text-gray-400 mx-1">/</span>
                <span className="text-gray-500">{formatCurrency(Math.round(car.salaryEquivalent / 12))}</span>
              </td>
              <td className="py-3 px-4 text-right text-gray-700 font-medium text-b3-pink">
                {formatCurrency(calculateBenefitTaxCost(car.benefitValue))}
              </td>
              <td className="py-3 px-4 text-right text-gray-700 font-medium">
                {formatNumber(car.costPerMile, 2)} kr/mil
              </td>
              <td className="py-3 px-4">
                <div className="flex justify-center gap-2">
                  <button
                    onClick={() => onEdit(car)}
                    className="p-2 text-b3-turquoise hover:bg-b3-turquoise hover:bg-opacity-10 rounded-b3 transition-colors"
                    title="Redigera"
                  >
                    <Edit2 size={18} />
                  </button>
                  <button
                    onClick={() => car.id && onDelete(car.id)}
                    className="p-2 text-b3-pink hover:bg-b3-pink hover:bg-opacity-10 rounded-b3 transition-colors"
                    title="Ta bort"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
