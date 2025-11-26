/**
 * Prisma Client Utility
 * 
 * This file creates and exports a singleton instance of Prisma Client.
 * 
 * Why a singleton? In Next.js, during development, hot reloading can create
 * multiple instances of Prisma Client, which can cause connection issues.
 * By using a singleton pattern, we ensure only one instance exists.
 * 
 * Usage:
 *   import { prisma } from '@/lib/prisma';
 *   const boards = await prisma.board.findMany();
 */

import { PrismaClient } from '@prisma/client';

// Declare a global variable to hold the Prisma Client instance
// This is TypeScript syntax for extending the global scope
declare global {
  // eslint-disable-next-line no-var
  var prisma: PrismaClient | undefined;
}

// Create a single Prisma Client instance
// In development, reuse the existing instance if it exists (from hot reload)
// In production, always create a new instance
const prisma = globalThis.prisma || new PrismaClient();

// In development, save the instance to global so it persists across hot reloads
if (process.env.NODE_ENV !== 'production') {
  globalThis.prisma = prisma;
}

export { prisma };

