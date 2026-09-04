// Kör: npm test  (Node >= 22.6 kör TypeScript direkt)
import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  calculateBenefitValue,
  calculateTotalCostFromRAM,
  calculateSalaryEquivalent,
  calculateMonthlyLeasing,
} from './calculations.ts'

test('förmånsvärde 2026: bensinbil 500 000 kr, fordonsskatt 5 328', () => {
  // 17 168 + 13% × 500 000 + 2,785% × 500 000 + 5 328
  assert.equal(calculateBenefitValue(500000), 101421)
})

test('förmånsvärde: elbil får 10 000 kr reduktion', () => {
  assert.equal(calculateBenefitValue(500000, true), 91421)
})

test('förmånsvärde: elbilsreduktion max 50%', () => {
  // 17 168 + 1 300 + 278,5 + 0 = 18 746,5 → halveras
  assert.equal(calculateBenefitValue(10000, true, false, undefined, true, 0), 9373)
})

test('förmånsvärde: >= 3000 tjänstemil ger 25% lägre grundbelopp', () => {
  assert.equal(calculateBenefitValue(500000, false, false, undefined, true, 5328, 0, 3000), 97129)
})

test('förmånsvärde: bil före juli 2022 använder schablon 5 328', () => {
  assert.equal(calculateBenefitValue(500000, false, false, undefined, false, 9999), 101421)
})

test('RAM-kostnad: leasing med halv moms lyft + försäkring + underhåll + skatt + arbetsgivaravgift', () => {
  // 120 000 × 0,9 + 7 500 + 2 500 + 6 000 + 100 000 × 0,3142
  assert.equal(calculateTotalCostFromRAM(500000, 100000, 15000, true, 120000, 3000), 155420)
})

test('RAM-kostnad: < 100 tjänstemil → ingen moms lyfts', () => {
  assert.equal(calculateTotalCostFromRAM(500000, 100000, 15000, true, 120000, 50), 167420)
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
