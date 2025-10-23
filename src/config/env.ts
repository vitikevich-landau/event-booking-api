import { config } from 'dotenv';
import { envSchema, EnvConfig } from '../validators';

config();

let envConfig: EnvConfig;

try {
  envConfig = envSchema.parse(process.env);
} catch (error) {
  console.error('❌ Invalid environment variables:', error);
  process.exit(1);
}

export default envConfig;
