import { Router } from 'express';
import { prisma } from '../prisma/client';
import { requireUser, requireUserFresh } from '../middleware/auth';
import type { UserAuthRequest } from '../middleware/auth';
import { redeemCode } from '../services/redemptionService';

const router: Router = Router();

router.get('/points', requireUserFresh, async (req: UserAuthRequest, res) => {
  try {
    const user = await prisma.users.findUnique({ where: { id: req.user!.id } });
    if (!user) {
      res.status(404).json({ success: false, message: '用户不存在' });
      return;
    }
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayCount = await prisma.generation_logs.count({
      where: {
        user_id: user.id,
        created_at: { gte: today },
        channel: { type: 'free' }
      }
    });
    res.json({
      success: true,
      data: {
        points: user.points,
        free_daily_used: todayCount,
        free_daily_limit: 5
      }
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message || '查询失败' });
  }
});

router.post('/redeem', requireUserFresh, async (req: UserAuthRequest, res) => {
  try {
    const { code } = req.body;
    if (!code) {
      res.status(400).json({ success: false, message: '兑换码不能为空' });
      return;
    }
    const result = await redeemCode(req.user!.id, code.toUpperCase().trim());
    if (!result.success) {
      res.status(400).json({ success: false, message: result.message });
      return;
    }
    res.json({ success: true, data: result.data });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message || '兑换失败' });
  }
});

export default router;
