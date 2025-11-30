/**
 * B3 Brandbook Colors & Theme
 * Källa: Brandbook B3_2024.pdf (Version 2024.04.16.02)
 * Design av: Rebel and Bird / Henrik Lindqvist
 */

export const B3_COLORS = {
  // Primära färger (från brandbooken)
  turquoise: '#0CCCCC',      // Turquoise (Primary) - PANTONE 3258
  turquoiseDark: '#06A6A7',   // Darker shade
  turquoiseLight: '#A4ECEC',  // Lighter shade
  
  pink: '#DF668A',            // Pink (Primary) - PANTONE 7423
  pinkDark: '#C95678',        // Darker shade
  pinkLight: '#EFB3C5',       // Lighter shade
  
  // Sekundära färger (från brandbooken)
  blue: '#426DA9',            // Blue (Secondary) - PANTONE 7683
  blueDark: '#335B92',        // Darker shade
  blueLight: '#A1B6D4',       // Lighter shade
  
  yellow: '#EFBD47',          // Yellow (Secondary) - PANTONE 142
  yellowDark: '#C09632',      // Darker shade
  yellowLight: '#F7DEA3',     // Lighter shade
  
  // Neutrala färger (från brandbooken)
  beige: '#EEE8E4',           // Beige (Background)
  grey: '#404040',            // Grey (Text/Contrast)
  greyDark: '#2A2A2A',        // Darker grey
  greyLight: '#A0A0A0',       // Lighter grey
  
  // Textfärger
  textPrimary: '#404040',     // Huvudtext (Grey)
  textSecondary: '#666666',   // Sekundär text
  textMuted: '#999999',       // Dämpad text
  textWhite: '#FFFFFF',
  textBlack: '#000000',
  
  // Bakgrundsfärger
  background: '#FFFFFF',
  backgroundBeige: '#EEE8E4', // B3s beige bakgrund
  backgroundLight: '#F8F9FA',
  backgroundDark: '#404040',
  
  // Status-färger (anpassade till B3s palett)
  success: '#0CCCCC',         // Turquoise för success
  warning: '#EFBD47',         // Yellow för warning
  error: '#DF668A',           // Pink för error
  info: '#426DA9',            // Blue för info
  
  // Border och dividers
  border: '#DEE2E6',
  borderLight: '#EEE8E4',     // Beige
  borderDark: '#404040',      // Grey
}

export const B3_FONTS = {
  primary: "'Work Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
  heading: "'Work Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif", // Work Sans för alla
  impact: "'Impact Label', 'Impact', 'Arial Black', sans-serif", // Endast versaler, speciella fall
  mono: "'Courier New', monospace",
}

// Typography sizes (från brandbooken)
export const B3_TYPOGRAPHY = {
  // Web sizes
  h1: { size: '56px', lineHeight: '110%', weight: '650' },
  h2: { size: '36px', lineHeight: '120%', weight: '700' },
  h3: { size: '32px', lineHeight: '120%', weight: '700' },
  h4: { size: '24px', lineHeight: '120%', weight: '700' },
  h5: { size: '20px', lineHeight: '130%', weight: '700' },
  body: { size: '15px', lineHeight: '155%', weight: 'regular' },
  vinjet: { size: '14px', lineHeight: '100%', weight: 'regular' },
  dymo: { size: '21px', lineHeight: '120%', weight: 'regular' },
}

export const B3_SPACING = {
  xs: '0.25rem',  // 4px
  sm: '0.5rem',   // 8px
  md: '1rem',     // 16px
  lg: '1.5rem',   // 24px
  xl: '2rem',     // 32px
  '2xl': '3rem',  // 48px
}

export const B3_RADIUS = {
  sm: '0.25rem',  // 4px
  md: '0.5rem',   // 8px
  lg: '0.75rem',  // 12px
  xl: '1rem',     // 16px
  xxl: '1.5rem',  // 24px (B3 standard för web enligt brandbook)
  full: '9999px',
}

export const B3_SHADOWS = {
  sm: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
  md: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
  lg: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
  xl: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
}

