# Gestione di Task Avanzato

Applicazione web per la gestione di task sviluppata con Next.js e TypeScript.

## Prerequisiti

- Node.js 18+ (consigliato Node.js 20)
- npm

## Installazione dipendenze

Esegui dalla root del progetto:

```bash
npm install
```

## Avvio progetto

Avvio in modalita produzione (richiesto):

```bash
npm run build
npm start
```

L'app sara disponibile su http://localhost:3000.

Nota: per sviluppo locale puoi usare anche:

```bash
npm run dev
```

## Esecuzione test

### Unit test

Per eseguire i test:

```bash
npm test
```

### e2e test

Per eseguire i test:

```bash
npm test:e2e
```

## Note su architettura e librerie

- Framework: Next.js (App Router) con React e TypeScript.
- UI: componenti riutilizzabili (Shadcn) e styling con Tailwind CSS.
- Form: React Hook Form + Zod per validazione schema-based.
- Stato server e fetch: hook custom in src/hooks/useTasks.tsx.
- Test: Jest + Testing Library, con mocking API tramite MSW.
- API interne: route handlers Next.js in src/app/api/tasks.
