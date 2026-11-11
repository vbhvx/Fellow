type Level = 'debug' | 'info' | 'warn' | 'error';

const LEVELS: Record<Level, number> = { debug: 10, info: 20, warn: 30, error: 40 };

function threshold(): number {
  const configured = process.env.LOG_LEVEL as Level | undefined;
  if (configured && configured in LEVELS) return LEVELS[configured];
  if (process.env.NODE_ENV === 'test') return LEVELS.warn;
  return process.env.NODE_ENV === 'production' ? LEVELS.info : LEVELS.debug;
}

function serializeError(err: unknown) {
  if (err instanceof Error) {
    return { name: err.name, message: err.message, stack: err.stack };
  }
  return err;
}

// One JSON object per line: grep-able locally, and parsed natively by Vercel, Datadog, Loki, etc.
function write(level: Level, msg: string, fields?: Record<string, unknown>) {
  if (LEVELS[level] < threshold()) return;
  const entry: Record<string, unknown> = { level, time: new Date().toISOString(), msg };
  if (fields) {
    for (const [key, value] of Object.entries(fields)) {
      entry[key] = key === 'err' ? serializeError(value) : value;
    }
  }
  const line = JSON.stringify(entry);
  if (level === 'error' || level === 'warn') console.error(line);
  else console.log(line);
}

export interface Logger {
  debug(msg: string, fields?: Record<string, unknown>): void;
  info(msg: string, fields?: Record<string, unknown>): void;
  warn(msg: string, fields?: Record<string, unknown>): void;
  error(msg: string, fields?: Record<string, unknown>): void;
  child(bindings: Record<string, unknown>): Logger;
}

function createLogger(bindings: Record<string, unknown> = {}): Logger {
  const log = (level: Level) => (msg: string, fields?: Record<string, unknown>) =>
    write(level, msg, { ...bindings, ...fields });
  return {
    debug: log('debug'),
    info: log('info'),
    warn: log('warn'),
    error: log('error'),
    child: (extra) => createLogger({ ...bindings, ...extra }),
  };
}

export const logger = createLogger();
