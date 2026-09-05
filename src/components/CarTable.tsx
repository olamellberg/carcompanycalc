import type { ReactNode } from 'react'
import { ArrowDown, ArrowUp, HelpCircle, Pencil, Trash2 } from 'lucide-react'
import { ramCostBreakdownFor, type CarCalculations } from '../lib/calculations'
import { fmtDec, fmtInt, fmtKr, fmtPct } from '../lib/format'
import { Tooltip } from './ui/Tooltip'

const EMPLOYER_FEE = 0.3142

type SortKey = keyof CarCalculations

interface CarTableProps {
  cars: CarCalculations[]
  sortField: SortKey | null
  sortDirection: 'asc' | 'desc'
  onSort: (field: SortKey) => void
  onEdit: (car: CarCalculations) => void
  onDelete: (car: CarCalculations) => void
  marginalTaxRate: number // Marginalskatt från personliga inställningar
}

// --- Kvitton: beräkningsuppställningar som visas i tooltip per cell ---

interface ReceiptLine {
  label: string
  value?: string
  kind?: 'sum' | 'note'
}

interface Receipt {
  title: string
  lines: ReceiptLine[]
}

function ReceiptView({ receipt }: { receipt: Receipt }) {
  return (
    <>
      <div className="tip-title">{receipt.title}</div>
      {receipt.lines.map((line, i) =>
        line.kind === 'note' ? (
          <p key={i} className="tip-note">
            {line.label}
          </p>
        ) : (
          <div key={i} className={`tip-row${line.kind === 'sum' ? ' is-sum' : ''}`}>
            <span>{line.label}</span>
            <span>{line.value}</span>
          </div>
        )
      )}
    </>
  )
}

function Help({ title, children }: { title: string; children: ReactNode }) {
  return (
    <Tooltip
      label={`Förklaring: ${title}`}
      className="icon-help"
      content={
        <>
          <div className="tip-title">{title}</div>
          {children}
        </>
      }
    >
      <HelpCircle size={14} aria-hidden="true" />
    </Tooltip>
  )
}

interface HeaderProps {
  field: SortKey
  label: string
  unit?: string
  help?: ReactNode
  align?: 'left' | 'right'
  className?: string
  rowSpan?: number
  sortField: SortKey | null
  sortDirection: 'asc' | 'desc'
  onSort: (field: SortKey) => void
}

function SortHeader({
  field,
  label,
  unit,
  help,
  align = 'right',
  className,
  rowSpan,
  sortField,
  sortDirection,
  onSort,
}: HeaderProps) {
  const active = sortField === field
  return (
    <th
      scope="col"
      rowSpan={rowSpan}
      className={className}
      aria-sort={active ? (sortDirection === 'asc' ? 'ascending' : 'descending') : undefined}
    >
      <div className={`inline-flex flex-col ${align === 'left' ? 'items-start' : 'items-end'}`}>
        <span className="inline-flex items-center gap-1">
          <button type="button" className="th-btn" onClick={() => onSort(field)}>
            {label}
            {active &&
              (sortDirection === 'asc' ? (
                <ArrowUp size={14} aria-hidden="true" />
              ) : (
                <ArrowDown size={14} aria-hidden="true" />
              ))}
          </button>
          {help && <Help title={label}>{help}</Help>}
        </span>
        {unit && <span className="text-2xs font-normal text-ink-faint">{unit}</span>}
      </div>
    </th>
  )
}

