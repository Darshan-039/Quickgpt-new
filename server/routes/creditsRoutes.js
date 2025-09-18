import express from 'express';
const creditRouter = express.Router();

import { getPlans, purchasePlan } from '../controllers/creditController.js';
import { protect } from '../middlewares/auth.js'


creditRouter.get('/plan', getPlans);
creditRouter.post('/purchase', protect, purchasePlan)

export default creditRouter;