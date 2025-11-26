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

// REFACTORED: Added error handling for Prisma Client import
// If @prisma/client is not installed, this will gracefully handle the error
let PrismaClient: any;
try {
  PrismaClient = require('@prisma/client').PrismaClient;
} catch (error) {
  // Prisma is not installed or not configured
  console.warn('[prisma] @prisma/client not found. Prisma features will be disabled.');
  PrismaClient = null;
}

// Declare a global variable to hold the Prisma Client instance
// This is TypeScript syntax for extending the global scope
declare global {
  // eslint-disable-next-line no-var
  var prisma: any | undefined;
}

// Create a single Prisma Client instance
// In development, reuse the existing instance if it exists (from hot reload)
// In production, always create a new instance
// REFACTORED: Only create PrismaClient if it's available
const prisma = PrismaClient ? (globalThis.prisma || new PrismaClient()) : null;

// In development, save the instance to global so it persists across hot reloads
if (process.env.NODE_ENV !== 'production') {
  globalThis.prisma = prisma;
}

export { prisma };

