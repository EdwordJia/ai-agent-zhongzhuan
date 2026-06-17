import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { prisma } from '../prisma/client';
import { requireAdmin } from '../middleware/auth';
import type { AdminAuthRequest } from '../middleware/auth';

const router: Router = Router();
const JWT_SECRET = process.env.JWT_SECRET || 'openclaw-secret-key-change-in-production';

router.post('/admin/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      res.status(400).json({ success: false, message: '用户名和密码不能为空' });
      return;
    }
    const admin = await prisma.admins.findUnique({ where: { username } });
    if (!admin) {
      res.status(401).json({ success: false, message: '用户名或密码错误' });
      return;
    }
    const valid = await bcrypt.compare(password, admin.password_hash);
    if (!valid) {
      res.status(401).json({ success: false, message: '用户名或密码错误' });
      return;
    }
    const token = jwt.sign(
      { id: admin.id, username: admin.username, role: admin.role, type: 'admin' },
      JWT_SECRET,
      { expiresIn: '7d' }
    );
    res.json({
      success: true,
      data: { token, admin: { id: admin.id, username: admin.username, role: admin.role } }
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message || '登录失败' });
  }
});

router.post('/machine', async (req, res) => {
  try {
    const { machine_id } = req.body;
    if (!machine_id) {
      res.status(400).json({ success: false, message: 'machine_id 不能为空' });
      return;
    }
    let user = await prisma.users.findUnique({ where: { machine_id } });
    if (!user) {
      user = await prisma.users.create({ data: { machine_id } });
    }
    const token = jwt.sign(
      { id: user.id, machine_id: user.machine_id, points: user.points, type: 'user' },
      JWT_SECRET,
      { expiresIn: '30d' }
    );
    res.json({
      success: true,
      data: { token, user: { id: user.id, machine_id: user.machine_id, points: user.points, free_daily_count: user.free_daily_count } }
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message || '认证失败' });
  }
});

router.get('/me', requireAdmin, async (req: AdminAuthRequest, res) => {
  res.json({ success: true, data: req.admin });
});

export default router;
