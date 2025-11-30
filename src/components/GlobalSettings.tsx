import { useState, useEffect } from 'react'
import { Settings, ChevronDown, ChevronUp } from 'lucide-react'

export interface UserSettings {
  grossSalary: number // Bruttolön per månad
  annualKm: number // Årlig körsträcka i km
  marginalTaxRate: number // Beräknad marginalskatt
}

interface GlobalSettingsProps {
  settings: UserSettings
  onSettingsChange: (settings: UserSettings) => void
}

// Beräkna marginalskatt baserat på årsinkomst (förenklad svensk skattemodell 2025)
function calculateMarginalTax(monthlyGrossSalary: number): number {
  const annualSalary = monthlyGrossSalary * 12
  
  // Förenklad skattemodell:
  // - Under ~614 000 kr/år: ca 32% kommunalskatt
  // - Över ~614 000 kr/år: +20% statlig skatt = ca 52%
  // - Över ~919 000 kr/år: +5% värnskatt (borttagen, men högre marginal)
  
  if (annualSalary <= 614000) {
    return 0.32 // Endast kommunalskatt
  } else if (annualSalary <= 919000) {
    return 0.52 // Kommunalskatt + statlig skatt
  } else {
    return 0.57 // Högsta marginalskatten
  }
}

export default function GlobalSettings({ settings, onSettingsChange }: GlobalSettingsProps) {
  const [isExpanded, setIsExpanded] = useState(false)
  const [grossSalary, setGrossSalary] = useState(settings.grossSalary)
  const [annualKm, setAnnualKm] = useState(settings.annualKm)

  // Beräkna marginalskatt när bruttolön ändras
  useEffect(() => {
    const newMarginalTax = calculateMarginalTax(grossSalary)
    onSettingsChange({
      grossSalary,
      annualKm,
      marginalTaxRate: newMarginalTax
    })
  }, [grossSalary, annualKm])

  const marginalTaxPercent = Math.round(calculateMarginalTax(grossSalary) * 100)
  const annualMiles = Math.round(annualKm / 10)

  return (
    <div className="bg-white rounded-b3 shadow-lg mb-6 overflow-hidden">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between p-4 hover:bg-gray-50 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="p-2 bg-b3-turquoise bg-opacity-10 rounded-lg">
            <Settings size={20} className="text-b3-turquoise" />
          </div>
          <div className="text-left">
            <h3 className="font-semibold text-b3-grey">Personliga inställningar</h3>
            <p className="text-sm text-gray-500">
              Bruttolön: {grossSalary.toLocaleString('sv-SE')} kr/mån • 
              Körsträcka: {annualKm.toLocaleString('sv-SE')} km/år ({annualMiles} mil) • 
              Marginalskatt: {marginalTaxPercent}%
            </p>
          </div>
        </div>
        {isExpanded ? (
          <ChevronUp size={20} className="text-gray-400" />
        ) : (
          <ChevronDown size={20} className="text-gray-400" />
        )}
      </button>

      {isExpanded && (
        <div className="p-6 pt-2 border-t border-gray-100">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Bruttolön */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Din bruttolön (kr/månad)
              </label>
              <input
                type="number"
                value={grossSalary}
                onChange={(e) => setGrossSalary(Number(e.target.value))}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-b3-turquoise focus:border-transparent"
                step="1000"
                min="0"
              />
              <p className="text-xs text-gray-500 mt-1">
                Påverkar vilken marginalskatt som används i beräkningarna
              </p>
            </div>

            {/* Årlig körsträcka */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Årlig körsträcka (km/år)
              </label>
              <input
                type="number"
                value={annualKm}
                onChange={(e) => setAnnualKm(Number(e.target.value))}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-b3-turquoise focus:border-transparent"
                step="1000"
                min="0"
              />
              <p className="text-xs text-gray-500 mt-1">
                = {annualMiles.toLocaleString('sv-SE')} mil/år. Påverkar kostnad per mil.
              </p>
            </div>

            {/* Beräknad marginalskatt (readonly) */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Beräknad marginalskatt
              </label>
              <div className="w-full px-4 py-3 bg-gray-100 border border-gray-300 rounded-lg text-gray-700 font-medium">
                {marginalTaxPercent}%
              </div>
              <p className="text-xs text-gray-500 mt-1">
                {marginalTaxPercent <= 32 && 'Endast kommunalskatt'}
                {marginalTaxPercent > 32 && marginalTaxPercent <= 52 && 'Kommunal + statlig skatt'}
                {marginalTaxPercent > 52 && 'Högsta marginalskatt'}
              </p>
            </div>
          </div>

          <div className="mt-4 p-4 bg-b3-beige rounded-lg">
            <p className="text-sm text-b3-grey">
              <strong>Så påverkar inställningarna beräkningarna:</strong><br/>
              • <strong>Bruttolön</strong> → Bestämmer din marginalskatt (32-57%)<br/>
              • <strong>Marginalskatt</strong> → Påverkar "Nettolön istället" och TCO-beräkningar<br/>
              • <strong>Körsträcka</strong> → Påverkar "Kostnad/mil"
            </p>
          </div>

          <div className="mt-3 p-4 bg-b3-turquoise bg-opacity-10 rounded-lg border border-b3-turquoise border-opacity-30">
            <p className="text-sm text-b3-grey">
              <strong>💡 Varför blir milkostnaden lägre vid högre lön?</strong><br/><br/>
              Med högre marginalskatt "förlorar" du mindre nettolön på att ha förmånsbilen, 
              eftersom pengarna ändå hade skattats bort till stor del om de betalats ut som lön.<br/><br/>
              <strong>Exempel:</strong> Om arbetsgivaren lägger 100 000 kr på bilen:<br/>
              • Vid 32% marginalskatt → du hade fått ~52 000 kr netto<br/>
              • Vid 52% marginalskatt → du hade fått ~37 000 kr netto<br/><br/>
              Förmånsbilen blir alltså relativt sett <em>fördelaktigare</em> ju högre marginalskatt du har.
              Detta är en av anledningarna till att förmånsbilar är populära bland höginkomsttagare.
            </p>
          </div>
        </div>
      )}
    </div>
  )
}

