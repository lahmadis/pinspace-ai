/**
 * Board Hooks Index
 * 
 * Exports all board-related React hooks for convenient importing.
 * 
 * Usage:
 *   import { useBoards, useBoard, useCreateBoard, useUpdateBoard, useDeleteBoard } from '@/hooks/boards';
 */

// List all boards
export { useFetchBoards as useBoards } from '../useFetchBoards';

// Single board operations
export { useBoard } from '../useBoard';
export { useCreateBoard } from '../useCreateBoard';
export { useUpdateBoard } from '../useUpdateBoard';
export { useDeleteBoard } from '../useDeleteBoard';