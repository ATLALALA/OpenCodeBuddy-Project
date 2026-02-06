/**
 * Zod Schemas for BridgeState validation
 */
import { z } from 'zod';

export const SessionInfoSchema = z.object({
  id: z.string(),
  busy: z.boolean(),
  idle: z.boolean(),
  openTodos: z.number().int().nonnegative(),
  doneTodos: z.number().int().nonnegative(),
  totalTodos: z.number().int().nonnegative(),
  conversationStartedAt: z.string().datetime(),
  lastUserMessageAt: z.string().datetime().optional(),
  lastAssistantMessageAt: z.string().datetime().optional(),
});

export const CountersSchema = z.object({
  todosCompletedTotal: z.number().int().nonnegative(),
  conversationsCompletedTotal: z.number().int().nonnegative(),
});

export const ProjectInfoSchema = z.object({
  worktree: z.string(),
});

export const BridgeStateSchema = z.object({
  v: z.literal(1),
  updatedAt: z.string().datetime(),
  project: ProjectInfoSchema,
  session: SessionInfoSchema.nullable(),
  counters: CountersSchema,
});

export type BridgeStateFromSchema = z.infer<typeof BridgeStateSchema>;
