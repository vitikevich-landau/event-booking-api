import env from '../config/env';

type LogLevel = 'error' | 'warn' | 'info' | 'debug';

const levels: Record<LogLevel, number> = {
  error: 0,
  warn: 1,
  info: 2,
  debug: 3,
};

class Logger {
  private level: number;

  constructor(level: LogLevel = 'info') {
    this.level = levels[level];
  }

  private log(level: LogLevel, message: string, meta?: unknown) {
    if (levels[level] <= this.level) {
      const timestamp = new Date().toISOString();
      const logMessage: Record<string, unknown> = {
        timestamp,
        level,
        message,
      };
      if (meta !== undefined && meta !== null) {
        logMessage.meta = meta;
      }
      console.log(JSON.stringify(logMessage));
    }
  }

  error(message: string, meta?: unknown) {
    this.log('error', message, meta);
  }

  warn(message: string, meta?: unknown) {
    this.log('warn', message, meta);
  }

  info(message: string, meta?: unknown) {
    this.log('info', message, meta);
  }

  debug(message: string, meta?: unknown) {
    this.log('debug', message, meta);
  }
}

export default new Logger(env.LOG_LEVEL);
