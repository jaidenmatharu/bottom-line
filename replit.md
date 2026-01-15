# Bottomline - Institutional-Grade Financial Modeling

## Overview

Bottomline is a professional financial modeling platform that automatically generates 5-year projections with DCF valuation analysis. Users input revenue assumptions, margin profiles, and capital structure parameters, then export auditable Excel models ready for investment committees.

The application follows a monorepo structure with a React frontend (client), Express backend (server), and shared TypeScript types/schemas.

## Brand

- **Name**: Bottomline
- **Tagline**: Institutional-grade financial models, built automatically
- **Tone**: Professional, confident, plain English
- **See**: BRAND.md for complete brand guidelines

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript
- **Routing**: Wouter (lightweight alternative to React Router)
- **State Management**: TanStack React Query for server state caching and synchronization
- **UI Components**: shadcn/ui component library built on Radix UI primitives
- **Styling**: Tailwind CSS with Inter font, charcoal/slate color palette
- **Charts**: Recharts for financial data visualization
- **Forms**: React Hook Form with Zod validation via @hookform/resolvers

### Backend Architecture
- **Runtime**: Node.js with Express
- **Language**: TypeScript (ESM modules)
- **API Design**: RESTful endpoints under `/api/*` prefix
- **Authentication**: Replit Auth integration using OpenID Connect (OIDC) with Passport.js
- **Session Management**: Express sessions stored in PostgreSQL via connect-pg-simple
- **Excel Export**: xlsx-js-style for professional IC-ready outputs

### Data Layer
- **Database**: PostgreSQL
- **ORM**: Drizzle ORM with drizzle-zod for schema validation
- **Schema Location**: `shared/schema.ts` contains all table definitions
- **Migrations**: Drizzle Kit with `db:push` command for schema synchronization

### Shared Code
- **Location**: `shared/` directory contains schemas, routes, and types used by both client and server
- **API Contract**: `shared/routes.ts` defines API endpoint contracts with Zod schemas
- **Type Safety**: Drizzle schema types flow from database → server → client

### Build System
- **Development**: Vite dev server with HMR, proxied through Express
- **Production Build**: 
  - Client: Vite builds to `dist/public`
  - Server: esbuild bundles to `dist/index.cjs`
- **Build Script**: `script/build.ts` orchestrates both builds

### Key Design Patterns
1. **Protected Routes**: Client-side route guards check authentication state before rendering
2. **Optimistic Updates**: React Query mutations with cache invalidation
3. **Zod Validation**: Shared schemas validate data on both client (forms) and server (API)
4. **Financial Calculations**: Server-side computation of projections, DCF valuations, and trading comps

## Pages

- **Home** (`/`): Landing page with value proposition and CTA
- **Dashboard** (`/dashboard`): Portfolio overview with KPIs and recent models
- **Repository** (`/repository`): Model library with search, filter, and sort
- **Analysis** (`/analysis`): Valuation scenario analysis with sensitivity tables
- **Model Detail** (`/model/:id`): Full model view with projections, DCF, comps, precedent transactions, and LBO analysis

## External Dependencies

### Database
- **PostgreSQL**: Primary data store, connection via `DATABASE_URL` environment variable
- **Tables**: `users`, `sessions` (auth), `financial_models`, `user_profiles`

### Authentication
- **Replit Auth**: OIDC-based authentication handled via `server/replit_integrations/auth/`
- **Required Environment Variables**:
  - `DATABASE_URL`: PostgreSQL connection string
  - `SESSION_SECRET`: Secret for signing session cookies
  - `ISSUER_URL`: OIDC issuer (defaults to Replit)
  - `REPL_ID`: Replit environment identifier

### Third-Party Libraries
- **xlsx-js-style**: Excel file generation with professional formatting
- **recharts**: Data visualization charts
- **date-fns**: Date formatting utilities

### Development Tools
- **Replit Plugins**: 
  - `@replit/vite-plugin-runtime-error-modal`: Error overlay in development
  - `@replit/vite-plugin-cartographer`: Development tooling
  - `@replit/vite-plugin-dev-banner`: Development environment indicator
