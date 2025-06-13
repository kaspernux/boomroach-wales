import express from 'express';
import { PrismaClient } from '@prisma/client';
import { logger } from '../../../shared/utils/logger';
import { wsService } from '../services/websocket';
import { notifyTradeExecution, notifyProfitLoss } from '../services/telegram-bot';
import { Router } from 'express';
import { HydraBotService } from '../services/hydra-bot';
import { TelegramService } from '../services/telegram-bot';
import { authenticateToken, authMiddleware, requireAdmin, requireVerified, requireLevel } from '../middleware/auth';


import { asyncWrapper, createValidationError} from "../middleware/error-handler";
import { mlTradingService } from "../services/ml-trading";


const router = express.Router();
const prisma = new PrismaClient();

router.use(authenticateToken);
router.use(requireVerified);
router.use(requireLevel);

// Mock data store
let models: any[] = [];
let idCounter = 1;

// GET /models : liste des modèles/versions
router.get('/models', (req: Request, res: Response) => {
    res.json(models);
});

// POST /models : ajout d’un modèle/version
router.post('/models', (req: Request, res: Response) => {
    const model = { id: idCounter++, ...req.body, active: false, versions: [req.body.version] };
    models.push(model);
    res.status(201).json(model);
});

// PUT /models/:id : mise à jour (activation, rollback, métadonnées)
router.put('/models/:id', (req: Request, res: Response) => {
    const id = parseInt(req.params.id, 10);
    const model = models.find(m => m.id === id);
    if (!model) return res.status(404).json({ error: 'Model not found' });
    Object.assign(model, req.body);
    res.json(model);
});

// DELETE /models/:id : suppression
router.delete('/models/:id', (req: Request, res: Response) => {
    const id = parseInt(req.params.id, 10);
    models = models.filter(m => m.id !== id);
    res.status(204).send();
});

// POST /models/:id/activate : activer une version
router.post('/models/:id/activate', (req: Request, res: Response) => {
    const id = parseInt(req.params.id, 10);
    const model = models.find(m => m.id === id);
    if (!model) return res.status(404).json({ error: 'Model not found' });
    model.active = true;
    res.json(model);
});

// POST /models/:id/rollback : rollback à une version précédente
router.post('/models/:id/rollback', (req: Request, res: Response) => {
    const id = parseInt(req.params.id, 10);
    const { version } = req.body;
    const model = models.find(m => m.id === id);
    if (!model) return res.status(404).json({ error: 'Model not found' });
    if (!model.versions.includes(version)) return res.status(400).json({ error: 'Version not found' });
    model.version = version;
    res.json(model);
});

export default router;