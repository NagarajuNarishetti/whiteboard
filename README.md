This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Tech Stack

We use a mix of frontend, backend, runtime, and tooling technologies beyond what GitHub Linguist infers from file extensions:

- **Framework**: Next.js (App Router)
- **Language**: TypeScript + modern JavaScript (ES2020+)
- **Realtime**: Socket.IO (server and client)
- **UI / Styling**: Tailwind CSS v4 (via `@tailwindcss/postcss`), CSS Variables
- **Fonts**: `next/font` with Geist/Geist Mono
- **Runtime**: Node.js HTTP server combining Next.js and Socket.IO (`server.js`)
- **Build/Deploy**: Vercel (custom Node build) and Render (YAML config)
- **Linting**: ESLint (Next.js config)
- **Tooling**: PostCSS

Badges

![Next.js](https://img.shields.io/badge/Next.js-000?logo=nextdotjs&logoColor=fff)
![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?logo=typescript&logoColor=fff)
![Socket.IO](https://img.shields.io/badge/Socket.IO-010101?logo=socketdotio&logoColor=fff)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-38B2AC?logo=tailwindcss&logoColor=fff)
![PostCSS](https://img.shields.io/badge/PostCSS-DD3A0A?logo=postcss&logoColor=fff)
![ESLint](https://img.shields.io/badge/ESLint-4B32C3?logo=eslint&logoColor=fff)
![Vercel](https://img.shields.io/badge/Vercel-000000?logo=vercel&logoColor=fff)
![Render](https://img.shields.io/badge/Render-46E3B7?logo=render&logoColor=000)

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
