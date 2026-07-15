import express from 'express';
import { authenticateToken } from '#middleware/auth.middleware.js';
import { requireWorkspaceContext } from '#middleware/workspace-context.middleware.js';
import { requirePermission } from '#middleware/rbac.middleware.js';
import * as workspaceController from '#controllers/workspace.controller.js';

const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: Workspaces
 *   description: Multi-tenant workspace management and RBAC
 */

// Global middleware for all routes in this file EXCEPT accept invitation
router.use(authenticateToken);

/**
 * @swagger
 * /api/workspaces:
 *   post:
 *     tags: [Workspaces]
 *     summary: Create a new workspace
 *     security:
 *       - cookieAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name]
 *             properties:
 *               name:
 *                 type: string
 *     responses:
 *       201:
 *         description: Workspace created
 */
router.post('/', workspaceController.handleCreateWorkspace);

/**
 * @swagger
 * /api/workspaces:
 *   get:
 *     tags: [Workspaces]
 *     summary: List all workspaces the user belongs to
 *     security:
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: List of workspaces
 */
router.get('/', workspaceController.handleGetUserWorkspaces);

// ----------------------------------------------------------------------
// Workspace Context Required Routes
// ----------------------------------------------------------------------

/**
 * @swagger
 * /api/workspaces/{workspaceId}:
 *   get:
 *     tags: [Workspaces]
 *     summary: Get workspace details
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: workspaceId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Workspace details
 */
router.get('/:workspaceId', requireWorkspaceContext, workspaceController.handleGetWorkspace);

/**
 * @swagger
 * /api/workspaces/{workspaceId}:
 *   put:
 *     tags: [Workspaces]
 *     summary: Update workspace details
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: workspaceId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *     responses:
 *       200:
 *         description: Workspace updated
 */
router.put('/:workspaceId', requireWorkspaceContext, requirePermission('workspace.update'), workspaceController.handleUpdateWorkspace);

/**
 * @swagger
 * /api/workspaces/{workspaceId}:
 *   delete:
 *     tags: [Workspaces]
 *     summary: Delete a workspace
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: workspaceId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Workspace deleted
 */
router.delete('/:workspaceId', requireWorkspaceContext, requirePermission('workspace.delete'), workspaceController.handleDeleteWorkspace);

/**
 * @swagger
 * /api/workspaces/{workspaceId}/members:
 *   get:
 *     tags: [Workspaces]
 *     summary: List all members of a workspace
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: workspaceId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: List of members
 */
router.get('/:workspaceId/members', requireWorkspaceContext, requirePermission('workspace.read'), workspaceController.handleGetMembers);

/**
 * @swagger
 * /api/workspaces/{workspaceId}/members/{userId}:
 *   delete:
 *     tags: [Workspaces]
 *     summary: Remove a member from the workspace
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: workspaceId
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Member removed
 */
router.delete('/:workspaceId/members/:userId', requireWorkspaceContext, requirePermission('members.remove'), workspaceController.handleRemoveMember);

/**
 * @swagger
 * /api/workspaces/{workspaceId}/members/{userId}/role:
 *   put:
 *     tags: [Workspaces]
 *     summary: Update a member's role
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: workspaceId
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [role_id]
 *             properties:
 *               role_id:
 *                 type: string
 *     responses:
 *       200:
 *         description: Role updated
 */
router.put('/:workspaceId/members/:userId/role', requireWorkspaceContext, requirePermission('members.update-role'), workspaceController.handleUpdateMemberRole);

/**
 * @swagger
 * /api/workspaces/{workspaceId}/invitations:
 *   post:
 *     tags: [Workspaces]
 *     summary: Invite a user to the workspace
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: workspaceId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, role_id]
 *             properties:
 *               email:
 *                 type: string
 *               role_id:
 *                 type: string
 *     responses:
 *       201:
 *         description: Invitation created
 */
router.post('/:workspaceId/invitations', requireWorkspaceContext, requirePermission('members.invite'), workspaceController.handleCreateInvitation);

/**
 * @swagger
 * /api/workspaces/{workspaceId}/invitations:
 *   get:
 *     tags: [Workspaces]
 *     summary: List pending invitations for the workspace
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: workspaceId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: List of pending invitations
 */
router.get('/:workspaceId/invitations', requireWorkspaceContext, requirePermission('members.invite'), workspaceController.handleListInvitations);

/**
 * @swagger
 * /api/workspaces/{workspaceId}/invitations/{id}:
 *   delete:
 *     tags: [Workspaces]
 *     summary: Revoke a pending invitation
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: workspaceId
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Invitation revoked
 */
router.delete('/:workspaceId/invitations/:id', requireWorkspaceContext, requirePermission('members.invite'), workspaceController.handleRevokeInvitation);

// ----------------------------------------------------------------------
// No Workspace Context Required (Accepting an invite)
// ----------------------------------------------------------------------

/**
 * @swagger
 * /api/invitations/{token}/accept:
 *   post:
 *     tags: [Workspaces]
 *     summary: Accept a workspace invitation
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: token
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Invitation accepted
 */
router.post('/invitations/:token/accept', workspaceController.handleAcceptInvitation);

export default router;
