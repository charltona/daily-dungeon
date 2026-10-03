import { Router, Request, Response } from 'express';
import { OAuth2Client } from 'google-auth-library';
import jwt from 'jsonwebtoken';
import { db, users, characters } from '../db/index.js';
import { eq } from 'drizzle-orm';
import crypto from 'crypto';

export const authRouter = Router();

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const JWT_SECRET = process.env.JWT_SECRET || 'fallback-secret-do-not-use-in-prod';

if (!GOOGLE_CLIENT_ID) {
  console.warn('⚠️ GOOGLE_CLIENT_ID is not set in environment variables');
}

const client = new OAuth2Client(GOOGLE_CLIENT_ID);

// 1. Google ID Token Verification (Login / Link)
authRouter.post('/google', async (req: Request, res: Response) => {
  try {
    const { credential, linkGuestId } = req.body;

    if (!credential) {
      return res.status(400).json({ error: 'Missing Google credential' });
    }

    const ticket = await client.verifyIdToken({
      idToken: credential,
      audience: GOOGLE_CLIENT_ID,
    });

    const payload = ticket.getPayload();
    if (!payload || !payload.email) {
      return res.status(400).json({ error: 'Invalid Google payload' });
    }

    const email = payload.email;
    const googleId = payload.sub;
    const displayName = payload.name || 'Hero';

    // Check if user already exists by Google ID or Email
    let user = await db.query.users.findFirst({
      where: eq(users.email, email),
    });

    if (!user) {
      // Handle Guest Linking (if a guest token was passed up)
      if (linkGuestId) {
        // Find the guest user and upgrade them
        const guestUser = await db.query.users.findFirst({
          where: eq(users.id, linkGuestId),
        });

        if (guestUser && guestUser.isGuest) {
          const [updatedUser] = await db.update(users)
            .set({
              email: email,
              oauthProvider: 'google',
              oauthId: googleId,
              displayName: displayName, // Or keep their guest name
              isGuest: false,
              lastLoginAt: new Date(),
            })
            .where(eq(users.id, guestUser.id))
            .returning();
          user = updatedUser;
        }
      }

      // If still no user, create a new permanent account
      if (!user) {
        const [newUser] = await db.insert(users).values({
          displayName,
          email,
          oauthProvider: 'google',
          oauthId: googleId,
          isGuest: false,
        }).returning();
        user = newUser;
      }
    } else {
      // Update last login
      await db.update(users)
        .set({ lastLoginAt: new Date() })
        .where(eq(users.id, user.id));
    }

    // Generate JWT
    const token = jwt.sign(
      { userId: user.id, isGuest: user.isGuest },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    // Fetch character if they have one
    const character = await db.query.characters.findFirst({
      where: eq(characters.userId, user.id),
    });

    res.json({ token, user, character });
  } catch (error) {
    console.error('[Auth] Google verification failed:', error);
    res.status(401).json({ error: 'Authentication failed' });
  }
});

// 2. Play as Guest
authRouter.post('/guest', async (req: Request, res: Response) => {
  try {
    const randomSuffix = crypto.randomBytes(2).toString('hex');
    const guestName = `Guest_${randomSuffix}`;

    const [guestUser] = await db.insert(users).values({
      displayName: guestName,
      isGuest: true,
    }).returning();

    const token = jwt.sign(
      { userId: guestUser.id, isGuest: true },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    // Fetch character if they have one (they won't for new guests, but for consistency)
    const character = await db.query.characters.findFirst({
      where: eq(characters.userId, guestUser.id),
    });

    res.json({ token, user: guestUser, character });
  } catch (error) {
    console.error('[Auth] Guest creation failed:', error);
    res.status(500).json({ error: 'Failed to create guest session' });
  }
});
