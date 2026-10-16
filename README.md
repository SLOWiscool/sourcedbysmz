# Sourcedbysmz

Curated sourced clothing and finds. Independent resale shop built with React, TypeScript, and Vite.

## Quick start

```bash
npm install
npm run dev
```

Open http://localhost:5173

## Scripts

- `npm run dev` — start dev server
- `npm run build` — production build
- `npm run preview` — preview production build
- `npm run test` — run unit tests
- `npm run typecheck` — type check
- `npm run lint` — lint

## Project structure

- `src/components/` — reusable UI components (layout, product, cart)
- `src/context/` — cart state management
- `src/data/` — sample product catalogue
- `src/lib/` — utility functions (currency, validation)
- `src/pages/` — page components for each route
- `src/styles/` — design tokens and global styles
- `src/tests/` — unit tests
- `src/types/` — TypeScript type definitions

## Routes

- `/` — homepage
- `/shop` — all products with filters, sorting, search
- `/collections/:slug` — curated collections (featured, outerwear, tops, bottoms, etc.)
- `/products/:slug` — product detail
- `/cart` — basket page
- `/checkout` — checkout form (demo mode)
- `/shipping`, `/returns`, `/privacy`, `/terms`, `/contact` — info pages

## Demo mode

This build runs in demo mode. Checkout is simulated — no real payment is processed. The UI clearly labels this at the checkout step.

## Configuration

Copy `.env.example` to `.env` and update values:

```
VITE_BRAND_NAME=SOURCEDBYSMZ
VITE_CURRENCY=GBP
VITE_LOCALE=en-GB
```

## Tech stack

- Vite 6
- React 18
- TypeScript 5
- React Router 6
- Vitest 2
- Lucide React (icons)
- Custom CSS with design tokens

## Owner checklist before launch

- [ ] Replace sample products with real inventory
- [ ] Add real product photography
- [ ] Set up payment provider account (Stripe or similar)
- [ ] Configure backend for real checkout sessions
- [ ] Add real contact email and social links
- [ ] Review and approve all policy pages
- [ ] Set up hosting (Vercel, Netlify, or similar)
- [ ] Test real payment flow in sandbox mode
- [ ] Set up transactional emails
- [ ] Add analytics (optional, privacy-conscious)
# sourcedbysmz
