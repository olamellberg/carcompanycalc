import { ChevronRight } from 'lucide-react'
import { fmtInt } from '../lib/format'
import { Field, TextInput } from './ui/Field'

export interface UserSettings {
  grossSalary: number // Bruttolön per månad
  annualKm: number // Årlig körsträcka i km
  marginalTaxRate: number // Beräknad marginalskatt
}

interface GlobalSettingsProps {
  settings: UserSettings
  onSettingsChange: (settings: UserSettings) => void
}

// Förenklad svensk skattemodell 2026: skiktgräns 643 000 kr/år.
// Under gränsen ca 32 % kommunalskatt, över gränsen +20 % statlig skatt.
export function calculateMarginalTax(monthlyGrossSalary: number): number {
  return monthlyGrossSalary * 12 <= 643000 ? 0.32 : 0.52
}

/** Förutsättningar som gäller alla bilar: lön, körsträcka och därmed marginalskatt. */
export default function GlobalSettings({ settings, onSettingsChange }: GlobalSettingsProps) {
  const update = (patch: Partial<Pick<UserSettings, 'grossSalary' | 'annualKm'>>) => {
    const next = { ...settings, ...patch }
    onSettingsChange({ ...next, marginalTaxRate: calculateMarginalTax(next.grossSalary) })
  }

  const taxPercent = Math.round(settings.marginalTaxRate * 100)
  const annualMiles = Math.round(settings.annualKm / 10)

  return (
    <section aria-labelledby="settings-heading">
      <h2 id="settings-heading" className="text-lg font-semibold">
        Dina förutsättningar
      </h2>
      <p className="mt-1 text-sm text-ink-soft">Styr marginalskatten och kostnaden per mil för alla bilar.</p>

      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        <Field label="Bruttolön" htmlFor="gross-salary" hint="Per månad, före skatt">
          <TextInput
            id="gross-salary"
            type="number"
            inputMode="numeric"
            min={0}
            step={1000}
            suffix="kr/mån"
            value={settings.grossSalary}
            onChange={(e) => update({ grossSalary: Number(e.target.value) })}
          />
        </Field>

        <Field label="Körsträcka" htmlFor="annual-km" hint={`${fmtInt(annualMiles)} mil per år`}>
          <TextInput
            id="annual-km"
            type="number"
            inputMode="numeric"
            min={0}
            step={1000}
            suffix="km/år"
            value={settings.annualKm}
            onChange={(e) => update({ annualKm: Number(e.target.value) })}
          />
        </Field>

        <Field
          label="Marginalskatt"
          htmlFor="marginal-tax"
          hint={taxPercent > 32 ? 'Kommunal och statlig skatt' : 'Endast kommunalskatt'}
        >
          <TextInput id="marginal-tax" readOnly value={`${taxPercent} %`} className="num" />
        </Field>
      </div>

      <details className="disclosure mt-3">
        <summary>
          <ChevronRight size={16} aria-hidden="true" />
          Hur påverkar uppgifterna beräkningen?
        </summary>
        <div className="mt-3 max-w-prose space-y-3 text-sm text-ink-soft">
          <p>
            <strong className="font-medium text-ink">Bruttolönen</strong> avgör din marginalskatt: 32 % under
            skiktgränsen 643 000 kr per år och 52 % över den. Marginalskatten används både för förmånskostnaden
            och för vad pengarna hade gett dig i nettolön.
          </p>
          <p>
            <strong className="font-medium text-ink">Körsträckan</strong> används bara för kostnaden per mil.
          </p>
          <p>
            <strong className="font-medium text-ink">Varför blir milkostnaden lägre med högre lön?</strong> Med
            högre marginalskatt förlorar du mindre nettolön på att ha bilen, eftersom en större del av pengarna
            ändå hade gått i skatt om de betalats ut som lön. Lägger arbetsgivaren 100 000 kr på bilen hade du
            fått ungefär 52 000 kr netto vid 32 % skatt men bara 37 000 kr vid 52 %. Förmånsbilen blir därför
            relativt sett förmånligare ju högre marginalskatt du har.
          </p>
        </div>
      </details>
    </section>
  )
}
