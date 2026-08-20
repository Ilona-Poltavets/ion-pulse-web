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

## Production deployment

Build the SPA without `VITE_API_URL`; the production bundle then uses the current origin and
expects the API beneath `/api/v1`. This keeps the browser session same-origin and avoids a
separate CORS deployment path.

```bash
npm ci
npm run build
```

`deploy/ion-pulse.conf` is an Nginx template that serves `dist/`, forwards `/api/` to the API
service on `127.0.0.1:8000`, forwards the API-generated `/sitemap.xml` and `/robots.txt`, and
preserves Vue history routes. Replace `example.com`, the TLS certificate paths, and
`/srv/ion-pulse-web/dist` before installing it. Configure the API's
`ION_PULSE_CORS_ORIGINS` with the public HTTPS origin even when same-origin deployment is used,
so any future cross-origin tooling remains explicitly controlled.

For distributed abuse protection, install `deploy/ion-pulse-rate-limits.conf` in Nginx's `http`
context (for example, `/etc/nginx/conf.d/`) before enabling the server template. It limits auth
requests by client IP to 6/minute and comment/report paths to 30/minute; the API applies its
member-aware limits as a second layer. Validate the combined configuration before reload:

```bash
sudo nginx -t
sudo systemctl reload nginx
```

## Checks

```bash
npm run lint
npm run format:check
npm run type-check
npm run test:unit
npm run build
```
