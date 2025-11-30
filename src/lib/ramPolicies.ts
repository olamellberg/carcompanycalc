// RAM Policy constants and configurations
// Based on B3 RAM policies (B16 and C11)

// Note: JSON import requires resolveJsonModule in tsconfig.json
// For now, we'll define the structure manually based on the policy documents

/**
 * RAM Policy Information
 * This file contains constants and logic based on B3 RAM policies
 */

export interface RAMPolicyInfo {
  documentType: string
  lastModified: string
  responsible: string
  securityClass: string
  version: string
  approvedBy: string
  approvalDate: string
}

/**
 * RAM Policy Information Structure
 * Based on b3_ram_policies.json
 * 
 * B16: Lönepolicy (fast ersättning RAM)
 * - Document type: Policy
 * - Last modified: 2025-10-29
 * - Responsible: CHRO
 * - Security class: Intern
 * - Version: 4.0
 * - Approved by: KLG
 * - Approval date: 2025-10-29
 * 
 * C11: Riktlinjer för RAM (Ramguide)
 * - Document type: Riktlinje
 * - Last modified: 2025-05-22
 * - Responsible: CFO
 */

/**
 * RAM System Principles (from B16 and C11 policy documents):
 * 
 * B16 - Lönepolicy (fast ersättning RAM):
 * - "Ramen" (the frame) is a fundamental concept in the salary model
 * - Fast ersättning (fixed compensation) is part of the RAM system
 * - Personalbil: Samtliga kostnader belastar ram
 * - Ramen är ditt ansvar - varje medarbetare ansvarar för att ramen inte blir negativ
 * 
 * C11 - Riktlinjer för RAM (Ramguide):
 * - Förmånsbilskostnader som belastar ramen:
 *   * Leasing (eller depreciation vid köp)
 *   * Underhåll
 *   * Tillbehör
 *   * Skatt (fordonsskatt)
 *   * Försäkring
 *   * EJ drivmedel (drivmedel belastar inte ramen - hanteras via körjournal)
 * 
 * - Momsregler för leasing:
 *   * B3 får lyfta halva momsen på leasing
 *   * Vid mindre än 100 tjänstemil per år → ingen moms lyfts på leasing
 * 
 * - Förmånsvärde:
 *   * Beräknas enligt svenska skatteregler
 *   * Räknas som beskattad inkomst
 *   * Företaget kan kompensera anställd för skatt på förmånsvärde
 * 
 * - Milersättning:
 *   * För tjänsteresor med förmånsbil eller privatbil
 *   * Redovisas i Maconomy
 */

// RAM-specific calculation constants
export const RAM_CONSTANTS = {
  // Standard marginal tax rate used in RAM calculations
  STANDARD_MARGINAL_TAX_RATE: 0.50,
  
  // Employer social fees (arbetsgivaravgifter)
  EMPLOYER_SOCIAL_FEE_RATE: 0.3142,
  
  // Standard assumptions for car calculations
  STANDARD_ANNUAL_KM: 15000,
  STANDARD_DEPRECIATION_RATE: 0.20, // 20% per year
  STANDARD_INSURANCE_RATE: 0.015, // 1.5% of purchase price
  STANDARD_MAINTENANCE_RATE: 0.005, // 0.5% of purchase price
  STANDARD_FUEL_COST_PER_KM: 1.5, // kr per km
  STANDARD_ANNUAL_TAX: 6000 // kr per year
}

/**
 * According to RAM policy:
 * - Förmånsvärde is calculated according to Swedish tax regulations
 * - The benefit value is added to employee's taxable income
 * - Company may provide tax compensation (skatteersättning)
 * - Total cost from RAM includes car costs + tax compensation + employer fees
 */

