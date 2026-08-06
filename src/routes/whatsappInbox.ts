import { Router, Request, Response } from 'express';
import { WhatsAppInboxService } from '../services/whatsappInbox.service';
import { authGuard } from '../middleware/authGuard';

export const whatsappInboxRouter = Router();

// GET /api/whatsapp/conversations - List conversations
whatsappInboxRouter.get('/conversations', authGuard, async (req: Request, res: Response): Promise<void> => {
  try {
    const user = (req as any).user;
    // company_id and role come from app_metadata via authGuard. The old
    // user_metadata fallback was writable by the signed-in user, so it would
    // have let anyone move themselves into another tenant or promote their own
    // role.
    const companyId = user?.company_id;
    const agentId = user?.id;
    const userRole = user?.role || 'telecaller';
    const { status } = req.query;

    if (!companyId) {
      res.status(400).json({ error: 'Missing companyId' });
      return;
    }

    const conversations = await WhatsAppInboxService.getConversations(
      companyId,
      agentId,
      status as string,
      userRole
    );
    res.json({ conversations });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to fetch conversations' });
  }
});

// GET /api/whatsapp/conversations/:id/messages - List messages for conversation
whatsappInboxRouter.get('/conversations/:id/messages', authGuard, async (req: Request, res: Response): Promise<void> => {
  try {
    const user = (req as any).user;
    const companyId = user?.company_id;
    const conversationId = req.params.id;

    if (!companyId || !conversationId) {
      res.status(400).json({ error: 'Missing mandatory parameters' });
      return;
    }

    const messages = await WhatsAppInboxService.getMessages(companyId, conversationId);
    res.json({ messages });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to fetch messages' });
  }
});

// POST /api/whatsapp/conversations/:id/messages - Send outbound message
whatsappInboxRouter.post('/conversations/:id/messages', authGuard, async (req: Request, res: Response): Promise<void> => {
  try {
    const user = (req as any).user;
    const companyId = user?.company_id;
    const conversationId = req.params.id;
    const senderPhone = user?.email || 'System Desk';
    const { messageText, templateName } = req.body;

    if (!companyId || !conversationId || !messageText) {
      res.status(400).json({ error: 'Missing messageText or conversationId' });
      return;
    }

    const result = await WhatsAppInboxService.sendMessage(
      companyId,
      conversationId,
      senderPhone,
      messageText,
      templateName
    );

    if (!result.success) {
      res.status(500).json({ error: result.error });
      return;
    }

    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to send message' });
  }
});

// POST /api/whatsapp/conversations/:id/assign - Reassign conversation
whatsappInboxRouter.post('/conversations/:id/assign', authGuard, async (req: Request, res: Response): Promise<void> => {
  try {
    const user = (req as any).user;
    const companyId = user?.company_id;
    const conversationId = req.params.id;
    const { assignedAgentId } = req.body;

    if (!companyId || !conversationId || !assignedAgentId) {
      res.status(400).json({ error: 'Missing assignedAgentId' });
      return;
    }

    const success = await WhatsAppInboxService.assignConversation(companyId, conversationId, assignedAgentId);
    res.json({ success });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to reassign conversation' });
  }
});

// POST /api/whatsapp/conversations/:id/status - Update conversation status
whatsappInboxRouter.post('/conversations/:id/status', authGuard, async (req: Request, res: Response): Promise<void> => {
  try {
    const user = (req as any).user;
    const companyId = user?.company_id;
    const conversationId = req.params.id;
    const { status } = req.body;

    if (!companyId || !conversationId || !['open', 'pending', 'closed'].includes(status)) {
      res.status(400).json({ error: 'Invalid status' });
      return;
    }

    const success = await WhatsAppInboxService.updateStatus(companyId, conversationId, status);
    res.json({ success });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to update status' });
  }
});
