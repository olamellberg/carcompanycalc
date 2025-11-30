/**
 * Skatteverket Förmånsbil API
 * API för att hämta förmånsvärden för bilar enligt Skatteverket
 * Baserat på RowStore API: https://skatteverket.entryscape.net/rowstore/dataset/fad86bf9-67e3-4d68-829c-7b9a23bc5e42
 */

const API_BASE_URL = 'https://skatteverket.entryscape.net/rowstore/dataset/fad86bf9-67e3-4d68-829c-7b9a23bc5e42';

export interface SkatteverketCar {
  id: string;
  fordonstyp: string; // Fordonstyp (t.ex. "Personbil")
  kod: string; // Kod (t.ex. "14AB001")
  tillverkningsar: string; // Tillverkningsår
  marke: string; // Märke (t.ex. "Tesla")
  modell: string; // Modell (t.ex. "Model 3")
  beskrivning: string; // Full beskrivning (märke + modell)
  bransletyp: string; // Bränsletyp (t.ex. "Bensin", "El")
  nybilspris: number; // Nybilspris
  vardeefterschablon: number; // Förmånsvärde efter schablon (per år)
  justering: string; // Justering
  fordonsskatt?: number; // Fordonsskatt (kr/år) om tillgänglig från API
}

/**
 * Söker efter bilar i Skatteverkets databas
 */
/**
 * Söker efter bilar i Skatteverkets databas
 * Använder smart sökning - märke först, sedan modell-filtrering
 */
