import { DataSource, DataSourceOptions } from "typeorm";
import { config } from "dotenv";

config();

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
  applicationName: "nova-point-refer",
  migrationsRun: false,
  synchronize: false,
  logging: false,
  subscribers: [],
  migrations: [],
};

export const typeOrmLrtModuleOptions: DataSourceOptions = {
  type: "postgres",
  host: process.env.LRT_DATABASE_HOST || "localhost",
  port: parseInt(process.env.LRT_DATABASE_PORT) || 5432,
  username: process.env.LRT_DATABASE_USER || "postgres",
  password: process.env.LRT_DATABASE_PASSWORD || "postgres",
  database: process.env.LRT_DATABASE_NAME || "referdb",
  poolSize: parseInt(process.env.LRT_DATABASE_CONNECTION_POOL_SIZE, 10) || 100,
  extra: {
    idleTimeoutMillis: parseInt(process.env.LRT_DATABASE_CONNECTION_IDLE_TIMEOUT_MS, 10) || 12000,
  },
  applicationName: "nova-point-lrt",
  migrationsRun: false,
  synchronize: false,
  logging: false,
  subscribers: [],
  migrations: [],
};

export const typeOrmExplorerModuleOptions: DataSourceOptions = {
  type: "postgres",
  host: process.env.EXPLORER_DATABASE_HOST || "localhost",
  port: parseInt(process.env.EXPLORER_DATABASE_PORT) || 5432,
  username: process.env.EXPLORER_DATABASE_USER || "postgres",
  password: process.env.EXPLORER_DATABASE_PASSWORD || "postgres",
  database: process.env.EXPLORER_DATABASE_NAME || "referdb",
  poolSize: parseInt(process.env.EXPLORER_DATABASE_CONNECTION_POOL_SIZE, 10) || 100,
  extra: {
    idleTimeoutMillis: parseInt(process.env.EXPLORER_DATABASE_CONNECTION_IDLE_TIMEOUT_MS, 10) || 12000,
  },
  applicationName: "nova-point-explorer",
  migrationsRun: false,
  synchronize: false,
  logging: false,
  subscribers: [],
  migrations: [],
};

const typeOrmCliDataSource = new DataSource({
  ...typeOrmLrtModuleOptions,
  entities: ["src/**/*.entity.{ts,js}"],
  migrations: ["src/migrations/*.ts"],
});

export default typeOrmCliDataSource;
