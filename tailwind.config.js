/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // B3 Brandbook Colors (2024)
        b3: {
          turquoise: {
            DEFAULT: '#0CCCCC',
            dark: '#06A6A7',
            light: '#A4ECEC',
          },
          pink: {
            DEFAULT: '#DF668A',
            dark: '#C95678',
            light: '#EFB3C5',
          },
          blue: {
            DEFAULT: '#426DA9',
            dark: '#335B92',
            light: '#A1B6D4',
          },
          yellow: {
            DEFAULT: '#EFBD47',
            dark: '#C09632',
            light: '#F7DEA3',
          },
          beige: '#EEE8E4',
          grey: {
            DEFAULT: '#404040',
            dark: '#2A2A2A',
            light: '#A0A0A0',
          },
        },
      },
      fontFamily: {
        sans: ['Work Sans', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'sans-serif'],
        impact: ['Impact Label', 'Impact', 'Arial Black', 'sans-serif'],
      },
      borderRadius: {
        'b3': '24px', // B3 standard border radius
      },
    },
  },
  plugins: [],
}

