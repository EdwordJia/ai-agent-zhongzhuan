import { prisma } from '../prisma/client';

export async function generateCode(): Promise<string> {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 8; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

export async function redeemCode(userId: number, code: string) {
  return prisma.$transaction(async (tx) => {
    const rc = await tx.redemption_codes.findUnique({ where: { code } });
    if (!rc) return { success: false, message: '兑换码不存在' };
    if (!rc.is_active) return { success: false, message: '兑换码已禁用' };
    if (rc.used_count >= rc.total_uses) return { success: false, message: '兑换码已被用完' };
    if (rc.expires_at && new Date() > rc.expires_at) return { success: false, message: '兑换码已过期' };
    const user = await tx.users.findUnique({ where: { id: userId } });
    if (!user) return { success: false, message: '用户不存在' };
    const pointsBefore = user.points;
    const pointsAfter = pointsBefore + rc.points;
    await tx.users.update({
      where: { id: userId },
      data: { points: pointsAfter }
    });
    await tx.redemption_codes.update({
      where: { id: rc.id },
      data: { used_count: { increment: 1 } }
    });
    await tx.redemption_logs.create({
      data: {
        code_id: rc.id,
        user_id: userId,
        points_before: pointsBefore,
        points_after: pointsAfter
      }
    });
    return {
      success: true,
      data: { points: rc.points, pointsAfter }
    };
  });
}
