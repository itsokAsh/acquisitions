import { 
  createWorkspace, 
  getUserWorkspaces, 
  getWorkspaceById, 
  updateWorkspace, 
  deleteWorkspace,
  getWorkspaceMembers,
  removeMember,
  updateMemberRole
} from '#services/workspace.service.js';
import {
  createInvitation,
  listWorkspaceInvitations,
  revokeInvitation,
  acceptInvitation
} from '#services/invitation.service.js';
import { 
  createWorkspaceSchema, 
  updateWorkspaceSchema, 
  createInvitationSchema,
  updateMemberRoleSchema
} from '#validation/workspace.validation.js';
import logger from '#config/logger.js';

export const handleCreateWorkspace = async (req, res, next) => {
  try {
    const { name } = createWorkspaceSchema.parse(req.body);
    const workspace = await createWorkspace(name, req.user.id);
    res.status(201).json({ message: 'Workspace created successfully', workspace });
  } catch (error) {
    if (error.name === 'ZodError') {
      return res.status(400).json({ error: 'Validation error', details: error.errors });
    }
    next(error);
  }
};

export const handleGetUserWorkspaces = async (req, res, next) => {
  try {
    const workspaces = await getUserWorkspaces(req.user.id);
    res.status(200).json({ workspaces });
  } catch (error) {
    next(error);
  }
};

export const handleGetWorkspace = async (req, res, next) => {
  try {
    const workspace = await getWorkspaceById(req.workspaceId);
    res.status(200).json({ workspace });
  } catch (error) {
    next(error);
  }
};

export const handleUpdateWorkspace = async (req, res, next) => {
  try {
    const data = updateWorkspaceSchema.parse(req.body);
    const workspace = await updateWorkspace(req.workspaceId, data);
    res.status(200).json({ message: 'Workspace updated', workspace });
  } catch (error) {
    if (error.name === 'ZodError') {
      return res.status(400).json({ error: 'Validation error', details: error.errors });
    }
    next(error);
  }
};

export const handleDeleteWorkspace = async (req, res, next) => {
  try {
    await deleteWorkspace(req.workspaceId);
    res.status(200).json({ message: 'Workspace deleted successfully' });
  } catch (error) {
    next(error);
  }
};

export const handleGetMembers = async (req, res, next) => {
  try {
    const members = await getWorkspaceMembers(req.workspaceId);
    res.status(200).json({ members });
  } catch (error) {
    next(error);
  }
};

export const handleRemoveMember = async (req, res, next) => {
  try {
    await removeMember(req.workspaceId, req.params.userId);
    res.status(200).json({ message: 'Member removed successfully' });
  } catch (error) {
    if (error.message === 'Cannot remove the workspace owner') {
       return res.status(400).json({ error: 'Bad Request', message: error.message });
    }
    next(error);
  }
};

export const handleUpdateMemberRole = async (req, res, next) => {
  try {
    const { role_id } = updateMemberRoleSchema.parse(req.body);
    await updateMemberRole(req.workspaceId, req.params.userId, role_id, req.membership.role_hierarchy);
    res.status(200).json({ message: 'Member role updated successfully' });
  } catch (error) {
    if (error.name === 'ZodError') {
      return res.status(400).json({ error: 'Validation error', details: error.errors });
    }
    if (error.message.includes('Cannot change') || error.message.includes('Cannot assign')) {
       return res.status(400).json({ error: 'Bad Request', message: error.message });
    }
    next(error);
  }
};

export const handleCreateInvitation = async (req, res, next) => {
  try {
    const { email, role_id } = createInvitationSchema.parse(req.body);
    
    // In a real application, you would send this token via Email.
    // For this portfolio project, we will return the token in the response so we can test it.
    const token = await createInvitation(req.workspaceId, email, role_id, req.user.id);
    
    res.status(201).json({ 
      message: 'Invitation created (in a real app, this would be emailed)',
      invitation_token: token // REMOVE IN PRODUCTION
    });
  } catch (error) {
    if (error.name === 'ZodError') {
      return res.status(400).json({ error: 'Validation error', details: error.errors });
    }
    next(error);
  }
};

export const handleListInvitations = async (req, res, next) => {
  try {
    const invitations = await listWorkspaceInvitations(req.workspaceId);
    res.status(200).json({ invitations });
  } catch (error) {
    next(error);
  }
};

export const handleRevokeInvitation = async (req, res, next) => {
  try {
    await revokeInvitation(req.params.id, req.workspaceId);
    res.status(200).json({ message: 'Invitation revoked' });
  } catch (error) {
    next(error);
  }
};

export const handleAcceptInvitation = async (req, res, next) => {
  try {
    // This is a public route (requires JWT for user identity, but no workspace context)
    const token = req.params.token;
    await acceptInvitation(token, req.user.id, req.user.email);
    res.status(200).json({ message: 'Invitation accepted successfully. You are now a member of the workspace.' });
  } catch (error) {
    if (error.message.includes('Invalid') || error.message.includes('expired') || error.message.includes('different email')) {
        return res.status(400).json({ error: 'Bad Request', message: error.message });
    }
    next(error);
  }
};
