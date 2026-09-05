# 🚗 B3 Förmånsbilskalkylator

Webbapplikation för att jämföra förmånsbilar enligt svenska skatteregler 2026 och B3:s RAM-policy (B16, C11).

![B3 Branding](https://img.shields.io/badge/B3-Creating%20possibilities%20together-00CCCC)

## ✨ Funktioner

- **Förmånsvärde** enligt Skatteverkets regler 2026 (inkl. schablonnedsättning för el- och laddhybridbilar samt nedsättning vid ≥ 3 000 tjänstemil)
- **RAM-kostnad** – vad bilen belastar ramen med (leasing, försäkring, underhåll, skatt, arbetsgivaravgifter)
- **Nettolön istället** – vad pengarna hade gett i netto som lön (löneväxling)
- **Kostnad per mil** baserat på egen körsträcka och marginalskatt
- **Bilsökning i tre steg** (år → märke → modell) mot Skatteverkets öppna data
- Jämför flera bilar, sortera på valfri kolumn, tooltips på varje beräkning
- Bilar sparas i webbläsaren, eller i Supabase efter inloggning med magic link

## 🛠️ Teknik

React 18, TypeScript, Vite, Tailwind CSS, Supabase, Lucide-ikoner.

## 📦 Kom igång

```bash
npm install
npm run dev      # utvecklingsserver
npm test         # beräkningstester (kräver Node >= 22.6)
npm run build    # produktionsbygge till dist/
```

Deploy sker automatiskt till GitHub Pages vid push till `main` (`.github/workflows/deploy-pages.yml`). Vite `base` är satt till `/carcompanycalc/`.

### Supabase

1. Skapa ett projekt på [supabase.com](https://supabase.com) och aktivera e-postinloggning (magic link).
2. Kör `supabase-schema.sql` i SQL Editor. Skriptet är idempotent och sätter upp tabellen `cars` med Row Level Security så att varje användare bara ser sina egna bilar.
3. Uppdatera URL och anon-nyckel i `src/lib/supabase.ts`.

## 📐 Beräkningar (2026)

Källa: [Skatteverket, belopp och procent 2026](https://www.skatteverket.se/privat/skatter/beloppochprocent/2026.4.1522bf3f19aea8075ba21.html). Prisbasbelopp 59 200 kr, statslåneränta 2,55 %.

```
Förmånsgrundande pris = nybilspris + extrautrustning – schablonnedsättning
Schablonnedsättning   = 350 000 kr (elbil) eller 140 000 kr (laddhybrid), dock högst 50 % av priset.
                        Gäller bilar som tagits i trafik 1 juli 2022 eller senare.

Förmånsvärde      = Prisbasbeloppsdel + Räntedel + Prisdel + Fordonsskatt
Prisbasbeloppsdel = 0,29 × 59 200 = 17 168 kr
Räntedel          = (70 % × SLR + 1 %) = 2,785 % × förmånsgrundande pris
Prisdel           = 13 % × förmånsgrundande pris
Fordonsskatt      = bilens fordonsskatt enligt vägtrafikskattelagen

Vid ≥ 3 000 tjänstemil/år sätts värdet ned till 75 %. Delbelopp avrundas nedåt till hela kronor,
vilket ger samma resultat som Skatteverkets egen beräkning.
```

```
RAM-kostnad = Leasing (90 % vid ≥ 100 tjänstemil, halva momsen lyfts)
            + Försäkring 1,5 % + Underhåll 0,5 % + Fordonsskatt
            + 31,42 % arbetsgivaravgift på förmånsvärdet
Drivmedel belastar inte ramen (C11).
```

```
Nettolön istället = (Leasing + Förmånsvärde × 31,42 %) / 1,3142 × (1 – marginalskatt)
Kostnad per mil   = (Nettolön istället + Förmånsvärde × marginalskatt) / mil per år
```

```
Leasing (annuitet med restvärde 45–55 %)
Månadskostnad = [(Pris – Nuvärde av restvärde) × r × (1+r)^n] / [(1+r)^n – 1]
```

Alla formler finns i `src/lib/calculations.ts` med tester i `calculations.test.ts`.

## 🧮 Marginalskatt

| Årsinkomst | Marginalskatt |
|------------|---------------|
| < 614 000 kr | 32 % |
| 614 000 – 919 000 kr | 52 % |
| > 919 000 kr | 57 % |

## 📁 Struktur

```
src/
├── components/
│   ├── ui/
│   │   ├── Dialog.tsx      # Nativ <dialog> som modal + ConfirmDialog
│   │   ├── Field.tsx       # Field, TextInput (med enhet), Select
│   │   └── Tooltip.tsx     # Tooltip vid hover/fokus, positioneras i portal
│   ├── AuthSection.tsx     # Lagringsstatus och magic link-inloggning
│   ├── CarModal.tsx        # Lägg till / redigera bil, bilsökning
│   ├── CarTable.tsx        # Jämförelsetabell med kvitto-tooltips, kortvy på mobil
│   └── GlobalSettings.tsx  # Bruttolön, körsträcka och marginalskatt
├── lib/
│   ├── calculations.ts     # Alla beräkningar (förmånsvärde, RAM, leasing)
│   ├── calculations.test.ts
│   ├── carSearchApi.ts     # Skatteverkets RowStore-API
│   ├── format.ts           # Svensk talformatering
│   ├── storage.ts          # localStorage / Supabase-lagring
│   ├── auth.ts
│   └── supabase.ts
├── index.css               # Designtokens (B3-palett), komponentstilar
└── App.tsx
```

## 📄 Licens

© 2026 B3 Consulting Group. Alla rättigheter förbehållna.
