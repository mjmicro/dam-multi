import { Router } from 'express';
import { getHealth } from '../controllers/health-controller';

const router: Router = Router();

// GET /api/health — liveness check
router.get('/', getHealth);

export default router;
