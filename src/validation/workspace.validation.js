import { z } from 'zod';

export const createWorkspaceSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').max(100, 'Name must be less than 100 characters'),
});

export const updateWorkspaceSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').max(100, 'Name must be less than 100 characters').optional(),
});

export const createInvitationSchema = z.object({
  email: z.string().email('Invalid email address'),
  role_id: z.string().uuid('Invalid role ID'),
});

export const updateMemberRoleSchema = z.object({
  role_id: z.string().uuid('Invalid role ID'),
});
