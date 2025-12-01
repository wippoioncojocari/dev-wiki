This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

## Backend (Prisma + SQLite)

- Local DB is SQLite at `prisma/dev.db` (see `.env` for `DATABASE_URL`).
- Generate client: `npm run prisma:generate`
- Create/update schema: `npm run prisma:db:push` (or `npm run prisma:migrate` to create a named migration)
- Seed from `app/wiki-data.json`: `npm run prisma:seed`
- Endpoints:
  - `GET /api/wiki` – returns the full tree as `WikiData`
  - `GET /api/sections` – returns only sections
  - `POST /api/sections` – create section (`{ id, title, summary?, parentId?, position?, content? }`)
  - `GET /api/sections/:id` – fetch a section tree node
  - `PATCH /api/sections/:id` – update metadata/parent/content; rejects content on non-leaves
  - `DELETE /api/sections/:id` – deletes a section and its subtree

### Using Vercel Postgres
- Update `prisma/schema.prisma` to `provider = "postgresql"` (already set) and use env vars `DATABASE_URL` and `SHADOW_DATABASE_URL`.
- Set those env vars in Vercel project settings (and locally in `.env.local`); do not commit credentials.
- Generate client and push/migrate:
  - `npx prisma generate`
  - `npx prisma migrate dev --name init-postgres` (locally to create migration files)
  - In CI/Deploy: `npx prisma migrate deploy`
- Seed (optional) into Postgres: `npm run prisma:seed` (uses current `DATABASE_URL`).
