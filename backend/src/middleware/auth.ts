import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { prisma } from '../prisma/client';

const JWT_SECRET = process.env.JWT_SECRET || 'openclaw-secret-key-change-in-production';

export interface AdminAuthRequest extends Request {
  admin?: { id: number; username: string; role: string };
}

export interface UserAuthRequest extends Request {
  user?: { id: number; machine_id: string; points: number };
}

export function requireAdmin(req: AdminAuthRequest, res: Response, next: NextFunction): void {
  const auth = req.headers.authorization;
  if (!auth || !auth.startsWith('Bearer ')) {
    res.status(401).json({ success: false, message: '未提供认证令牌' });
    return;
  }
  const token = auth.slice(7);
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as { id: number; username: string; role: string; type: string };
    if (decoded.type !== 'admin') {
      res.status(403).json({ success: false, message: '需要管理员权限' });
      return;
    }
    req.admin = { id: decoded.id, username: decoded.username, role: decoded.role };
    next();
  } catch {
    res.status(401).json({ success: false, message: '令牌无效或已过期' });
  }
}

export function requireUser(req: UserAuthRequest, res: Response, next: NextFunction): void {
  const auth = req.headers.authorization;
  if (!auth || !auth.startsWith('Bearer ')) {
    res.status(401).json({ success: false, message: '未提供认证令牌' });
    return;
  }
  const token = auth.slice(7);
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as { id: number; machine_id: string; points: number; type: string };
    if (decoded.type !== 'user') {
      res.status(403).json({ success: false, message: '需要用户权限' });
      return;
    }
    req.user = { id: decoded.id, machine_id: decoded.machine_id, points: decoded.points };
    next();
  } catch {
    res.status(401).json({ success: false, message: '令牌无效或已过期' });
  }
}

export async function requireUserFresh(req: UserAuthRequest, res: Response, next: NextFunction): Promise<void> {
  const auth = req.headers.authorization;
  if (!auth || !auth.startsWith('Bearer ')) {
    res.status(401).json({ success: false, message: '未提供认证令牌' });
    return;
  }
  const token = auth.slice(7);
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as { id: number; machine_id: string; type: string };
    if (decoded.type !== 'user') {
      res.status(403).json({ success: false, message: '需要用户权限' });
      return;
    }
    const user = await prisma.users.findUnique({ where: { id: decoded.id } });
    if (!user) {
      res.status(401).json({ success: false, message: '用户不存在' });
      return;
    }
    req.user = { id: user.id, machine_id: user.machine_id, points: user.points };
    next();
  } catch {
    res.status(401).json({ success: false, message: '令牌无效或已过期' });
  }
}
