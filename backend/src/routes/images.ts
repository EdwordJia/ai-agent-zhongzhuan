import { Router } from 'express';
import { prisma } from '../prisma/client';
import { requireUser, requireUserFresh } from '../middleware/auth';
import type { UserAuthRequest } from '../middleware/auth';
import { selectChannel, deductPoints } from '../services/channelService';
import { generateImage } from '../services/imageProxyService';

const router: Router = Router();

router.post('/generate', requireUserFresh, async (req: UserAuthRequest, res) => {
  try {
    const { prompt, n, size, quality, outputFormat, background } = req.body;
    if (!prompt) {
      res.status(400).json({ success: false, message: 'prompt 不能为空' });
      return;
    }
    const user = await prisma.users.findUnique({ where: { id: req.user!.id } });
    if (!user) {
      res.status(404).json({ success: false, message: '用户不存在' });
      return;
    }
    const count = Math.min(Math.max(1, parseInt(n) || 1), 10);
    const channel = await selectChannel(user.id, user.points, count);
    if (!channel) {
      res.status(400).json({ success: false, message: '当前无可用渠道，请检查积分或免费额度' });
      return;
    }
    const costPer = channel.cost_per_image || 0;
    const totalCost = costPer * count;
    if (channel.type === 'paid' && user.points < totalCost) {
      res.status(400).json({ success: false, message: '积分不足' });
      return;
    }
    if (channel.type === 'paid') {
      const deduct = await deductPoints(user.id, totalCost);
      if (!deduct.success) {
        res.status(400).json({ success: false, message: deduct.message });
        return;
      }
    }
    const result = await generateImage(channel, {
      prompt,
      n: count,
      size,
      quality,
      outputFormat,
      background
    });
    await prisma.generation_logs.create({
      data: {
        user_id: user.id,
        channel_id: channel.id,
        prompt,
        n: count,
        size: size || null,
        quality: quality || null,
        status: result.success ? 'success' : 'fail',
        points_cost: channel.type === 'paid' ? totalCost : 0,
        image_urls: result.success ? JSON.stringify(result.images) : null,
        error_msg: result.success ? null : result.message
      }
    });
    if (!result.success) {
      if (channel.type === 'paid') {
        await prisma.users.update({
          where: { id: user.id },
          data: { points: { increment: totalCost }, total_used: { decrement: totalCost } }
        });
      }
      res.status(500).json({ success: false, message: result.message });
      return;
    }
    const updatedUser = await prisma.users.findUnique({ where: { id: user.id } });
    res.json({
      success: true,
      data: {
        images: result.images,
        pointsRemaining: updatedUser?.points || 0
      }
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message || '生成失败' });
  }
});

export default router;
