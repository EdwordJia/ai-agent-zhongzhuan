import { prisma } from '../prisma/client';

export async function addPoints(userId: number, points: number, reason?: string) {
  return prisma.$transaction(async (tx) => {
    const user = await tx.users.update({
      where: { id: userId },
      data: { points: { increment: points } }
    });
    return { success: true, points: user.points };
  });
}

export async function deductPoints(userId: number, points: number) {
  return prisma.$transaction(async (tx) => {
    const user = await tx.users.findUnique({ where: { id: userId } });
    if (!user) return { success: false, message: '用户不存在' };
    if (user.points < points) return { success: false, message: '积分不足' };
    const updated = await tx.users.update({
      where: { id: userId },
      data: { points: { decrement: points }, total_used: { increment: points } }
    });
    return { success: true, points: updated.points };
  });
}
