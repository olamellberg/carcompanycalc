// Svensk talformatering. Enheter sätts i rubriker, inte i varje cell,
// så de flesta hjälparna returnerar bara talet.

const LOCALE = 'sv-SE'

const intFormat = new Intl.NumberFormat(LOCALE, { maximumFractionDigits: 0 })

export function fmtInt(value: number): string {
  return intFormat.format(Math.round(value))
}

export function fmtDec(value: number, decimals = 2): string {
  return new Intl.NumberFormat(LOCALE, {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value)
}

export function fmtKr(value: number): string {
  return `${fmtInt(value)} kr`
}

export function fmtPct(fraction: number, decimals = 0): string {
  return `${fmtDec(fraction * 100, decimals)} %`
}
