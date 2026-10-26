export interface AppConfig {
  port: number;
  host: string;
  databaseUrl: string;
  engineUrl: string;
  corsOrigin: string;
  nodeEnv: string;
}

export const config: AppConfig = {
  port: parseInt(process.env.PORT || '3001', 10),
  host: process.env.HOST || '0.0.0.0',
  databaseUrl: process.env.DATABASE_URL || 'postgresql://rajat@localhost:5433/lifeline_dev',
  engineUrl: process.env.ENGINE_URL || 'http://127.0.0.1:8081',
  corsOrigin: process.env.CORS_ORIGIN || '*',
  nodeEnv: process.env.NODE_ENV || 'development'
};
