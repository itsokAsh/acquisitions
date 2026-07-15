import logger from '#config/logger.js';
import { db } from '#config/database.js';
import { eq, and } from 'drizzle-orm';
import { invitations } from '#models/invitation.model.js';
import { workspaceMembers } from '#models/workspace-member.model.js';
import { roles } from '#models/role.model.js';
import { users } from '#models/user.model.js';
import crypto from 'crypto';

export const createInvitation = async (workspaceId, email, roleId, invitedByUserId) => {
  try {
    // Generate token
    const rawToken = crypto.randomBytes(32).toString('hex');
    const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');

    // Expires in 7 days
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    // Upsert the invitation (if one exists for this email, overwrite it)
    await db.delete(invitations).where(
      and(
        eq(invitations.workspace_id, workspaceId),
        eq(invitations.email, email)
      )
    );

    await db.insert(invitations).values({
      workspace_id: workspaceId,
      email,
      role_id: roleId,
      invited_by: invitedByUserId,
      token_hash: tokenHash,
      expires_at: expiresAt,
    });

    // In a real app, send email here
    logger.info(`Generated invitation for ${email} to workspace ${workspaceId}. Token: ${rawToken}`);

    return rawToken; // Only return this to the controller to send in email/response
  } catch (error) {
    logger.error('Error creating invitation:', error);
    throw new Error('Error creating invitation', { cause: error });
  }
};

export const listWorkspaceInvitations = async (workspaceId) => {
  try {
    return await db
      .select({
        id: invitations.id,
        email: invitations.email,
        role: roles.name,
        status: invitations.status,
        expires_at: invitations.expires_at,
        invited_by: users.name,
      })
      .from(invitations)
      .innerJoin(roles, eq(invitations.role_id, roles.id))
      .innerJoin(users, eq(invitations.invited_by, users.id))
      .where(eq(invitations.workspace_id, workspaceId));
  } catch (error) {
    logger.error('Error fetching invitations:', error);
    throw new Error('Error fetching invitations', { cause: error });
  }
};

export const revokeInvitation = async (invitationId, workspaceId) => {
  try {
    await db.delete(invitations).where(
      and(
        eq(invitations.id, invitationId),
        eq(invitations.workspace_id, workspaceId)
      )
    );
    return true;
  } catch (error) {
    logger.error('Error revoking invitation:', error);
    throw new Error('Error revoking invitation', { cause: error });
  }
};

export const acceptInvitation = async (rawToken, userId, userEmail) => {
  try {
    const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');

    const [invitation] = await db
      .select()
      .from(invitations)
      .where(eq(invitations.token_hash, tokenHash))
      .limit(1);

    if (!invitation) {
      throw new Error('Invalid or expired invitation token');
    }

    if (invitation.status !== 'pending') {
      throw new Error('Invitation has already been accepted');
    }

    if (invitation.expires_at < new Date()) {
      throw new Error('Invitation has expired');
    }

    if (invitation.email !== userEmail) {
       throw new Error('This invitation is for a different email address');
    }

    // Create membership and update invite status in a transaction
    await db.transaction(async (tx) => {
      await tx.insert(workspaceMembers).values({
        user_id: userId,
        workspace_id: invitation.workspace_id,
        role_id: invitation.role_id,
      });

      await tx.update(invitations)
        .set({ status: 'accepted' })
        .where(eq(invitations.id, invitation.id));
    });

    return true;
  } catch (error) {
    logger.error('Error accepting invitation:', error);
    throw error;
  }
};
