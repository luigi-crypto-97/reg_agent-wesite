# Meridiano — Sito v2 (Astro 4 + React)

Riscrittura editoriale del portale informativo e commerciale per il company setup in Florida.
**Non è uno studio legale.**

## Stack

| Layer | Tech |
|---|---|
| Framework | **Astro 4** (output statico, SEO-first, zero JS di default) |
| UI islands | **React 18** (solo per componenti interattivi) |
| Styling | **Tailwind CSS 3** + design system custom su CSS variables |
| Animazioni | **Framer Motion** (FAQ, cookie banner, form) + IntersectionObserver per scroll reveal |
| Tipografia | **Fraunces Variable** (display serif) + **Inter Variable** — via `@fontsource-variable` (self-hosted, no Google Fonts CDN) |
| Icone | **lucide-react** |
| Content | **Astro Content Collections** con frontmatter type-safe (Zod) |
| Dark mode | Class strategy + bootstrap inline pre-render (zero FOUC) |
| Transizioni pagina | View Transitions API native di Astro |
| Sitemap | `@astrojs/sitemap` (auto-gen) |

## Design system

Direzione: **editorial elegante**. Whitespace generoso, serif variable per i display (`Fraunces` con OpenType `SOFT`/`WONK`), tipografia di testo neutra (Inter), palette quasi monocromatica:

| Token | Light | Dark |
|---|---|---|
| Background | `#fffdfa` (off-white caldo) | `#0c0e14` (near-black) |
| Surface | `#faf7f1` (avorio) | `#121620` |
| Ink primary | `#0f172a` | `#f8fafc` |
| Accent | `#a85a2d` (terra/ruggine) | `#dc915a` (amber caldo) |
| Line | `#e2dcd1` | `#262c3a` |

Tutti i token sono in `src/styles/global.css` come variabili CSS `rgb()` integrate con Tailwind via `tailwind.config.mjs`.

Micro-pattern editoriali:
- `chapter-num` per i numerali in stile rivista (`— 01`)
- `display` con kerning ottico (`opsz` variable axis)
- `dropcap` capolettera serif sui post del blog
- `paper-noise` overlay SVG sottilissimo per dare consistenza al light mode
- `mesh-accent` gradient mesh delicato dietro gli hero
- `link-underline` underline animato che cresce in hover

## Struttura

```
site-v2/
├── astro.config.mjs
├── tailwind.config.mjs
├── tsconfig.json
├── package.json
├── public/
│   ├── favicon.svg
│   ├── og-default.svg
│   └── robots.txt
└── src/
    ├── styles/global.css              # design system + Tailwind layers
    ├── content/
    │   ├── config.ts                  # Zod schema per il blog
    │   └── blog/                      # articoli .md (3 di esempio)
    ├── layouts/Layout.astro           # SEO, viewport, theme bootstrap, View Transitions
    ├── components/
    │   ├── Header.astro               # nav + dropdown + mobile menu
    │   ├── Footer.astro               # footer + disclaimer banner
    │   ├── Hero.astro                 # hero della home
    │   ├── ArticleCard.astro
    │   ├── Reveal.astro               # scroll-trigger wrapper (no JS pesante)
    │   ├── FAQ.tsx                    # accordion accessibile con Framer Motion
    │   ├── LeadForm.tsx               # form con stato locale + success state
    │   ├── ThemeToggle.tsx            # dark/light + system pref
    │   └── CookieBanner.tsx           # banner con persistenza localStorage
    └── pages/
        ├── index.astro
        ├── come-funziona.astro
        ├── registered-agent.astro
        ├── faq.astro
        ├── contatti.astro
        ├── grazie.astro                # noindex
        ├── 404.astro                   # noindex
        ├── disclaimer.astro
        ├── privacy-policy.astro
        ├── terms-of-use.astro
        ├── cookie-policy.astro
        ├── company-setup-florida/
        │   ├── index.astro
        │   ├── llc.astro
        │   ├── corporation.astro
        │   └── pacchetti.astro
        └── business-in-florida/
            ├── index.astro             # hub con filtri categoria
            └── [...slug].astro         # post template dinamico
```

