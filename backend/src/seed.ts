import 'dotenv/config';
import bcrypt from 'bcryptjs';
import { prisma } from './prisma/client';

export async function main() {
  const defaultPassword = process.env.ADMIN_DEFAULT_PASSWORD || 'admin123';
  const existing = await prisma.admins.findUnique({ where: { username: 'admin' } });
  if (!existing) {
    const hash = await bcrypt.hash(defaultPassword, 10);
    await prisma.admins.create({
      data: { username: 'admin', password_hash: hash, role: 'super' }
    });
    console.log('默认管理员已创建: admin /', defaultPassword);
  } else {
    console.log('默认管理员已存在');
  }
  const paidChannel = await prisma.channels.findFirst({ where: { name: 'GPT Image 2' } });
  if (!paidChannel) {
    await prisma.channels.create({
      data: {
        name: 'GPT Image 2',
        type: 'paid',
        gateway_url: 'https://www.fhl.mom/',
        api_key: 'sk-0d78ed4934dff12aee5c01366fe4e646540e6bbdc344c90ec17c41f0ce468f40',
        model: 'gpt-image-2',
        cost_per_image: 25,
        priority: 1
      }
    });
    console.log('付费渠道已创建');
  } else {
    console.log('付费渠道已存在');
  }
  const freeChannel = await prisma.channels.findFirst({ where: { name: 'Free Image Channel' } });
  if (!freeChannel) {
    await prisma.channels.create({
      data: {
        name: 'Free Image Channel',
        type: 'free',
        gateway_url: 'https://www.fhl.mom/',
        api_key: null,
        model: 'gpt-image-1',
        cost_per_image: 0,
        daily_free_limit: 5,
        priority: 2
      }
    });
    console.log('免费渠道已创建');
  } else {
    console.log('免费渠道已存在');
  }
}

if (require.main === module) {
  main()
    .then(() => {
      console.log('Seed 完成');
      process.exit(0);
    })
    .catch((err) => {
      console.error('Seed 失败:', err);
      process.exit(1);
    });
}