export default function CarTable({
  cars,
  sortField,
  sortDirection,
  onSort,
  onEdit,
  onDelete,
  marginalTaxRate,
}: CarTableProps) {
  const taxPct = fmtPct(marginalTaxRate)
  const netPct = fmtPct(1 - marginalTaxRate)

  const benefitTaxPerMonth = (car: CarCalculations) => Math.round((car.benefitValue / 12) * marginalTaxRate)
  const netSalaryPerMonth = (car: CarCalculations) => Math.round(car.salaryEquivalent / 12)
  const totalPerMonth = (car: CarCalculations) => netSalaryPerMonth(car) + benefitTaxPerMonth(car)

  const totals = cars.map(totalPerMonth)
  const maxTotal = Math.max(...totals, 1)
  const lowestTotal = Math.min(...totals)

  function ramReceipt(car: CarCalculations): Receipt {
    const b = ramCostBreakdownFor(car)
    const lines: ReceiptLine[] = [
      {
        label: b.isLeasing
          ? b.halfVatLifted
            ? 'Leasing efter momslyft (90 %)'
            : 'Leasing inklusive moms'
          : 'Värdeminskning 20 % vid köp',
        value: fmtKr(b.operating),
      },
    ]
    if (b.insurance > 0) lines.push({ label: 'Försäkring 1,5 % av priset', value: fmtKr(b.insurance) })
    if (b.maintenance > 0) lines.push({ label: 'Underhåll 0,5 % av priset', value: fmtKr(b.maintenance) })
    lines.push(
      { label: 'Fordonsskatt', value: fmtKr(b.vehicleTax) },
      { label: 'Arbetsgivaravgift 31,42 % på förmånsvärdet', value: fmtKr(b.employerFees) },
      { label: 'Per år', value: fmtKr(b.total), kind: 'sum' },
      { label: 'Per månad', value: fmtKr(b.total / 12), kind: 'sum' },
      { label: 'Drivmedel belastar inte ramen utan hanteras via körjournal.', kind: 'note' }
    )
    return { title: 'RAM-kostnad', lines }
  }

  function netSalaryReceipt(car: CarCalculations): Receipt {
    const annualLeasing = car.annualLeasingCost || car.purchasePrice * 0.2
    const fees = car.benefitValue * EMPLOYER_FEE
    const employerCost = annualLeasing + fees
    const gross = employerCost / (1 + EMPLOYER_FEE)
    return {
      title: 'Nettolön istället',
      lines: [
        {
          label: car.annualLeasingCost ? 'Leasing inklusive moms' : 'Värdeminskning 20 % vid köp',
          value: fmtKr(annualLeasing),
        },
        { label: 'Arbetsgivaravgift 31,42 % på förmånsvärdet', value: fmtKr(fees) },
        { label: 'Arbetsgivarens kostnad per år', value: fmtKr(employerCost), kind: 'sum' },
        { label: 'Som bruttolön, delat med 1,3142', value: fmtKr(gross) },
        { label: `Kvar efter ${taxPct} marginalskatt`, value: fmtKr(car.salaryEquivalent), kind: 'sum' },
        { label: 'Per månad', value: fmtKr(car.salaryEquivalent / 12), kind: 'sum' },
        { label: 'Så mycket nettolön hade pengarna gett om de betalats ut som lön.', kind: 'note' },
      ],
    }
  }

  function benefitTaxReceipt(car: CarCalculations): Receipt {
    return {
      title: 'Förmånskostnad',
      lines: [
        { label: 'Förmånsvärde per år', value: fmtKr(car.benefitValue) },
        { label: 'Per månad', value: fmtKr(car.benefitValue / 12) },
        { label: `Skatt ${taxPct} per månad`, value: fmtKr(benefitTaxPerMonth(car)), kind: 'sum' },
        { label: 'Dras från nettolönen varje månad.', kind: 'note' },
      ],
    }
  }

  function totalReceipt(car: CarCalculations): Receipt {
    return {
      title: 'Totalt för dig',
      lines: [
        { label: 'Nettolön istället', value: fmtKr(netSalaryPerMonth(car)) },
        { label: 'Förmånskostnad', value: fmtKr(benefitTaxPerMonth(car)) },
        { label: 'Per månad', value: fmtKr(totalPerMonth(car)), kind: 'sum' },
        { label: 'Jämförbart med vad en privatleasing kostar per månad.', kind: 'note' },
      ],
    }
  }

  function perMileReceipt(car: CarCalculations): Receipt {
    const annualKm = car.annualKm || 15000
    const annualMiles = annualKm / 10
    const annualBenefitTax = car.benefitValue * marginalTaxRate
    const annualTotal = car.salaryEquivalent + annualBenefitTax
    return {
      title: 'Kostnad per mil',
      lines: [
        { label: 'Nettolön istället per år', value: fmtKr(car.salaryEquivalent) },
        { label: `Förmånskostnad per år (${taxPct})`, value: fmtKr(annualBenefitTax) },
        { label: 'Total privat kostnad per år', value: fmtKr(annualTotal), kind: 'sum' },
        { label: 'Körsträcka', value: `${fmtInt(annualKm)} km = ${fmtInt(annualMiles)} mil` },
        { label: 'Per mil', value: `${fmtDec(car.costPerMile)} kr`, kind: 'sum' },
      ],
    }
  }

  const headerProps = { sortField, sortDirection, onSort }

  return (
    <table className="cmp">
      <thead>
        <tr>
          <SortHeader
            {...headerProps}
            field="model"
            label="Bil"
            align="left"
            rowSpan={2}
            className="th-model min-w-[14rem]"
          />
          <SortHeader
            {...headerProps}
            field="purchasePrice"
            label="Inköpspris"
            unit="kr"
            rowSpan={2}
            help={<p>Priset bilen köps eller leasas för. Grund för leasingkostnaden.</p>}
          />
          <th scope="colgroup" colSpan={2} className="group-head">
            Belastar ramen
          </th>
          <th scope="colgroup" colSpan={4} className="group-head is-accent">
            Kostar dig
          </th>
          <th scope="col" rowSpan={2} className="th-actions">
            <span className="sr-only">Åtgärder</span>
          </th>
        </tr>
        <tr>
          <SortHeader
            {...headerProps}
            field="annualLeasingCost"
            label="Leasing"
            unit="kr/mån"
            help={
              <p>
                Leasingkostnad inklusive moms, beräknad som annuitet med restvärde. Vid minst 100 tjänstemil
                per år lyfter B3 halva momsen.
              </p>
            }
          />
          <SortHeader
            {...headerProps}
            field="totalCostFromRAM"
            label={'RAM‑kostnad'}
            unit="kr/mån"
            help={
              <>
                <p>
                  Det bilen belastar ramen med: leasing, försäkring, underhåll, fordonsskatt och
                  arbetsgivaravgifter på förmånsvärdet.
                </p>
                <p>Drivmedel belastar inte ramen.</p>
              </>
            }
          />
          <SortHeader
            {...headerProps}
            field="benefitValue"
            label="Förmånskostnad"
            unit="kr/mån"
            help={
              <p>
                Skatten du betalar på förmånsvärdet varje månad: förmånsvärdet per månad gånger din
                marginalskatt på {taxPct}. Dras från nettolönen.
              </p>
            }
          />
          <SortHeader
            {...headerProps}
            field="salaryEquivalent"
            label="Nettolön istället"
            unit="kr/mån"
            help={
              <p>
                Vad arbetsgivarens kostnad hade gett dig i nettolön om den betalats ut som lön: kostnaden delad
                med 1,3142 för arbetsgivaravgiften, och sedan {netPct} kvar efter marginalskatt.
              </p>
            }
          />
          <SortHeader
            {...headerProps}
            field="costPerMile"
            label="Totalt"
            unit="kr/mån"
            className="min-w-[8rem]"
            help={
              <>
                <p>Din totala privata kostnad per månad: nettolön istället plus förmånskostnad.</p>
                <p>Jämförbart med vad en privatleasing kostar. Stapeln visar kostnaden i förhållande till den dyraste bilen.</p>
              </>
            }
          />
          <SortHeader
            {...headerProps}
            field="costPerMile"
            label={'Per mil'}
            unit="kr/mil"
            help={<p>Total privat kostnad per år delad med antalet mil du kör.</p>}
          />
        </tr>
      </thead>
      <tbody>
        {cars.map((car, index) => {
          const total = totalPerMonth(car)
          const isLowest = cars.length > 1 && total === lowestTotal
          return (
            <tr key={car.id ?? `${car.model}-${index}`}>
              <td className="cell-model">
                <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                  <span className="font-semibold">{car.model}</span>
                  {car.isElectric && <span className="tag tag-electric">Elbil</span>}
                  {car.isPluginHybrid && <span className="tag tag-hybrid">Laddhybrid</span>}
                </div>
                {car.isLeasing && car.leasingPeriod && (
                  <p className="mt-0.5 text-xs text-ink-faint">
                    Leasing {car.leasingPeriod} mån, {fmtDec(car.interestRate ?? 5, 1)} % ränta
                  </p>
                )}
              </td>

              <td>
                <span className="cell-label">Inköpspris, kr</span>
                {fmtInt(car.purchasePrice)}
              </td>

              <td>
                <span className="cell-label">Leasing, kr/mån</span>
                {car.annualLeasingCost ? (
                  fmtInt(car.annualLeasingCost / 12)
                ) : (
                  <span className="text-ink-faint">–</span>
                )}
              </td>

              <td>
                <span className="cell-label">RAM-kostnad, kr/mån</span>
                <Tooltip className="val-btn" content={<ReceiptView receipt={ramReceipt(car)} />}>
                  {fmtInt(car.totalCostFromRAM / 12)}
                </Tooltip>
              </td>

              <td>
                <span className="cell-label">Förmånskostnad, kr/mån</span>
                <Tooltip className="val-btn" content={<ReceiptView receipt={benefitTaxReceipt(car)} />}>
                  {fmtInt(benefitTaxPerMonth(car))}
                </Tooltip>
              </td>

              <td>
                <span className="cell-label">Nettolön istället, kr/mån</span>
                <Tooltip className="val-btn" content={<ReceiptView receipt={netSalaryReceipt(car)} />}>
                  {fmtInt(netSalaryPerMonth(car))}
                </Tooltip>
              </td>

              <td className="cell-total">
                <span className="cell-label">Totalt, kr/mån</span>
                <Tooltip
                  className="val-btn text-md font-semibold"
                  content={<ReceiptView receipt={totalReceipt(car)} />}
                >
                  {fmtInt(total)}
                </Tooltip>
                {isLowest && <span className="sr-only">Lägst kostnad</span>}
                <div className="bar" aria-hidden="true">
                  <div
                    className={`bar-fill${isLowest ? ' is-lowest' : ''}`}
                    style={{ width: `${Math.max(4, (total / maxTotal) * 100)}%` }}
                  />
                </div>
              </td>

              <td>
                <span className="cell-label">Per mil, kr</span>
                <Tooltip className="val-btn" content={<ReceiptView receipt={perMileReceipt(car)} />}>
                  {fmtDec(car.costPerMile)}
                </Tooltip>
              </td>

              <td className="cell-actions">
                <button
                  type="button"
                  onClick={() => onEdit(car)}
                  className="icon-btn"
                  aria-label={`Redigera ${car.model}`}
                  title="Redigera"
                >
                  <Pencil size={16} aria-hidden="true" />
                </button>
                <button
                  type="button"
                  onClick={() => onDelete(car)}
                  className="icon-btn is-danger"
                  aria-label={`Ta bort ${car.model}`}
                  title="Ta bort"
                >
                  <Trash2 size={16} aria-hidden="true" />
                </button>
              </td>
            </tr>
          )
        })}
      </tbody>
    </table>
  )
}
