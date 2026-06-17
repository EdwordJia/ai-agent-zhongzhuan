import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import mysql from 'mysql2/promise';
import { execSync } from 'child_process';
import { prisma } from './prisma/client';
import authRoutes from './routes/auth';
import adminRoutes from './routes/admin';
import clientRoutes from './routes/client';
import imageRoutes from './routes/images';

const app = express();
const PORT = 3001;

app.use(cors({
  origin: ['http://localhost:5174', 'http://localhost:5180'],
  credentials: true
}));
app.use(express.json({ limit: '10mb' }));

app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/user', clientRoutes);
app.use('/api/images', imageRoutes);

app.get('/health', (_req, res) => {
  res.json({ success: true, message: 'ok' });
});

app.use((err: any, _req: any, res: any, _next: any) => {
  console.error(err);
  res.status(500).json({ success: false, message: err.message || '服务器内部错误' });
});

async function ensureDatabase() {
  const dbUrl = process.env.DATABASE_URL || '';
  const match = dbUrl.match(/mysql:\/\/([^:]+):([^@]+)@([^:]+):(\d+)\/(.+)/);
  if (!match) throw new Error('DATABASE_URL 格式错误');
  const [, user, password, host, port, dbName] = match;
  const conn = await mysql.createConnection({
    host,
    port: parseInt(port),
    user,
    password
  });
  await conn.execute(`CREATE DATABASE IF NOT EXISTS \`${dbName}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);
  await conn.end();
  console.log(`数据库 ${dbName} 已确保存在`);
}

async function checkTableExists(tableName: string): Promise<boolean> {
  try {
    const result = await prisma.$queryRawUnsafe(`SELECT 1 FROM \`${tableName}\` LIMIT 1`) as any[];
    return true;
  } catch {
    return false;
  }
}

async function runMigrate() {
  try {
    execSync('npx prisma migrate deploy --schema=src/prisma/schema.prisma', {
      stdio: 'inherit',
      cwd: process.cwd()
    });
    console.log('Migrate deploy 完成');
  } catch (err) {
    console.log('Migrate deploy 失败');
  }
  const hasAdmins = await checkTableExists('admins');
  if (!hasAdmins) {
    console.log('表不存在，使用 db push 初始化...');
    execSync('npx prisma db push --schema=src/prisma/schema.prisma --accept-data-loss', {
      stdio: 'inherit',
      cwd: process.cwd()
    });
    console.log('db push 完成');
  }
}

async function runSeed() {
  const { main } = await import('./seed');
  await main();
}

async function start() {
  try {
    await ensureDatabase();
    await runMigrate();
    await runSeed();
    app.listen(PORT, () => {
      console.log(`后端服务已启动: http://localhost:${PORT}`);
    });
  } catch (err) {
    console.error('启动失败:', err);
    process.exit(1);
  }
}

start();
