import { Edit2, Trash2, ArrowUp, ArrowDown, HelpCircle } from 'lucide-react'
import { type CarCalculations } from '../lib/calculations'
import { useState, useRef } from 'react'

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
  benefitValue: 'Förmånsvärde per år enligt Skatteverkets regler 2026:\n• Grundbelopp: 0,29 × prisbasbelopp (59 200 kr)\n• + 13% av nybilspriset\n• + 2,785% (räntedel) × nybilspriset\n• + Fordonsskatt\n• - Miljöbilsreduktion\n• - 25% om ≥3000 tjänstemil/år',
  benefitTaxCost: 'Vad du betalar i skatt på förmånsvärdet per månad.\n\nBeräkning:\n• Förmånsvärde (år) ÷ 12 × din marginalskatt\n\nDetta är den faktiska kostnaden som dras från din nettolön varje månad för att ha förmånsbilen.',
  totalCostFromRAM: 'Total kostnad från RAM per år / månad:\n• Leasingkostnad\n• + Arbetsgivaravgifter på förmånsvärde (31,42%)\n• + Ev. driftskostnader som ej ingår i leasing',
  salaryEquivalent: 'Motsvarande nettolön om pengarna betalats ut som lön istället:\n\n• Arbetsgivarens kostnad = Leasing + arbetsgivaravgifter\n• Bruttolön = Kostnad ÷ 1,3142\n• Nettolön = Bruttolön × (1 - marginalskatt)',
  costPerMile: 'Total privat kostnad per mil:\n• (Motsv. Nettolön + Förmånskostnad) ÷ antal mil\n• Inkluderar både förlorad nettolön OCH skatten du betalar på förmånsvärdet\n• Visar den faktiska totalkostnaden per mil för dig privat',
  totalPrivateCost: 'Din totala privata månadskostnad för förmånsbilen.\n\nBeräkning:\n• Motsv. nettolön (mån) + Förmånskostnad (mån)\n\nDetta är direkt jämförbart med en privatleasing-kostnad.\n• Motsv. nettolön = vad du "förlorar" i lön\n• Förmånskostnad = skatten som dras på lönebeskedet'
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

  const fmt = (v: number) => Math.round(v).toLocaleString('sv-SE')
  const fmtDec = (v: number, d: number = 2) => v.toLocaleString('sv-SE', { minimumFractionDigits: d, maximumFractionDigits: d })
  const pct = (v: number) => `${Math.round(v * 100)}%`

  // Generera beräkningsuppställning per kolumn
  function getCalcBreakdown(car: CarCalculations, column: string): { label: string; lines: { text: string; bold?: boolean; separator?: boolean }[] } | null {
    const annualLeasing = car.annualLeasingCost || 0
    const benefitPerMonth = Math.round(car.benefitValue / 12)
    const benefitTax = calculateBenefitTaxCost(car.benefitValue)
    const monthlyNetSalary = Math.round(car.salaryEquivalent / 12)
    const agAvgift = car.benefitValue * 0.3142

    switch (column) {
      case 'ramCost':
        return {
          label: 'RAM-kostnad',
          lines: [
            { text: `Leasingkostnad: ${fmt(annualLeasing)} kr/år` },
            { text: `+ AG-avgifter: ${fmt(car.benefitValue)} × 31,42% = ${fmt(agAvgift)} kr/år` },
            { text: '', separator: true },
            { text: `= ${fmt(car.totalCostFromRAM)} kr/år`, bold: true },
            { text: `= ${fmt(Math.round(car.totalCostFromRAM / 12))} kr/mån`, bold: true },
          ]
        }

      case 'netSalary':
        const totalEmployerCost = annualLeasing + agAvgift
        const grossEquiv = totalEmployerCost / 1.3142
        return {
          label: 'Motsv. Nettolön',
          lines: [
            { text: `Arbetsgivarens kostnad:` },
            { text: `  Leasing: ${fmt(annualLeasing)} kr/år` },
            { text: `  + AG-avg på förmånsvärde: ${fmt(agAvgift)} kr/år` },
            { text: `  = ${fmt(Math.round(totalEmployerCost))} kr/år` },
            { text: '' , separator: true },
            { text: `Bruttolön: ${fmt(Math.round(totalEmployerCost))} ÷ 1,3142 = ${fmt(Math.round(grossEquiv))} kr/år` },
            { text: `Nettolön: ${fmt(Math.round(grossEquiv))} × (1 − ${pct(marginalTaxRate)}) = ${fmt(car.salaryEquivalent)} kr/år` },
            { text: '', separator: true },
            { text: `= ${fmt(Math.round(car.salaryEquivalent / 12))} kr/mån`, bold: true },
          ]
        }

      case 'benefitTax':
        return {
          label: 'Förmånskostnad',
          lines: [
            { text: `Förmånsvärde: ${fmt(car.benefitValue)} kr/år` },
            { text: `Per månad: ${fmt(car.benefitValue)} ÷ 12 = ${fmt(benefitPerMonth)} kr` },
            { text: `× Marginalskatt: ${pct(marginalTaxRate)}` },
            { text: '', separator: true },
            { text: `= ${fmt(benefitPerMonth)} × ${pct(marginalTaxRate)} = ${fmt(benefitTax)} kr/mån`, bold: true },
          ]
        }

      case 'totalPrivate':
        return {
          label: 'Total privat kostnad',
          lines: [
            { text: `Motsv. nettolön: ${fmt(monthlyNetSalary)} kr/mån` },
            { text: `+ Förmånskostnad: ${fmt(benefitTax)} kr/mån` },
            { text: '', separator: true },
            { text: `= ${fmt(monthlyNetSalary + benefitTax)} kr/mån`, bold: true },
            { text: `Jämförbart med privatleasing-kostnad` },
          ]
        }

      case 'costPerMile': {
        const annualMiles = (car.annualKm || 15000) / 10
        const annualNetSalary = car.salaryEquivalent
        const annualBenefitTax = car.benefitValue * marginalTaxRate
        const totalAnnual = annualNetSalary + annualBenefitTax
        return {
          label: 'Kostnad per mil',
          lines: [
            { text: `Motsv. nettolön: ${fmt(annualNetSalary)} kr/år` },
            { text: `+ Förmånskostnad: ${fmt(car.benefitValue)} × ${pct(marginalTaxRate)} = ${fmt(Math.round(annualBenefitTax))} kr/år` },
            { text: `= Total privat kostnad: ${fmt(Math.round(totalAnnual))} kr/år` },
            { text: '', separator: true },
            { text: `Körsträcka: ${fmt(car.annualKm || 15000)} km ÷ 10 = ${fmt(annualMiles)} mil` },
            { text: `${fmt(Math.round(totalAnnual))} ÷ ${fmt(annualMiles)} = ${fmtDec(car.costPerMile)} kr/mil`, bold: true },
          ]
        }
      }

      default:
        return null
    }
  }

  // Tooltip-komponent som visar beräkning vid hover
  const CalcTooltip = ({ car, column, children }: { car: CarCalculations; column: string; children: React.ReactNode }) => {
    const [show, setShow] = useState(false)
    const [pos, setPos] = useState<{ top: number; left: number } | null>(null)
    const ref = useRef<HTMLDivElement>(null)
    const breakdown = getCalcBreakdown(car, column)

    if (!breakdown) return <>{children}</>

    return (
      <div
        ref={ref}
        className="relative cursor-help"
        onMouseEnter={() => {
          setShow(true)
          if (ref.current) {
            const rect = ref.current.getBoundingClientRect()
            setPos({ top: rect.top - 8, left: rect.left + rect.width / 2 })
          }
        }}
        onMouseLeave={() => setShow(false)}
      >
        <span className="border-b border-dotted border-gray-400">{children}</span>
        {show && pos && (
          <div
            className="fixed z-[9999] w-80 p-4 bg-gray-900 text-white text-xs rounded-xl shadow-2xl font-mono"
            style={{
              top: `${pos.top}px`,
              left: `${pos.left}px`,
              transform: 'translate(-50%, -100%)'
            }}
          >
            <div className="font-bold mb-2 text-b3-turquoise text-sm font-sans">{breakdown.label}</div>
            {breakdown.lines.map((line, i) =>
              line.separator ? (
                <div key={i} className="border-t border-gray-600 my-1" />
              ) : (
                <div key={i} className={line.bold ? 'font-bold text-white mt-1 text-sm' : 'text-gray-300'}>
                  {line.text}
                </div>
              )
            )}
          </div>
        )}
      </div>
    )
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
              <SortButton field="totalCostFromRAM" label="RAM-kostnad (mån)" />
            </th>
            <th className="text-right py-3 px-4 font-semibold text-gray-700">
              <SortButton field="salaryEquivalent" label="Motsv. Nettolön (mån)" />
            </th>
            <th className="text-right py-3 px-4 font-semibold text-gray-700">
              <BenefitTaxLabel />
            </th>
            <th className="text-right py-3 px-4 font-semibold text-gray-700">
              <SortButton field="costPerMile" label="Total privat kostnad" customDescription={columnDescriptions.totalPrivateCost} />
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
                <CalcTooltip car={car} column="ramCost">
                  {formatCurrency(Math.round(car.totalCostFromRAM / 12))}
                </CalcTooltip>
              </td>
              <td className="py-3 px-4 text-right text-gray-700">
                <CalcTooltip car={car} column="netSalary">
                  {formatCurrency(Math.round(car.salaryEquivalent / 12))}
                </CalcTooltip>
              </td>
              <td className="py-3 px-4 text-right text-gray-700 font-medium text-b3-pink">
                <CalcTooltip car={car} column="benefitTax">
                  {formatCurrency(calculateBenefitTaxCost(car.benefitValue))}
                </CalcTooltip>
              </td>
              <td className="py-3 px-4 text-right text-gray-700 font-semibold text-b3-grey">
                <CalcTooltip car={car} column="totalPrivate">
                  {formatCurrency(Math.round(car.salaryEquivalent / 12) + calculateBenefitTaxCost(car.benefitValue))}
                </CalcTooltip>
              </td>
              <td className="py-3 px-4 text-right text-gray-700 font-medium">
                <CalcTooltip car={car} column="costPerMile">
                  {formatNumber(car.costPerMile, 2)} kr/mil
                </CalcTooltip>
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
