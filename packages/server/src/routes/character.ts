import { Router, Request, Response } from 'express';
import { db, characters } from '../db/index.js';
import { requireAuth } from '../middleware.js';
import { eq } from 'drizzle-orm';

export const characterRouter = Router();

// Create a character for the authenticated user
characterRouter.post('/', requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    const { name, classType } = req.body;

    if (!name || !classType) {
      return res.status(400).json({ error: 'Name and classType are required' });
    }

    // Check if user already has a character (Milestone 1 only allows 1 char per user)
    const existing = await db.query.characters.findFirst({
      where: eq(characters.userId, userId),
    });

    if (existing) {
      return res.status(400).json({ error: 'User already has a character' });
    }

    const [newChar] = await db.insert(characters).values({
      userId,
      name,
      classType,
      level: 1,
      xp: 0,
      inventoryJson: [],
    }).returning();

    res.json(newChar);
  } catch (err) {
    console.error('[Character] Creation failed:', err);
    res.status(500).json({ error: 'Failed to create character' });
  }
});
