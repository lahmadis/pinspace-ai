# Prisma & PostgreSQL Setup Guide

Welcome! This guide will walk you through setting up Prisma and PostgreSQL for your collaborative critique app. We'll go step-by-step, explaining everything in beginner-friendly terms.

## 📋 Table of Contents

1. [What is Prisma and PostgreSQL?](#what-is-prisma-and-postgresql)
2. [Prerequisites](#prerequisites)
3. [Step 1: Set Up PostgreSQL Database](#step-1-set-up-postgresql-database)
4. [Step 2: Configure Environment Variables](#step-2-configure-environment-variables)
5. [Step 3: Understanding Your Prisma Schema](#step-3-understanding-your-prisma-schema)
6. [Step 4: Generate Prisma Client](#step-4-generate-prisma-client)
7. [Step 5: Run Database Migrations](#step-5-run-database-migrations)
8. [Step 6: Understanding Your API Route](#step-6-understanding-your-api-route)
9. [Step 7: Connect Your Frontend](#step-7-connect-your-frontend)
10. [Testing Your Setup](#testing-your-setup)
11. [Troubleshooting](#troubleshooting)

---

## What is Prisma and PostgreSQL?

### PostgreSQL
- **PostgreSQL** is a powerful, open-source database system
- It stores all your data (users, boards, comments, attachments) in tables
- Think of it like a digital filing cabinet for your app

### Prisma
- **Prisma** is a tool that makes it easy to work with databases
- It generates TypeScript code so you can use your database like a regular object
- Instead of writing SQL queries, you write code like `prisma.board.create()`

**Why use them together?**
- PostgreSQL stores the data reliably and efficiently
- Prisma makes it easy and safe to work with that data in your TypeScript code

---

## Prerequisites

Before starting, make sure you have:
- ✅ Node.js installed (v18 or higher)
- ✅ A PostgreSQL database (we'll help you set this up)
- ✅ Basic understanding of JavaScript/TypeScript

---

## Step 1: Set Up PostgreSQL Database

You have several options for PostgreSQL:

### Option A: Local PostgreSQL (for development)

1. **Install PostgreSQL**:
   - **Windows**: Download from [postgresql.org](https://www.postgresql.org/download/windows/)
   - **Mac**: `brew install postgresql@15`
   - **Linux**: `sudo apt-get install postgresql postgresql-contrib`

2. **Start PostgreSQL**:
   ```bash
   # Mac/Linux
   brew services start postgresql@15
   
   # Windows: PostgreSQL starts automatically after installation
   ```

3. **Create a database**:
   ```bash
   # Open PostgreSQL command line
   psql postgres
   
   # Create database
   CREATE DATABASE pinspace;
   
   # Create a user (optional, can use default 'postgres' user)
   CREATE USER pinspace_user WITH PASSWORD 'your_password';
   GRANT ALL PRIVILEGES ON DATABASE pinspace TO pinspace_user;
   
   # Exit
   \q
   ```

### Option B: Cloud PostgreSQL (Recommended for beginners)

Use a free cloud database - easier to set up and no local installation needed:

#### **Supabase** (Recommended)
1. Go to [supabase.com](https://supabase.com)
2. Sign up for free
3. Create a new project
4. Go to Settings → Database
5. Copy the connection string (looks like: `postgresql://postgres:password@db.xxx.supabase.co:5432/postgres`)

#### **Neon** (Also great)
1. Go to [neon.tech](https://neon.tech)
2. Sign up for free
3. Create a new project
4. Copy the connection string from the dashboard

#### **Railway**
1. Go to [railway.app](https://railway.app)
2. Sign up for free
3. Create a new project → Add PostgreSQL
4. Copy the connection string from the Variables tab

---

## Step 2: Configure Environment Variables

Environment variables store sensitive configuration (like database passwords) outside your code.

1. **Create a `.env.local` file** in your project root (same folder as `package.json`):
   ```
   .env.local
   ```

2. **Add your database connection string**:
   ```env
   # For local PostgreSQL
   DATABASE_URL="postgresql://postgres:your_password@localhost:5432/pinspace"
   
   # For Supabase (replace with your actual connection string)
   # DATABASE_URL="postgresql://postgres:YOUR_PASSWORD@db.xxx.supabase.co:5432/postgres"
   
   # For Neon
   # DATABASE_URL="postgresql://user:password@ep-xxx-xxx.region.aws.neon.tech/neondb?sslmode=require"
   ```

3. **Important Notes**:
   - Never commit `.env.local` to git (it's already in `.gitignore`)
   - Replace `your_password` with your actual database password
   - The format is: `postgresql://USERNAME:PASSWORD@HOST:PORT/DATABASE_NAME`

---

## Step 3: Understanding Your Prisma Schema

Your Prisma schema file (`prisma/schema.prisma`) defines your database structure. Let's break down what each model does:

### 📁 File: `prisma/schema.prisma`

#### **1. User Model** - Stores user accounts
```prisma
model User {
  id        String   @id @default(cuid())  // Unique ID for each user
  email     String?  @unique              // Optional email (unique)
  username  String   @unique              // Username like "@sarah" (must be unique)
  name      String                        // Display name like "Sarah Lahmadi"
  avatarUrl String?                       // Profile picture URL (optional)
  bio       String?                       // User bio (optional)
  isPrivate Boolean  @default(false)      // Private account? (default: false)
  school    String?                       // School name (optional)
  
  // Relationships - these link to other tables
  ownedBoards Board[]                     // Boards this user owns
  collaboratedBoards BoardCollaborator[]  // Boards user collaborates on
  comments Comment[]                      // Comments this user created
  
  createdAt DateTime @default(now())      // When user was created
  updatedAt DateTime @updatedAt          // When user was last updated
}
```

**Key Fields Explained**:
- `@id @default(cuid())`: Automatically generates a unique ID
- `@unique`: Ensures no two users can have the same value
- `String?`: The `?` means this field is optional (can be null)
- `DateTime @default(now())`: Automatically sets to current time when created

#### **2. Board Model** - Stores critique boards/projects
```prisma
model Board {
  id          String   @id @default(cuid())  // Unique board ID
  title       String                        // Board title (required)
  description String?                       // Board description (optional)
  visibility  String   @default("private")  // "private" or "public"
  
  // Relationships
  ownerId String                            // ID of the user who owns this board
  owner   User   @relation(...)            // Link to User table
  collaborators BoardCollaborator[]         // Users collaborating on this board
  comments Comment[]                        // Comments on this board
  attachments Attachment[]                  // Files attached to this board
  
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}
```

**Key Relationships**:
- `ownerId` + `owner`: Links board to the user who created it
- `@relation(...)`: Tells Prisma how to connect tables

#### **3. Comment Model** - Stores critique comments/pins
```prisma
model Comment {
  id          String  @id @default(cuid())
  text        String                        // Comment text (required)
  category    String?                       // Category like "concept", "plan", etc.
  
  // Position on canvas (optional - for floating comments)
  x Float?                                  // X coordinate
  y Float?                                  // Y coordinate
  
  // Relationships
  boardId String                            // Which board this comment is on
  board   Board @relation(...)             // Link to Board table
  authorId String                           // Who wrote this comment
  author   User  @relation(...)            // Link to User table
  
  task    Boolean @default(false)           // Is this a task?
  source  String?                           // "liveCrit" or null
  
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}
```

#### **4. Attachment Model** - Stores files (images, PDFs, etc.)
```prisma
model Attachment {
  id          String  @id @default(cuid())
  filename    String                        // Original filename
  fileUrl     String                        // Where the file is stored (S3, etc.)
  fileType    String                        // MIME type like "image/png"
  fileSize    Int?                          // File size in bytes (optional)
  
  // Position on canvas (optional)
  x Float?                                  // X coordinate
  y Float?                                  // Y coordinate
  width  Float?                             // Display width
  height Float?                             // Display height
  
  // Relationships
  boardId String                            // Which board this file is on
  board   Board @relation(...)             // Link to Board table
  
  caption String?                           // Optional caption
  
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}
```

---

## Step 4: Generate Prisma Client

Prisma Client is the code that lets you interact with your database from TypeScript.

**Run this command**:
```bash
npm run db:generate
# or
npx prisma generate
```

**What this does**:
- Reads your `schema.prisma` file
- Generates TypeScript code in `node_modules/.prisma/client`
- Creates types like `User`, `Board`, `Comment`, `Attachment`
- Now you can use `prisma.board.create()` in your code

---

## Step 5: Run Database Migrations

Migrations create the actual tables in your PostgreSQL database based on your schema.

**Run this command**:
```bash
npm run db:migrate
# or
npx prisma migrate dev --name init
```

**What this does**:
1. Creates a migration file in `prisma/migrations/`
2. Applies it to your database (creates tables)
3. Generates Prisma Client automatically

**First time?** It will ask you to name the migration - call it something like "init".

**Want to see your database?** Run:
```bash
npm run db:studio
```
This opens a visual database browser at `http://localhost:5555` where you can see and edit your data!

---

## Step 6: Understanding Your API Route

Your API route (`src/app/api/boards/route.ts`) handles creating boards. Let's walk through how it works:

### 📁 File: `src/app/api/boards/route.ts`

#### **The POST Function - Creating a Board**

```typescript
export async function POST(request: Request) {
  // Step 1: Parse the incoming request body (JSON data from frontend)
  const body = await request.json();
  
  // Step 2: Validate required fields
  if (!body.title) {
    return NextResponse.json({ error: "title is required" }, { status: 400 });
  }
  
  // Step 3: Import Prisma Client
  const { prisma } = await import("@/lib/prisma");
  
  // Step 4: Check if user exists, create if needed
  let user = await prisma.user.findUnique({
    where: { id: body.ownerId }
  });
  
  if (!user) {
    // Create new user
    user = await prisma.user.create({
      data: {
        id: body.ownerId,
        username: body.ownerUsername,
        name: body.ownerName,
        // ... other fields
      }
    });
  }
  
  // Step 5: Create the board in the database
  const newBoard = await prisma.board.create({
    data: {
      title: body.title,
      description: body.description || null,
      visibility: body.visibility || "private",
      ownerId: user.id,  // Link board to user
    },
    include: {
      owner: true,  // Include user data in response
      collaborators: true,  // Include collaborators
    }
  });
  
  // Step 6: Return success response
  return NextResponse.json({ board: newBoard }, { status: 201 });
}
```

**Key Concepts**:

1. **Request/Response**: The function receives a `Request` and returns a `NextResponse`
2. **Validation**: Always check required fields before database operations
3. **Prisma Methods**:
   - `prisma.user.findUnique()`: Find one user by ID
   - `prisma.user.create()`: Create a new user
   - `prisma.board.create()`: Create a new board
4. **Error Handling**: Use try/catch to handle database errors
5. **Status Codes**: 
   - `201`: Created successfully
   - `400`: Bad request (missing/invalid data)
   - `500`: Server error

---

## Step 7: Connect Your Frontend

Your frontend component (`src/components/NewBoardModal.tsx`) connects to the API. Here's how:

### 📁 File: `src/components/NewBoardModal.tsx`

#### **Making the API Call**

```typescript
async function handleCreate() {
  // Step 1: Prepare the data
  const requestData = {
    title: title.trim(),
    visibility: visibility.toLowerCase(),
    ownerId: userId,
    ownerUsername: currentUser.username,
    ownerName: currentUser.name,
    // ... other fields
  };
  
  // Step 2: Send POST request to API
  const response = await fetch("/api/boards", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(requestData),
  });
  
  // Step 3: Check if successful
  if (!response.ok) {
    throw new Error("Failed to create board");
  }
  
  // Step 4: Get the response data
  const data = await response.json();
  const newBoardId = data.board.id;
  
  // Step 5: Navigate to the new board
  router.push(`/board/${newBoardId}`);
}
```

**Key Concepts**:

1. **`fetch()`**: JavaScript function to make HTTP requests
2. **`/api/boards`**: The route to your API (Next.js automatically routes this)
3. **`JSON.stringify()`**: Converts JavaScript object to JSON string
4. **`response.json()`**: Parses JSON response back to JavaScript object
5. **Error Handling**: Always check `response.ok` before using the data

---

## Testing Your Setup

Let's test if everything works:

### 1. **Start your development server**:
```bash
npm run dev
```

### 2. **Test creating a board**:
1. Open your app in the browser
2. Click "Create New Board"
3. Enter a title
4. Click "Create"
5. You should be redirected to the new board!

### 3. **Check your database**:
```bash
npm run db:studio
```
This opens Prisma Studio where you can see:
- Your new board in the `Board` table
- Your user in the `User` table
- All relationships are properly linked

### 4. **Test with API directly** (optional):

Use curl or a tool like Postman to test the API:

```bash
curl -X POST http://localhost:3000/api/boards \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Test Board",
    "visibility": "private",
    "ownerId": "test_user_123",
    "ownerUsername": "testuser",
    "ownerName": "Test User"
  }'
```

---

## Troubleshooting

### ❌ Error: "Can't reach database server"
**Solution**: 
- Check your `DATABASE_URL` in `.env.local` is correct
- Make sure PostgreSQL is running (if local)
- Check your database credentials

### ❌ Error: "Environment variable not found: DATABASE_URL"
**Solution**:
- Make sure `.env.local` exists in project root
- Restart your development server after creating `.env.local`
- Check the file is named exactly `.env.local` (not `.env` or `.env.example`)

### ❌ Error: "P1001: Can't reach database server"
**Solution**:
- Verify your connection string format: `postgresql://user:password@host:port/database`
- For cloud databases, check SSL mode might be required: add `?sslmode=require` to the end

### ❌ Error: "Migration failed"
**Solution**:
```bash
# Reset database (WARNING: deletes all data!)
npx prisma migrate reset

# Or create a fresh migration
npx prisma migrate dev --name fix_schema
```

### ❌ Error: "Prisma Client not generated"
**Solution**:
```bash
# Regenerate Prisma Client
npm run db:generate

# Make sure you've run migrations first
npm run db:migrate
```

### ❌ Frontend: "Failed to create board"
**Solution**:
1. Check browser console for error messages
2. Check your terminal/console for server errors
3. Verify API route is working by testing with curl/Postman
4. Make sure all required fields are being sent (`title`, `ownerId`, etc.)

---

## Next Steps

Now that your database is set up, you can:

1. **Create more API routes**:
   - `GET /api/boards` - Get all boards
   - `GET /api/boards/[id]` - Get one board
   - `PATCH /api/boards/[id]` - Update a board
   - `DELETE /api/boards/[id]` - Delete a board

2. **Add authentication**:
   - Use NextAuth.js or Clerk to handle user authentication
   - Get real user IDs from session instead of generating them

3. **Add more models**:
   - Tags for boards
   - Favorites/bookmarks
   - Board templates
   - Activity logs

4. **Optimize queries**:
   - Use Prisma's `select` to only fetch needed fields
   - Add pagination for large lists
   - Add caching where appropriate

---

## 📚 Additional Resources

- **Prisma Docs**: [prisma.io/docs](https://www.prisma.io/docs)
- **PostgreSQL Tutorial**: [postgresqltutorial.com](https://www.postgresqltutorial.com)
- **Next.js API Routes**: [nextjs.org/docs/app/building-your-application/routing/route-handlers](https://nextjs.org/docs/app/building-your-application/routing/route-handlers)

---

## Summary

✅ **What we've set up**:
1. PostgreSQL database (local or cloud)
2. Prisma schema with User, Board, Comment, Attachment models
3. Database migrations to create tables
4. API route to create boards (`POST /api/boards`)
5. Frontend connection to save boards to database

✅ **Files created/modified**:
- `prisma/schema.prisma` - Database structure
- `src/lib/prisma.ts` - Prisma Client instance
- `src/app/api/boards/route.ts` - API endpoint
- `src/components/NewBoardModal.tsx` - Frontend component

🎉 **You're ready to go!** Your app can now save boards to a real database instead of just localStorage.

---

*Questions? Check the troubleshooting section or refer to the Prisma documentation. Happy coding!*








