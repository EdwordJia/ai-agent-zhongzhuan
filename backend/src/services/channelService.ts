import { prisma } from '../prisma/client';

export async function selectChannel(userId: number, points: number, count: number) {
  // 有积分的用户优先使用付费渠道（质量更高）
  const paidChannels = await prisma.channels.findMany({
    where: { type: 'paid', is_active: true },
    orderBy: { priority: 'asc' }
  });
  for (const ch of paidChannels) {
    const cost = (ch.cost_per_image || 0) * count;
    if (points >= cost) {
      return ch;
    }
  }

  // 无积分或积分不足时 fallback 到免费渠道
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const freeChannels = await prisma.channels.findMany({
    where: { type: 'free', is_active: true },
    orderBy: { priority: 'asc' }
  });
  for (const ch of freeChannels) {
    const todayCount = await prisma.generation_logs.count({
      where: {
        user_id: userId,
        channel_id: ch.id,
        created_at: { gte: today }
      }
    });
    if (todayCount + count <= (ch.daily_free_limit || 0)) {
      return ch;
    }
  }
  return null;
}

export { deductPoints } from './pointsService';