## Installazione locale

Richiede **Node 18+** (consigliato 20 LTS).
Il repository include `.nvmrc` con Node 20.

```bash
cd site-v2
npm install
npm start            # backend + sito statico: http://localhost:4321
npm run dev          # solo Astro dev server, se servono le sorgenti Astro
```

## Backend locale

Il backend reale per la demo è in `server.js` e non richiede dipendenze extra.

```bash
npm start
```

Funzioni incluse:

- serve tutte le pagine statiche;
- protegge `corrispondenza-cliente.html` lato server;
- protegge `admin.html` lato server e lo limita al ruolo admin;
- espone `POST /api/login`, `POST /api/logout`, `GET /api/session`, `GET /api/mail`, API admin, download CSV/PDF e ticket supporto;
- gestisce sessione con cookie HTTP-only;
- mantiene `login.html`, `admin.html` e `corrispondenza-cliente.html` `noindex,nofollow` e fuori dalla sitemap.

Credenziali demo:

```text
Console admin:
username: admin
password: admin

Area cliente:
username: cliente
password: cliente
```

Separazione ruoli:

- `admin/admin` vede tutta la posta, inclusi documenti non assegnati, documenti di tutti i clienti e casi in standby.
- `cliente/cliente` vede solo i documenti pubblicati associati a Italia Group LLC.
- L'admin può assegnare un documento a un cliente, lasciarlo in revisione oppure pubblicarlo.

In locale puoi cambiarle senza toccare il codice:

```bash
ADMIN_USER=admin ADMIN_PASSWORD='una-password-lunga' npm start
```

Quando sarà disponibile il dominio definitivo, aggiornare `https://example.com` in canonical, sitemap, robots, Open Graph e `astro.config.mjs`.

Per l'architettura di sicurezza necessaria prima di trattare corrispondenza reale, vedere `SECURITY.md`.

Build di produzione:

```bash
npm run build        # output statico in dist/
npm run preview      # serve dist/ in locale per verificarlo
```

## Audit tecnico corrente

- `npm run build` fallisce se l'ambiente usa Node `18.13.0`: Astro richiede almeno `18.14.1`. Usare Node 20 LTS.
- Gli HTML pubblici in root sono la fonte effettivamente servita; `src/pages` non è presente, quindi le ottimizzazioni SEO sono applicate agli HTML statici.
- `npm audit` segnala vulnerabilità su Astro/Vite/esbuild. Il fix completo richiede upgrade breaking ad Astro 6 e va pianificato come intervento separato dopo il riallineamento delle sorgenti.
- `https://example.com` è il dominio canonico provvisorio usato per canonical, Open Graph, robots e sitemap. Sostituirlo con il dominio reale prima del go-live.

## Dati da completare prima del go-live

Il brand è impostato su Meridiano. Restano da completare i dati reali di pubblicazione:

| Dato | Note |
|---|---|
| Dominio reale | Aggiornare `astro.config.mjs`, canonical, sitemap, robots e Open Graph. |
| Partner Florida | Nome partner USA e accordi di trattamento dati. |
| Dati societari | Ragione sociale, indirizzo registrato, sede e dati fiscali. |
| Recapiti | Email aziendale, email privacy, telefono e indirizzo italiano, se presente. |
| Listino | Prezzi, valuta e condizioni dei pacchetti. |
| Policy | Date di efficacia, rappresentante UE e testi revisionati legalmente. |

Grep di controllo:

```bash
rg "\.example|href=\"#\"|\[.+\]" *.html src public astro.config.mjs
```

## Form contatti

`LeadForm.tsx` ora è in modalità demo (success state simulato dopo 700ms). Per la produzione collegare a:

