// Kör: npm test  (Node >= 22.6 kör TypeScript direkt)
import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  calculateBenefitValue,
  calculateBenefitValueBreakdown,
  calculateTotalCostFromRAM,
  calculateSalaryEquivalent,
  calculateMonthlyLeasing,
} from './calculations.ts'

// Skatteverkets egen uppställning 2026 för Mercedes-Benz E 300 de 4MATIC Kombi (laddhybrid):
// nybilspris 662 000 − 140 000 = 522 000; 17 168 + 14 537 + 67 860 + 5 292 = 104 857 kr/år
test('förmånsvärde 2026: laddhybrid matchar Skatteverkets exempel', () => {
  const b = calculateBenefitValueBreakdown(662000, false, true, true, 5292)
  assert.equal(b.priceReduction, 140000)
  assert.equal(b.taxablePrice, 522000)
  assert.equal(b.baseAmount, 17168)
  assert.equal(b.interestPart, 14537)
  assert.equal(b.pricePart, 67860)
  assert.equal(b.vehicleTax, 5292)
  assert.equal(b.total, 104857)
  assert.equal(calculateBenefitValue(662000, false, true, true, 5292), 104857)
})

test('förmånsvärde: bensinbil 500 000 kr, fordonsskatt 5 292', () => {
  // 17 168 + 2,785 % × 500 000 + 13 % × 500 000 + 5 292
  assert.equal(calculateBenefitValue(500000, false, false, true, 5292), 17168 + 13925 + 65000 + 5292)
})

test('förmånsvärde: elbil får nybilspriset nedsatt med 350 000 kr', () => {
  // 900 000 − 350 000 = 550 000; 17 168 + 15 317 + 71 500 + 360
  assert.equal(calculateBenefitValue(900000, true, false, true, 360), 104345)
})

test('förmånsvärde: nedsättningen är högst 50 % av priset', () => {
  // 449 900 → högst 224 950; 17 168 + 6 264 + 29 243 + 360
  const b = calculateBenefitValueBreakdown(449900, true, false, true, 360)
  assert.equal(b.priceReduction, 224950)
  assert.equal(b.total, 53035)
})

test('förmånsvärde: extrautrustning läggs till priset före nedsättning', () => {
  const b = calculateBenefitValueBreakdown(600000, false, true, true, 0, 50000)
  assert.equal(b.listPrice, 650000)
  assert.equal(b.taxablePrice, 510000)
})

test('förmånsvärde: minst 3 000 tjänstemil ger 75 % av hela värdet', () => {
  // 101 385 × 0,75 = 76 038,75 → 76 038
  assert.equal(calculateBenefitValue(500000, false, false, true, 5292, 0, 3000), 76038)
})

test('förmånsvärde: bil tagen i trafik före 1 juli 2022 får ingen schablonnedsättning', () => {
  // 17 168 + 18 436 + 86 060 + 5 292
  assert.equal(calculateBenefitValue(662000, false, true, false, 5292), 126956)
})

test('förmånsvärde: pris 0 ger 0', () => {
  assert.equal(calculateBenefitValue(0), 0)
})

test('RAM-kostnad: leasing med halv moms lyft + försäkring + skatt + arbetsgivaravgift', () => {
  // 120 000 × 0,9 + 7 500 + 6 000 + 100 000 × 0,3142
  assert.equal(calculateTotalCostFromRAM(500000, 100000, 15000, true, 120000, 3000), 152920)
})

test('RAM-kostnad: < 100 tjänstemil → ingen moms lyfts', () => {
  // 120 000 + 7 500 + 6 000 + 31 420
  assert.equal(calculateTotalCostFromRAM(500000, 100000, 15000, true, 120000, 50), 164920)
})

test('nettolön istället: 50% marginalskatt', () => {
  // (120 000 + 31 420) / 1,3142 × 0,5
  assert.equal(calculateSalaryEquivalent(120000, 100000, 0.5), 57609)
})

test('leasing: 0% ränta = värdeminskning / månader', () => {
  assert.equal(calculateMonthlyLeasing(500000, 0, 36, 0.5), 250000 / 36)
})

test('leasing: ränta ökar månadskostnaden', () => {
  assert.ok(calculateMonthlyLeasing(500000, 5, 36, 0.5) > 250000 / 36)
})
