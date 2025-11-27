# Environment Variables Documentation

This document describes all environment variables used in PinSpace.

## Quick Start

1. Copy `.env.example` to `.env.local`:
   ```bash
   cp .env.example .env.local
   ```

2. Fill in your values in `.env.local` (this file is git-ignored)

3. Restart your development server:
   ```bash
   npm run dev
   ```

## Variable Reference

### API Configuration

#### `NEXT_PUBLIC_BASE_URL`
- **Type**: `string`
- **Default**: `http://localhost:3000` (auto-detected from headers in most cases)
- **Description**: Base URL for API requests. Used for server-side fetching when headers are not available.
- **Usage**: 
  ```typescript
  // In src/lib/boardData.ts
  process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000"
  ```
- **Production**: Set to your production domain (e.g., `https://pinspace.app`)

### Realtime/Collaboration

#### `NEXT_PUBLIC_REALTIME`
- **Type**: `boolean` (string: `"true"` or `"false"`)
- **Default**: `true`
- **Description**: Enable/disable realtime collaboration features (PeerJS)
- **Usage**: 
  ```typescript
  // In src/lib/realtime.ts
  process.env.NEXT_PUBLIC_REALTIME !== "false"
  ```
- **Production**: Keep as `true` unless you want to disable realtime features

#### `NEXT_PUBLIC_PEER_HOST`
- **Type**: `string`
- **Default**: `"0.peerjs.com"`
- **Description**: PeerJS host for WebRTC connections
- **Usage**: In `src/lib/realtime.ts`
- **Production**: Use default or your own PeerJS server

#### `NEXT_PUBLIC_PEER_PORT`
- **Type**: `number` (string)
- **Default**: `443`
- **Description**: PeerJS port
- **Usage**: In `src/lib/realtime.ts`
- **Production**: Use default (443 for HTTPS)

#### `NEXT_PUBLIC_PEER_PATH`
- **Type**: `string`
- **Default**: `"/"`
- **Description**: PeerJS path
- **Usage**: In `src/lib/realtime.ts`
- **Production**: Use default

#### `NEXT_PUBLIC_PEER_SECURE`
- **Type**: `boolean` (string: `"true"` or `"false"`)
- **Default**: `true`
- **Description**: Use secure connection for PeerJS
- **Usage**: In `src/lib/realtime.ts`
- **Production**: Always use `true` (secure)

### Feature Flags

#### `ENABLE_MOCK_FALLBACK`
- **Type**: `boolean` (string: `"true"` or `"false"`)
- **Default**: `true`
- **Description**: Enable mock data fallback in `useBoards` hook when API fails
- **Usage**: In `src/hooks/useBoards.ts`
- **Development**: Keep as `true` for easier development
- **Production**: Set to `false` when API is ready (show errors instead of mock data)

## Variable Naming Convention

- **`NEXT_PUBLIC_*`**: Variables prefixed with `NEXT_PUBLIC_` are exposed to the browser
  - Use for client-side configuration
  - ⚠️ **Security**: Never put secrets in `NEXT_PUBLIC_*` variables
  - These are bundled into the client-side JavaScript

- **No prefix**: Server-only variables (not exposed to browser)
  - Use for secrets, API keys, database URLs
  - Accessible only in server-side code (API routes, server components)

## Current Usage Locations

### `src/lib/realtime.ts`
- `NEXT_PUBLIC_REALTIME`
- `NEXT_PUBLIC_PEER_HOST`
- `NEXT_PUBLIC_PEER_PORT`
- `NEXT_PUBLIC_PEER_PATH`
- `NEXT_PUBLIC_PEER_SECURE`

### `src/lib/boardData.ts`
- `NEXT_PUBLIC_BASE_URL`

### `src/hooks/useBoards.ts`
- `ENABLE_MOCK_FALLBACK` (hardcoded constant, consider making env var)

## Future Variables (Planned)

### Analytics
- `NEXT_PUBLIC_ANALYTICS_ID` - Analytics service ID
- `NEXT_PUBLIC_GA_MEASUREMENT_ID` - Google Analytics ID

### Error Tracking
- `NEXT_PUBLIC_SENTRY_DSN` - Sentry DSN for error tracking

### Authentication
- `NEXT_PUBLIC_AUTH_PROVIDER` - Auth provider (e.g., "auth0", "firebase")
- `NEXT_PUBLIC_AUTH_CLIENT_ID` - Auth client ID
- `AUTH_CLIENT_SECRET` - Auth client secret (server-only)

### Database
- `DATABASE_URL` - Database connection string (server-only)
- `DATABASE_POOL_SIZE` - Connection pool size

### Storage
- `STORAGE_PROVIDER` - Storage provider (e.g., "s3", "gcs")
- `STORAGE_BUCKET` - Storage bucket name
- `STORAGE_REGION` - Storage region

## Security Best Practices

1. **Never commit `.env.local`** - It's in `.gitignore`
2. **Use `NEXT_PUBLIC_*` sparingly** - Only for non-sensitive config
3. **Keep secrets server-only** - Don't prefix with `NEXT_PUBLIC_`
4. **Validate environment variables** - Check required vars at startup
5. **Use `.env.example`** - Document all variables (without values)

## Validation

Consider adding environment variable validation at app startup:

```typescript
// src/lib/env.ts
function validateEnv() {
  const required = [
    // Add required variables here
  ];
  
  const missing = required.filter(key => !process.env[key]);
  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(", ")}`);
  }
}
```

## Production Deployment

### Vercel
1. Go to Project Settings → Environment Variables
2. Add each variable with appropriate value
3. Set environment (Production, Preview, Development)
4. Redeploy

### Other Platforms
- **Netlify**: Site Settings → Environment Variables
- **Railway**: Variables tab in project settings
- **Docker**: Use `-e` flag or `.env` file

## Troubleshooting

### Variables not updating
- Restart development server after changing `.env.local`
- Clear `.next` cache: `rm -rf .next`
- Check variable name spelling (case-sensitive)

### Variables undefined in browser
- Ensure variable starts with `NEXT_PUBLIC_`
- Check that variable is in `.env.local` (not just `.env`)
- Restart dev server

### Server-side variables not working
- Ensure variable doesn't have `NEXT_PUBLIC_` prefix
- Check that you're accessing in server-side code (API routes, server components)








