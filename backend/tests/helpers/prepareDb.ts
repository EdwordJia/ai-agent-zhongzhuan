import './loadEnv';
import mysql from 'mysql2/promise';
import { execSync } from 'child_process';

async function ensureDatabase() {
  const dbUrl = process.env.DATABASE_URL || '';
  const match = dbUrl.match(/mysql:\/\/([^:]+):([^@]+)@([^:]+):(\d+)\/(.+)/);
  if (!match) throw new Error('DATABASE_URL 格式错误');
  const [, user, password, host, port, dbName] = match;
  const conn = await mysql.createConnection({ host, port: parseInt(port), user, password });
  await conn.execute(`CREATE DATABASE IF NOT EXISTS \`${dbName}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);
  await conn.end();
  console.log(`测试数据库 ${dbName} 已确保存在`);
}

async function runDbPush() {
  execSync('npx prisma db push --schema=src/prisma/schema.prisma --accept-data-loss', {
    stdio: 'inherit',
    cwd: process.cwd(),
    env: process.env,
  });
  console.log('数据库表结构已同步');
}

async function main() {
  await ensureDatabase();
  await runDbPush();
}

main().catch((err) => {
  console.error('准备测试数据库失败:', err);
  process.exit(1);
});
