import { DataSource, DataSourceOptions } from "typeorm";
import { config } from "dotenv";

config();

export const typeOrmModuleOptions: DataSourceOptions = {
  type: "postgres",
  host: process.env.DATABASE_HOST || "localhost",
  port: parseInt(process.env.DATABASE_PORT) || 5432,
  username: process.env.DATABASE_USER || "postgres",
  password: process.env.DATABASE_PASSWORD || "postgres",
  database: process.env.DATABASE_NAME || "block-explorer",
  poolSize: parseInt(process.env.DATABASE_CONNECTION_POOL_SIZE, 10) || 100,
  extra: {
    idleTimeoutMillis: parseInt(process.env.DATABASE_CONNECTION_IDLE_TIMEOUT_MS, 10) || 12000,
  },
  applicationName: "block-explorer-worker",
  migrationsRun: false,
  synchronize: false,
  logging: false,
  subscribers: [],
  migrations: ["dist/migrations/*.js"],
};

export const typeOrmReferModuleOptions: DataSourceOptions = {
  type: "postgres",
  host: process.env.REFER_DATABASE_HOST || "localhost",
  port: parseInt(process.env.REFER_DATABASE_PORT) || 5432,
  username: process.env.REFER_DATABASE_USER || "postgres",
  password: process.env.REFER_DATABASE_PASSWORD || "postgres",
  database: process.env.REFER_DATABASE_NAME || "referdb",
  poolSize: parseInt(process.env.REFER_DATABASE_CONNECTION_POOL_SIZE, 10) || 100,
  extra: {
    idleTimeoutMillis: parseInt(process.env.REFER_DATABASE_CONNECTION_IDLE_TIMEOUT_MS, 10) || 12000,
  },
  applicationName: "block-explorer-worker",
  migrationsRun: false,
  synchronize: false,
  logging: false,
  subscribers: [],
  migrations: [],
};

const typeOrmCliDataSource = new DataSource({
  ...typeOrmModuleOptions,
  entities: ["src/**/*.entity.{ts,js}"],
  migrations: ["src/migrations/*.ts"],
});

export default typeOrmCliDataSource;
