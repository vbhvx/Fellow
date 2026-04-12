# Fellow

Fellow is a multi-organization collaboration platform with organizations, projects, memberships and invitations, tasks/statuses, comments, activity, search, notifications, a realtime event stream, and OpenAPI output.

## Architecture and setup

This Next.js 14/React 18 application uses PostgreSQL and Drizzle ORM with server routes in `src/app/api/v1`, database code in `src/db`, and a separate outbox worker in `workers/outbox`. It uses Zod, bcrypt, JWT utilities, Tailwind CSS, and Vitest/Playwright.

```bash
cd 7_Fellow
npm install
cp .env.example .env
npm run db:generate
npm run db:migrate
npm run db:seed
npm run dev
```

Set development/test PostgreSQL URLs and a random 32+ character `JWT_SECRET`.

```bash
npm test
npm run test:security
npm run test:concurrency
npm run test:e2e
npm run worker:outbox
npm run build
```
