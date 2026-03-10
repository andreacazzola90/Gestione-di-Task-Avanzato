# Gestione Task (versione mia)

Questo progetto e una app fatta con Next.js per gestire task in modo un po piu avanzato.

## come avviare

serve node installato ovviamente.

```bash
npm install
npm run dev
```

poi apri il browser su:
http://localhost:3000

## test

per lanciare i test:

```bash
npm test
```

se vuoi modalita watch:

```bash
npm run test:watch
```

## mock API con msw

ho messo msw per mockare la rotta `/api/tasks` nei test, cosi non serve backend vero per provare.

file principali:
- `src/mocks/handlers.ts` (qui ci sono le risposte fake)
- `src/mocks/server.ts` (server msw lato test/jest)
- `src/mocks/browser.ts` (worker browser, opzionale)
- `jest.setup.ts` (attiva msw prima dei test e resetta dopo ogni test)

endpoint mockati al momento:
- GET /api/tasks
- POST /api/tasks
- PATCH /api/tasks/:id
- DELETE /api/tasks/:id

nota: i task mock stanno in memoria e si resettano ad ogni test quindi non si sporcano tra loro.

## appunti veloci

- stack: Next.js + TypeScript
- test: Jest + Testing Library + MSW

