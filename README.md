# 🚗 B3 Förmånsbilskalkylator

En modern webbapplikation för att jämföra och analysera förmånsbilar enligt svenska skatteregler 2025. Utvecklad för B3 Consulting Group.

![B3 Branding](https://img.shields.io/badge/B3-Creating%20possibilities%20together-00CCCC)

## ✨ Funktioner

### 📊 Beräkningar
- **Förmånsvärde** - Automatisk beräkning enligt Skatteverkets regler 2025
- **RAM-kostnad** - Total kostnad från företagets perspektiv (löneväxling)
- **Nettolön istället** - Visar vad du kunde fått i netto om pengarna betalats ut som lön
- **Kostnad per mil** - Baserat på din personliga körsträcka och marginalskatt

### 🔍 Bilsökning (3-stegs)
1. **Välj tillverkningsår** - Dropdown med senaste 10 åren
2. **Välj bilmärke** - 52 märken (Volvo, Tesla, BMW, Mercedes, etc.)
3. **Välj modell** - Hämtas automatiskt från Skatteverkets API

### ⚙️ Personliga inställningar
- **Bruttolön** - Bestämmer din marginalskatt (32-57%)
- **Årlig körsträcka** - Påverkar kostnad per mil
- Inställningar sparas lokalt i webbläsaren

### 📋 Funktioner
- Jämför flera bilar sida vid sida
- Sortera tabellen på valfri kolumn
- Tooltips med förklaringar för varje beräkning
- Stöd för elbilar och laddhybrider (miljöreduktion)
- Spara bilar till Supabase-databas

## 🛠️ Teknologi

| Teknologi | Användning |
|-----------|------------|
| React 18 | Frontend-ramverk |
| TypeScript | Typsäkerhet |
| Vite | Build-verktyg |
| Tailwind CSS | Styling (B3 theme) |
| Supabase | Databas & Backend |
| Lucide React | Ikoner |

## 📦 Installation

### 1. Klona och installera
```bash
git clone <repo-url>
cd CompanyCarCalc
npm install
```

### 2. Konfigurera Supabase
Skapa ett projekt på [Supabase](https://supabase.com) och uppdatera `src/lib/supabase.ts`:

```typescript
const SUPABASE_URL = 'https://YOUR_PROJECT.supabase.co'
const SUPABASE_ANON_KEY = 'YOUR_ANON_KEY'
```

### 3. Skapa databastabellen
Kör följande SQL i Supabase SQL Editor:

```sql
CREATE TABLE cars (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  model TEXT NOT NULL,
  purchase_price NUMERIC NOT NULL,
  benefit_value NUMERIC NOT NULL,
  is_electric BOOLEAN DEFAULT FALSE,
  is_plugin_hybrid BOOLEAN DEFAULT FALSE,
  annual_km INTEGER DEFAULT 15000,
  is_leasing BOOLEAN DEFAULT TRUE,
  interest_rate NUMERIC DEFAULT 5.0,
  leasing_period INTEGER DEFAULT 36,
  annual_leasing_cost NUMERIC,
  service_miles INTEGER DEFAULT 500,
  insurance_included_in_leasing BOOLEAN DEFAULT FALSE,
  maintenance_included_in_leasing BOOLEAN DEFAULT FALSE,
  registered_after_july_2022 BOOLEAN DEFAULT TRUE,
  vehicle_tax NUMERIC DEFAULT 5292,
  extra_equipment NUMERIC DEFAULT 0,
  electric_range NUMERIC,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Enable Row Level Security
ALTER TABLE cars ENABLE ROW LEVEL SECURITY;

-- Allow all operations (anpassa efter behov)
CREATE POLICY "Allow all operations" ON cars
  FOR ALL USING (true) WITH CHECK (true);
```

### 4. Starta utvecklingsservern
```bash
npm run dev
```

### 5. Bygg för produktion
```bash
npm run build
python serve.py  # Starta produktionsserver på port 8000
```

## 📐 Beräkningsformler

### Förmånsvärde (2025)
```
Förmånsvärde = Grundbelopp + Prisandel + Räntedel + Skatt/Kostnader - Reduktioner

Där:
- Grundbelopp = 0,29 × 0,625 × prisbasbelopp (58 800 kr) = 10 710 kr
- Prisandel = 9% × (nybilspris + extrautrustning)
- Räntedel = 1,96% × (nybilspris + extrautrustning)
- Skatt = Faktisk fordonsskatt (bilar efter 1 juli 2022)
- Reduktioner:
  - Elbilar: -10 000 kr/år (max 50% av förmånsvärdet)
  - Tjänstekörning ≥3000 mil: -25% på grundbeloppet
```

### Nettolön istället (Löneväxling)
```
Arbetsgivarens kostnad = Leasingkostnad + (Förmånsvärde × 31,42%)
Bruttolön = Arbetsgivarens kostnad / 1,3142
Nettolön = Bruttolön × (1 - marginalskatt)
```

### Leasingkostnad (Annuitetsmetod med restvärde)
```
Restvärde = Inköpspris × Restvärdes-% (45-55%)
Månadskostnad = [(Pris - Nuvärde av restvärde) × r × (1+r)^n] / [(1+r)^n - 1]

Vid ≥100 tjänstemil/år: Halva momsen lyfts (10% rabatt på leasing)
```

## 🎨 B3 Designsystem

Applikationen följer B3:s brandbook med:
- **Primärfärg**: Turquoise (#0CCCCC)
- **Accentfärg**: Pink (#DF668A)
- **Typsnitt**: Work Sans
- **Rundade hörn**: 24px (rounded-3xl)

## 📁 Projektstruktur

```
src/
├── components/
│   ├── CarModal.tsx       # Modal för att lägga till/redigera bil
│   ├── CarTable.tsx       # Tabell med sorterbara kolumner
│   ├── GlobalSettings.tsx # Personliga inställningar
│   └── AutocompleteSearch.tsx # Bilsökning (legacy)
├── lib/
│   ├── calculations.ts    # Alla beräkningar
│   ├── carSearchApi.ts    # Skatteverket API-integration
│   ├── skatteverketApi.ts # Leasingberäkningar
│   └── supabase.ts        # Databasklient
├── styles/
│   └── b3-theme.ts        # B3 färgpalett
└── App.tsx                # Huvudkomponent
```

## 🔗 API:er

### Skatteverket RowStore API
- **Endpoint**: `https://skatteverket.entryscape.net/rowstore/dataset/fad86bf9-67e3-4d68-829c-7b9a23bc5e42`
- **Parametrar**: `marke`, `tillverkningsar`, `_limit`, `_offset`
- **Data**: Nybilspriser, förmånsvärden, bränsletyp m.m.

## 📝 Användning

1. **Ställ in personliga inställningar** (bruttolön, körsträcka)
2. **Lägg till bil**:
   - Välj tillverkningsår → Välj märke → Välj modell
   - Eller ange biluppgifter manuellt
3. **Justera parametrar** (leasing, restvärde, tjänstemil)
4. **Jämför** - Sortera tabellen för att hitta bästa valet
5. **Spara** - Bilarna sparas automatiskt till databasen

## 🧮 Marginalskatt

| Årsinkomst | Marginalskatt |
|------------|---------------|
| < 614 000 kr | 32% (kommunalskatt) |
| 614 000 - 919 000 kr | 52% (+ statlig skatt) |
| > 919 000 kr | 57% (högsta) |

## 📄 Licens

© 2025 B3 Consulting Group. Alla rättigheter förbehållna.

---

**Skapad av**: B3 Tech Team  
**Kontakt**: [b3.se](https://www.b3.se)
