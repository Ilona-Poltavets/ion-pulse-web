# Ion Pulse Web

Vue application for the bilingual Ion Pulse gaming media platform.

## Requirements

- Node.js 22.22+ or 24.15+
- npm 11+

## Local development

```bash
cp .env.example .env
npm install
npm run dev
```

The application is available at `http://localhost:5173` and expects the API at
`http://localhost:8000` by default.

## Checks

```bash
npm run lint
npm run format:check
npm run type-check
npm run test:unit
npm run build
```
