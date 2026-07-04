import 'dotenv/config';
import { DataSource } from 'typeorm';

export default new DataSource({
  type: 'postgres',

  url: process.env.DATABASE_PUBLIC_URL,

  host: process.env.DATABASE_PUBLIC_URL ? undefined : process.env.DB_HOST,

  port: process.env.DATABASE_PUBLIC_URL
    ? undefined
    : Number(process.env.DB_PORT),

  username: process.env.DATABASE_PUBLIC_URL ? undefined : process.env.DB_USER,

  password: process.env.DATABASE_PUBLIC_URL
    ? undefined
    : process.env.DB_PASSWORD,

  database: process.env.DATABASE_PUBLIC_URL ? undefined : process.env.DB_NAME,

  ssl: process.env.DATABASE_PUBLIC_URL ? { rejectUnauthorized: false } : false,

  entities: ['dist/**/*.entity.js'],
  migrations: ['dist/migrations/*.js'],

  synchronize: true,
});
