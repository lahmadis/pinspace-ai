# Deployment Guide: PinSpace to Vercel + Supabase

This guide walks you through deploying your Next.js PinSpace application to Vercel with Supabase as the backend.

## Prerequisites

- GitHub account
- Vercel account (sign up at [vercel.com](https://vercel.com))
- Supabase account (sign up at [supabase.com](https://supabase.com))
- Your Supabase project URL and keys

---

## Step 1: Prepare Your Supabase Project

### 1.1 Create Supabase Project

1. Go to [supabase.com](https://supabase.com) and sign in
2. Click **"New Project"**
3. Fill in:
   - **Name**: `pinspace` (or your preferred name)
   - **Database Password**: Create a strong password (save this!)
   - **Region**: Choose closest to your users
4. Click **"Create new project"** (takes ~2 minutes)

### 1.2 Set Up Database Schema

1. In Supabase dashboard, go to **SQL Editor**
2. Run this SQL to create the `boards` table:

```sql
-- Create boards table
CREATE TABLE IF NOT EXISTS boards (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  visibility TEXT DEFAULT 'private' CHECK (visibility IN ('private', 'public')),
  owner_id TEXT,
  owner_email TEXT,
  owner_username TEXT,
  owner_name TEXT,
  owner_school TEXT,
  cover_image TEXT,
  cover_color TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE boards ENABLE ROW LEVEL SECURITY;

-- Create policy: Users can read all boards (for public boards)
CREATE POLICY "Anyone can read boards"
  ON boards FOR SELECT
  USING (true);

-- Create policy: Users can insert their own boards
CREATE POLICY "Users can insert their own boards"
  ON boards FOR INSERT
  WITH CHECK (true);

-- Create policy: Users can update their own boards
CREATE POLICY "Users can update their own boards"
  ON boards FOR UPDATE
  USING (auth.uid()::text = owner_id OR owner_id IS NULL);

-- Create policy: Users can delete their own boards
CREATE POLICY "Users can delete their own boards"
  ON boards FOR DELETE
  USING (auth.uid()::text = owner_id OR owner_id IS NULL);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_boards_owner_id ON boards(owner_id);
CREATE INDEX IF NOT EXISTS idx_boards_created_at ON boards(created_at DESC);
```

### 1.3 Configure Authentication

1. In Supabase dashboard, go to **Authentication** → **Providers**
2. Enable **Email** provider
3. Configure email settings:
   - **Enable email confirmations**: Optional (recommended for production)
   - **Magic Link**: Enabled
4. Go to **Authentication** → **URL Configuration**
5. Add your production URL to **Site URL**:
   - `https://your-app.vercel.app`
   - Also add: `https://your-app.vercel.app/auth/callback`
6. Add **Redirect URLs**:
   - `https://your-app.vercel.app/auth/callback`
   - `http://localhost:3000/auth/callback` (for local development)

### 1.4 Get Supabase Credentials

1. In Supabase dashboard, go to **Settings** → **API**
2. Copy these values (you'll need them for environment variables):
   - **Project URL**: `https://xxxxx.supabase.co`
   - **anon/public key**: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`

---

## Step 2: Prepare Your Code

### 2.1 Verify Environment Variables

Create a `.env.local` file in your project root (for local development):

```env
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Important**: Never commit `.env.local` to git (it should be in `.gitignore`)

### 2.2 Update Supabase Configuration

Make sure your `src/lib/supabaseClient.ts` uses environment variables:

```typescript
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
```

### 2.3 Commit and Push to GitHub

```bash
git add .
git commit -m "Prepare for production deployment"
git push origin main
```

---

## Step 3: Deploy to Vercel

### 3.1 Import Project

1. Go to [vercel.com](https://vercel.com) and sign in
2. Click **"Add New..."** → **"Project"**
3. Import your GitHub repository
4. Select your repository: `pinspace-ai`
5. Click **"Import"**

### 3.2 Configure Project

1. **Project Name**: `pinspace` (or your preferred name)
2. **Framework Preset**: Next.js (should auto-detect)
3. **Root Directory**: `./` (project root)
4. **Build Command**: `npm run build` (default)
5. **Output Directory**: `.next` (default)
6. **Install Command**: `npm install` (default)

### 3.3 Add Environment Variables

Click **"Environment Variables"** and add:

| Variable Name | Value | Description |
|--------------|-------|-------------|
| `NEXT_PUBLIC_SUPABASE_URL` | `https://xxxxx.supabase.co` | Your Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | `eyJhbGciOiJIUzI1NiIs...` | Your Supabase anon/public key |

**Important**: 
- ✅ Check **"Production"**, **"Preview"**, and **"Development"** for each variable
- These variables are public (client-side), which is safe for the anon key
- The anon key is restricted by RLS policies

### 3.4 Deploy

1. Click **"Deploy"**
2. Wait for build to complete (~2-3 minutes)
3. Vercel will provide a URL like: `https://pinspace-ai.vercel.app`

---

## Step 4: Configure Supabase for Production

### 4.1 Update Supabase Auth URLs

1. Go back to Supabase dashboard
2. **Authentication** → **URL Configuration**
3. Update **Site URL** to your Vercel URL:
   - `https://pinspace-ai.vercel.app`
4. Add **Redirect URLs**:
   - `https://pinspace-ai.vercel.app/auth/callback`
   - `http://localhost:3000/auth/callback` (keep for local dev)

### 4.2 Test Authentication

1. Visit your Vercel URL: `https://pinspace-ai.vercel.app`
2. Click **"Login"** in sidebar
3. Enter your email and click **"Send Magic Link"**
4. Check your email and click the magic link
5. You should be redirected back to the app and logged in

---

## Step 5: Verify Deployment

### 5.1 Test Key Features

1. ✅ **Authentication**: Login/logout works
2. ✅ **Boards List**: Can fetch boards from Supabase
3. ✅ **Create Board**: Can create new boards
4. ✅ **Edit Board**: Can rename boards
5. ✅ **Delete Board**: Can delete boards
6. ✅ **API Routes**: All `/api/boards` endpoints work

### 5.2 Check Logs

1. In Vercel dashboard, go to your project
2. Click **"Deployments"** → Select latest deployment
3. Click **"Functions"** tab to see API route logs
4. Check for any errors or warnings

---

## Step 6: Production Optimizations (Optional)

### 6.1 Enable Vercel Analytics

1. In Vercel project settings, enable **Analytics**
2. Monitor page views and performance

### 6.2 Set Up Custom Domain

1. In Vercel project settings, go to **Domains**
2. Add your custom domain (e.g., `pinspace.example.com`)
3. Follow DNS configuration instructions

### 6.3 Configure Database Backups

1. In Supabase dashboard, go to **Database** → **Backups**
2. Enable automated daily backups

---

## Troubleshooting

### Issue: Authentication not working

**Solution**: 
- Verify `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` are set in Vercel
- Check Supabase **Authentication** → **URL Configuration** has correct redirect URLs
- Check browser console for errors

### Issue: API routes returning 500 errors

**Solution**:
- Check Vercel function logs: **Deployments** → **Functions**
- Verify Supabase environment variables are correct
- Check Supabase dashboard for database errors

### Issue: CORS errors

**Solution**:
- Supabase handles CORS automatically when using the anon key
- If issues persist, check Supabase **Settings** → **API** → **CORS settings**

### Issue: RLS policies blocking requests

**Solution**:
- Check Supabase **Authentication** → **Policies** for your `boards` table
- Verify policies allow the operations you need
- Test queries in Supabase SQL Editor

---

## Environment Variables Reference

| Variable | Required | Where | Description |
|----------|----------|-------|-------------|
| `NEXT_PUBLIC_SUPABASE_URL` | ✅ Yes | Vercel + Local | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | ✅ Yes | Vercel + Local | Supabase anonymous/public key |

**Note**: Both variables must start with `NEXT_PUBLIC_` to be available in the browser.

---

## Quick Deploy Checklist

- [ ] Supabase project created
- [ ] Database schema created (boards table + RLS policies)
- [ ] Authentication enabled in Supabase
- [ ] Environment variables added to Vercel
- [ ] Code pushed to GitHub
- [ ] Vercel project deployed
- [ ] Supabase redirect URLs updated for production
- [ ] Authentication tested
- [ ] API routes tested
- [ ] All features working

---

## Support

- **Vercel Docs**: [vercel.com/docs](https://vercel.com/docs)
- **Supabase Docs**: [supabase.com/docs](https://supabase.com/docs)
- **Next.js Docs**: [nextjs.org/docs](https://nextjs.org/docs)

---

**Ready to launch!** 🚀

Your PinSpace app should now be live at `https://your-app.vercel.app`