- **Formspree / Basin / Web3Forms** — sostituire la `setTimeout` con `await fetch(endpoint, { method: 'POST', body: data })`.
- **HubSpot Forms** — embed code oppure `submitForm` via API.
- **Backend custom** — qualsiasi endpoint POST.

Il componente è già strutturato per gestire `idle | loading | success | error` con stati distinti.

## Dark mode

- Lo script `is:inline` in `Layout.astro` legge `localStorage.theme` (o `prefers-color-scheme`) **prima** del render per evitare flash.
- `ThemeToggle.tsx` aggiorna `localStorage` e la classe `dark` sul `<html>`.
- I cambi di sistema vengono captati via `matchMedia('change')` solo se l'utente non ha scelto manualmente.

## Deploy

### Netlify
1. Connetti il repo Git.
2. Build command: `npm run build`
3. Publish directory: `dist`
4. Aggiungi env `NODE_VERSION=20` se necessario.

### Vercel
1. `vercel --prod` dalla cartella `site-v2/`.
2. Vercel rileva Astro automaticamente.

### Cloudflare Pages
1. Framework preset: **Astro**
2. Build command: `npm run build`
3. Output directory: `dist`

### IIS / Apache / Nginx
Copia il contenuto di `dist/` nella document root. Niente runtime Node richiesto.

## Performance

L'output Astro è quasi tutto HTML statico. JS spedito al client solo per:
- `ThemeToggle` (load) — ~3 KB
- `CookieBanner` (idle) — ~5 KB con motion
- `FAQ` (visible) — caricato solo se l'utente scrolla fino a quel punto
- `LeadForm` (load, solo su `/contatti/`) — ~6 KB

Target Lighthouse: **Performance ≥ 95**, **Accessibility ≥ 95**, **SEO 100**.

## Checklist pre-go-live

- [ ] Sostituire tutti i placeholder.
- [ ] Aggiornare `site:` in `astro.config.mjs`.
- [ ] Aggiungere OG image custom (oltre a `og-default.svg`).
- [ ] Collegare il form a un endpoint reale.
- [ ] Sostituire il cookie banner placeholder con un **CMP certificato** (iubenda, Cookiebot, OneTrust) con Google Consent Mode v2.
- [ ] Inserire JSON-LD `Organization`, `Service`, `FAQPage`, `BreadcrumbList`, `Article`.
- [ ] Far rivedere i testi legali da un avvocato italiano.
- [ ] Verificare firma SCC con [PARTNER FLORIDA] per trasferimento dati extra-UE.
- [ ] Verificare separazione di brand rispetto al Codice Deontologico Forense (se il gestore è collegato a uno studio).

## Migrazione dalla v1

La v1 statica (`/site/`) può rimanere come fallback su un sottodominio o essere archiviata. Le URL della v2 differiscono leggermente:

| v1 | v2 |
|---|---|
| `/come-funziona.html` | `/come-funziona/` |
| `/business-in-florida/articolo-llc-caratteristiche.html` | `/business-in-florida/llc-caratteristiche/` |

Se hai indicizzato la v1 in produzione, configurare 301 redirect dalle URL `.html` ai trailing slash della v2 in `public/_redirects` (Netlify) o `vercel.json` (Vercel).

## Aggiungere un articolo al blog

1. Crea `src/content/blog/mio-articolo.md` con frontmatter:

```yaml
---
title: "Titolo dell'articolo"
description: "Meta description SEO."
category: "LLC"          # LLC | Corporation | Registered Agent | Documenti | Tips | News
publishedAt: 2026-06-01
readingTime: "5 min"
gradient: "linear-gradient(135deg, rgb(8 13 27), rgb(168 90 45))"
---

Corpo dell'articolo in markdown.
```

2. L'articolo apparirà automaticamente in `/business-in-florida/` e sarà accessibile a `/business-in-florida/mio-articolo/`. La sitemap si aggiorna in fase di build.
