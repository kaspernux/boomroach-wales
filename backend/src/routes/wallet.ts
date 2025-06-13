import nacl from 'tweetnacl';
import bs58 from 'bs58';
import { Buffer } from 'buffer';
import { PrismaClient } from '@prisma/client';
import express from 'express'
import { verifySignature } from '../../../shared/utils/verifySignature'
import bot from '@/services/telegram-bot';
import { authenticateToken, authMiddleware, requireAdmin, requireVerified, requireLevel } from '../middleware/auth';

// The Telegram bot only generates the code and sends the URL.
  // The actual verification and DB update should be implemented in the web server.

  // --- WEB ENDPOINT EXAMPLE (to be placed in your Express backend) ---
  // This is NOT part of the bot file, but for your backend (e.g. src/routes/wallet.ts):

  

  // In-memory store for wallet codes (replace with Redis or DB in production)
  const WALLET_CODES: Map<number, string> = new Map();

  const prisma = new PrismaClient()
  const router = express.Router()

  router.use(authenticateToken);
  router.use(requireVerified);
  router.use(requireLevel);

  // POST /api/wallet-connect
  router.post('/wallet-connect', async (req, res) => {
    const { code, telegramId, wallet, signature } = req.body
    // 1. Check code matches what was generated for this Telegram user
    if (!WALLET_CODES.has(Number(telegramId)) || WALLET_CODES.get(Number(telegramId)) !== code) {
      return res.status(400).json({ error: 'Invalid code' })
    }
    // 2. Verify wallet signature (implement for Solana)
    const valid = await verifySignature(wallet, code, signature)
    if (!valid) return res.status(400).json({ error: 'Invalid signature' })

    // 3. Update user in DB
    await prisma.user.upsert({
      where: { telegramId: Number(telegramId) },
      update: { wallet },
      create: { telegramId: Number(telegramId), wallet }
    })

    // 4. Optionally, notify user via Telegram bot
    await bot.sendMessage(Number(telegramId), "✅ Wallet linked successfully!")

    // 5. Remove code (one-time use)
    WALLET_CODES.delete(Number(telegramId))

    res.json({ success: true })
  })

  export default router
 

// Verifies a Solana wallet signature for the given code (message)
async function verifySignature(wallet: string, code: string, signature: string): Promise<boolean> {
    try {
        const publicKey = bs58.decode(wallet);
        const sig = bs58.decode(signature);
        const message = Buffer.from(code);

        return nacl.sign.detached.verify(message, sig, publicKey);
    } catch (e) {
        return false;
    }
}
// See above for a secure implementation. The bot itself does not verify or link wallets.