export async function searchCars(query: string): Promise<SkatteverketCar[]> {
  if (!query || query.trim().length < 2) {
    return [];
  }

  const searchQuery = query.trim();

  try {
    console.log('🔍 Searching Skatteverket for:', `"${searchQuery}"`);
    
    // Dela upp sökningen i märke och modell (t.ex. "Tesla Model 3" → "Tesla" + "Model 3")
    const words = searchQuery.split(/\s+/).filter(w => w.length > 0);
    const firstWord = words[0] || '';
    const restWords = words.slice(1).join(' ').toLowerCase();
    
    console.log('  - Märke (firstWord):', `"${firstWord}"`);
    console.log('  - Modell (restWords):', `"${restWords}"`);
    
    if (!firstWord) {
      return [];
    }
    
    // Försök olika case-varianter för första ordet (märke)
    const searchVariants = [
      firstWord,
      firstWord.charAt(0).toUpperCase() + firstWord.slice(1).toLowerCase(),
      firstWord.toUpperCase(),
      firstWord.toLowerCase()
    ];
    
    let allResults: SkatteverketCar[] = [];
    
    // Försök söka på märke med olika case-varianter
    // Hämta ALLA bilar för märket (ingen limit!)
    for (const variant of searchVariants) {
      const url = `${API_BASE_URL}?marke=${encodeURIComponent(variant)}&_limit=10000`;
      
      try {
        const response = await fetch(url, {
          headers: { 'Accept': 'application/json' }
        });
        
        if (response.ok) {
          const data = await response.json();
          if (data.results && Array.isArray(data.results) && data.results.length > 0) {
            console.log(`✅ Found ${data.results.length} cars for märke: ${variant}`);
            const mapped = data.results
              .map((item: any) => mapCarData(item))
              .filter((car: SkatteverketCar | null): car is SkatteverketCar => car !== null);
            allResults = [...allResults, ...mapped];
            break; // Hittade resultat, sluta söka varianter
          }
        }
      } catch (err) {
        console.warn(`Failed variant ${variant}:`, err);
      }
    }
    
    // Om vi har fler ord (t.ex. "Model 3" eller "XC90"), filtrera på modell också
    if (restWords && restWords.length > 0 && allResults.length > 0) {
      console.log(`🔍 Filtering ${allResults.length} cars for modell containing: "${restWords}"`);
      
      // Normalisera söksträngen - ta bort mellanslag för flexibel matchning
      // "XC90" ska matcha "XC 90", "XC90", "XC-90" etc.
      const normalizedSearch = restWords.replace(/[\s\-]/g, '').toLowerCase();
      console.log(`  - Normalized search: "${normalizedSearch}"`);
      
      // Logga några exempel på modeller som finns
      const sampleModels = allResults.slice(0, 5).map(c => c.modell);
      console.log(`  - Sample models in results:`, sampleModels);
      
      const filteredResults = allResults.filter(car => {
        const modellLower = car.modell.toLowerCase();
        const normalizedModell = modellLower.replace(/[\s\-]/g, '');
        
        // Matcha om normaliserade versioner innehåller varandra
        const match = normalizedModell.includes(normalizedSearch) || 
                      normalizedSearch.includes(normalizedModell) ||
                      modellLower.includes(restWords);
        return match;
      });
      
      console.log(`✅ After modell filter: ${filteredResults.length} cars`);
      
      // Om filtrering gav 0 resultat, visa vad som fanns
      if (filteredResults.length === 0 && allResults.length > 0) {
        console.log('⚠️ No matches found. Available models:', 
          [...new Set(allResults.map(c => c.modell))].slice(0, 10));
      }
      
      allResults = filteredResults;
    }
    
    // Om ingen träff ännu, försök bred sökning (både märke och modell)
    if (allResults.length === 0) {
      console.log('No exact match, trying broader search...');
      const url = `${API_BASE_URL}?_limit=5000`;
      
      const response = await fetch(url, {
        headers: { 'Accept': 'application/json' }
      });
      
      if (!response.ok) {
        console.error('API error:', response.status);
        return [];
      }
      
      const data = await response.json();
      
      if (data.results && Array.isArray(data.results)) {
        // Normalisera söksträng
        const queryLower = searchQuery.toLowerCase();
        const queryNormalized = searchQuery.replace(/[\s\-]/g, '').toLowerCase();
        
        allResults = data.results
          .filter((item: any) => {
            const marke = (item.marke || '').toLowerCase();
            const modell = (item.modell || '').toLowerCase();
            const combined = `${marke} ${modell}`;
            const combinedNormalized = combined.replace(/[\s\-]/g, '');
            
            // Matcha på både vanlig och normaliserad version
            return combined.includes(queryLower) || 
                   combinedNormalized.includes(queryNormalized);
          })
          .map((item: any) => mapCarData(item))
          .filter((car: SkatteverketCar | null): car is SkatteverketCar => car !== null);
        
        console.log(`✅ Broad search found: ${allResults.length} cars`);
      }
    }
    
    // Ta bort duplicat baserat på kod
    const unique = allResults.filter((car, index, self) => 
      index === self.findIndex(c => c.kod === car.kod)
    );
    
    // Sortera efter senaste årsmodell först
    const sorted = unique.sort((a, b) => {
      const yearA = parseInt(a.tillverkningsar) || 0;
      const yearB = parseInt(b.tillverkningsar) || 0;
      return yearB - yearA; // Nyaste först
    });
    
    console.log(`✅ Final result: ${sorted.length} unique cars (showing top 20, sorted by year)`);
    if (sorted.length > 0) {
      console.log(`📅 Newest: ${sorted[0].tillverkningsar}, Oldest: ${sorted[sorted.length - 1].tillverkningsar}`);
    }
    
    return sorted.slice(0, 20); // Max 20 resultat, men senaste först!
    
  } catch (error) {
    console.error('❌ Error fetching from Skatteverket:', error);
    return [];
  }
}

/**
 * Mappar API-data till vårt format
 * Skatteverkets API använder svenska fältnamn
 */
