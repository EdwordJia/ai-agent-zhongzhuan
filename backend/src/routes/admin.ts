import { Router } from 'express';
import { prisma } from '../prisma/client';
import { requireAdmin } from '../middleware/auth';
import type { AdminAuthRequest } from '../middleware/auth';

const router: Router = Router();

router.get('/dashboard', requireAdmin, async (req: AdminAuthRequest, res) => {
  try {
    const totalUsers = await prisma.users.count();
    const totalUsedAgg = await prisma.users.aggregate({ _sum: { total_used: true } });
    const totalUsed = totalUsedAgg._sum.total_used || 0;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayGenerations = await prisma.generation_logs.count({ where: { created_at: { gte: today } } });
    const totalPointsAgg = await prisma.users.aggregate({ _sum: { points: true } });
    const totalPoints = totalPointsAgg._sum.points || 0;
    const totalRedemption = await prisma.redemption_logs.aggregate({
      _sum: { points_after: true, points_before: true }
    });
    const totalIssued = (totalRedemption._sum.points_after || 0) - (totalRedemption._sum.points_before || 0);
    res.json({
      success: true,
      data: { totalUsers, totalUsed, todayGenerations, totalPoints, totalIssued }
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message || '获取仪表盘失败' });
  }
});

router.get('/users', requireAdmin, async (req: AdminAuthRequest, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const pageSize = Math.max(1, Math.min(100, parseInt(req.query.pageSize as string) || 20));
    const skip = (page - 1) * pageSize;
    const [users, total] = await Promise.all([
      prisma.users.findMany({
        orderBy: { created_at: 'desc' },
        skip,
        take: pageSize
      }),
      prisma.users.count()
    ]);
    res.json({
      success: true,
      data: { list: users, total, page, pageSize }
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message || '获取用户列表失败' });
  }
});

router.post('/users/:id/points', requireAdmin, async (req: AdminAuthRequest, res) => {
  try {
    const id = parseInt(req.params.id);
    const { delta, reason } = req.body;
    if (typeof delta !== 'number' || isNaN(delta)) {
      res.status(400).json({ success: false, message: 'delta 必须是数字' });
      return;
    }
    const user = await prisma.users.findUnique({ where: { id } });
    if (!user) {
      res.status(404).json({ success: false, message: '用户不存在' });
      return;
    }
    const newPoints = Math.max(0, user.points + delta);
    await prisma.users.update({
      where: { id },
      data: { points: newPoints, updated_at: new Date() }
    });
    res.json({ success: true, data: { id, points_before: user.points, points_after: newPoints, delta, reason } });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message || '操作失败' });
  }
});

router.post('/codes', requireAdmin, async (req: AdminAuthRequest, res) => {
  try {
    const { points, totalUses, count } = req.body;
    if (!points || !count || count < 1 || count > 1000) {
      res.status(400).json({ success: false, message: '参数无效' });
      return;
    }
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    const codes: string[] = [];
    const created = [];
    for (let i = 0; i < count; i++) {
      let code = '';
      for (let j = 0; j < 8; j++) {
        code += chars.charAt(Math.floor(Math.random() * chars.length));
      }
      if (codes.includes(code)) {
        i--;
        continue;
      }
      codes.push(code);
      created.push({
        code,
        points: parseInt(points),
        total_uses: parseInt(totalUses) || 1,
        created_by: req.admin!.id
      });
    }
    await prisma.redemption_codes.createMany({ data: created });
    const result = await prisma.redemption_codes.findMany({
      where: { code: { in: codes } },
      orderBy: { created_at: 'desc' }
    });
    res.json({ success: true, data: result });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message || '生成兑换码失败' });
  }
});

router.get('/codes', requireAdmin, async (req: AdminAuthRequest, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const pageSize = Math.max(1, Math.min(100, parseInt(req.query.pageSize as string) || 20));
    const skip = (page - 1) * pageSize;
    const [list, total] = await Promise.all([
      prisma.redemption_codes.findMany({ orderBy: { created_at: 'desc' }, skip, take: pageSize }),
      prisma.redemption_codes.count()
    ]);
    res.json({ success: true, data: { list, total, page, pageSize } });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message || '获取兑换码失败' });
  }
});

router.patch('/codes/:id/status', requireAdmin, async (req: AdminAuthRequest, res) => {
  try {
    const id = parseInt(req.params.id);
    const { is_active } = req.body;
    const code = await prisma.redemption_codes.update({
      where: { id },
      data: { is_active: !!is_active }
    });
    res.json({ success: true, data: code });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message || '更新失败' });
  }
});

router.get('/channels', requireAdmin, async (req: AdminAuthRequest, res) => {
  try {
    const channels = await prisma.channels.findMany({ orderBy: { priority: 'asc' } });
    const masked = channels.map(c => ({
      ...c,
      api_key: c.api_key ? c.api_key.slice(0, 6) + '****' + c.api_key.slice(-4) : null
    }));
    res.json({ success: true, data: masked });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message || '获取渠道失败' });
  }
});

router.post('/channels', requireAdmin, async (req: AdminAuthRequest, res) => {
  try {
    const { name, type, gateway_url, api_key, model, cost_per_image, daily_free_limit, priority } = req.body;
    if (!name || !type || !gateway_url || !model) {
      res.status(400).json({ success: false, message: '缺少必填字段' });
      return;
    }
    const channel = await prisma.channels.create({
      data: {
        name,
        type,
        gateway_url,
        api_key: api_key || null,
        model,
        cost_per_image: cost_per_image || 0,
        daily_free_limit: daily_free_limit || 0,
        priority: priority || 1
      }
    });
    res.json({ success: true, data: channel });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message || '创建渠道失败' });
  }
});

router.put('/channels/:id', requireAdmin, async (req: AdminAuthRequest, res) => {
  try {
    const id = parseInt(req.params.id);
    const { name, type, gateway_url, api_key, model, cost_per_image, daily_free_limit, is_active, priority } = req.body;
    const updateData: any = { updated_at: new Date() };
    if (name !== undefined) updateData.name = name;
    if (type !== undefined) updateData.type = type;
    if (gateway_url !== undefined) updateData.gateway_url = gateway_url;
    if (api_key !== undefined) updateData.api_key = api_key;
    if (model !== undefined) updateData.model = model;
    if (cost_per_image !== undefined) updateData.cost_per_image = cost_per_image;
    if (daily_free_limit !== undefined) updateData.daily_free_limit = daily_free_limit;
    if (is_active !== undefined) updateData.is_active = is_active;
    if (priority !== undefined) updateData.priority = priority;
    const channel = await prisma.channels.update({ where: { id }, data: updateData });
    res.json({ success: true, data: channel });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message || '更新渠道失败' });
  }
});

router.delete('/channels/:id', requireAdmin, async (req: AdminAuthRequest, res) => {
  try {
    const id = parseInt(req.params.id);
    await prisma.channels.delete({ where: { id } });
    res.json({ success: true, message: '删除成功' });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message || '删除渠道失败' });
  }
});

router.get('/logs/generations', requireAdmin, async (req: AdminAuthRequest, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const pageSize = Math.max(1, Math.min(100, parseInt(req.query.pageSize as string) || 20));
    const skip = (page - 1) * pageSize;
    const [list, total] = await Promise.all([
      prisma.generation_logs.findMany({
        orderBy: { created_at: 'desc' },
        skip,
        take: pageSize,
        include: { user: true, channel: true }
      }),
      prisma.generation_logs.count()
    ]);
    res.json({ success: true, data: { list, total, page, pageSize } });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message || '获取日志失败' });
  }
});

export default router;
