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

    const result: any = await tx.$executeRaw`
      UPDATE users
      SET points = points - ${points},
          total_used = total_used + ${points},
          updated_at = NOW()
      WHERE id = ${userId} AND points >= ${points}
    `;

    // Prisma 的 $executeRaw 返回 affectedRows（mysql2 驱动下是结果对象的 affectedRows 字段）
    const affectedRows = Number(result ?? 0);
    if (affectedRows === 0) {
      return { success: false, message: '积分不足' };
    }

    const updated = await tx.users.findUnique({
      where: { id: userId },
      select: { points: true }
    });

    return { success: true, points: updated?.points ?? 0 };
  });
}