function mapCarData(item: any): SkatteverketCar | null {
  try {
    const marke = item.marke || item.märke || '';
    const modell = item.modell || '';
    const nybilspris = parseFloat(item.nybilspris || item['nybils pris'] || 0);
    const vardeefterschablon = parseFloat(item.vardeefterschablon || item['värde efter schablon'] || 0);
    const bransletyp = item.bransletyp || item.bränsletyp || '';
    const tillverkningsar = item.tillverkningsar || item.tillverkningsår || item.tillverkning_ar || '';
    const fordonstyp = item.fordonstyp || item.fordon_typ || 'Personbil';
    const kod = item.kod || '';
    const justering = item.justering || '';
    
    // Försök hämta fordonsskatt från API (olika möjliga fältnamn)
    const fordonsskatt = parseFloat(
      item.fordonsskatt || 
      item.fordons_skatt || 
      item.fordonskatt ||
      item.skatt ||
      item.vehicletax ||
      0
    );

    if (!marke && !modell) {
      return null;
    }

    // Skapa en unik beskrivning
    const beskrivning = `${marke} ${modell}`.trim();
    
    return {
      id: item.id || kod || `${marke}-${modell}-${tillverkningsar}`,
      fordonstyp,
      kod,
      tillverkningsar,
      marke,
      modell,
      beskrivning,
      bransletyp,
      nybilspris: Math.round(nybilspris),
      vardeefterschablon: Math.round(vardeefterschablon),
      justering,
      fordonsskatt: fordonsskatt > 0 ? Math.round(fordonsskatt) : undefined
    };
  } catch (error) {
    console.error('Error mapping car data:', error, item);
    return null;
  }
}

/**
 * Hämtar en specifik bil baserat på ID
 */
export async function getCarById(id: string): Promise<SkatteverketCar | null> {
  try {
    const url = `${API_BASE_URL}/json/${id}`;
    
    const response = await fetch(url, {
      headers: {
        'Accept': 'application/json'
      }
    });

    if (!response.ok) {
      return null;
    }

    const data = await response.json();
    return mapCarData(data);
  } catch (error) {
    console.error('Error fetching car by ID:', error);
    return null;
  }
}

/**
 * Beräknar månadsleasing baserat på inköpspris, ränta, period och restvärde
 * Använder leasingformel med restvärde (ballongbetalning)
 */
export function calculateMonthlyLeasing(
  purchasePrice: number,
  interestRate: number, // Årlig ränta i procent (t.ex. 5)
  months: number, // Leasingperiod i månader
  residualValuePercent: number = 0.50 // Restvärde i procent (default 50%)
): number {
  if (purchasePrice <= 0 || months <= 0) {
    return 0;
  }

  // Beräkna restvärde
  const residualValue = purchasePrice * residualValuePercent;
  
  // Månadsränta (årlig ränta / 12 / 100)
  const monthlyRate = (interestRate / 12) / 100;

  if (monthlyRate === 0) {
    // Om ingen ränta, dela bara värdeminskningen på antal månader
    return (purchasePrice - residualValue) / months;
  }

  // Leasingformel med restvärde:
  // Månadskostnad = [(Inköpspris - Nuvärde av restvärde) × r × (1+r)^n] / [(1+r)^n - 1]
  // Där nuvärde av restvärde = Restvärde / (1+r)^n
  
  const presentValueOfResidual = residualValue / Math.pow(1 + monthlyRate, months);
  const amountToFinance = purchasePrice - presentValueOfResidual;
  
  const payment = amountToFinance * 
    (monthlyRate * Math.pow(1 + monthlyRate, months)) / 
    (Math.pow(1 + monthlyRate, months) - 1);

  console.log('💰 Leasingberäkning:');
  console.log('  - Inköpspris:', purchasePrice.toLocaleString('sv-SE'), 'kr');
  console.log('  - Restvärde:', residualValue.toLocaleString('sv-SE'), 'kr', `(${(residualValuePercent * 100).toFixed(0)}%)`);
  console.log('  - Värdeminskning:', (purchasePrice - residualValue).toLocaleString('sv-SE'), 'kr');
  console.log('  - Månadskostnad:', Math.round(payment).toLocaleString('sv-SE'), 'kr/mån');
  console.log('  - Årskostnad:', Math.round(payment * 12).toLocaleString('sv-SE'), 'kr/år');

  return payment;
}

/**
 * Beräknar total årlig leasingkostnad med restvärde
 */
export function calculateAnnualLeasing(
  purchasePrice: number,
  interestRate: number,
  months: number,
  residualValuePercent: number = 0.50 // Restvärde i procent (default 50%)
): number {
  const monthlyPayment = calculateMonthlyLeasing(purchasePrice, interestRate, months, residualValuePercent);
  return monthlyPayment * 12;
}

