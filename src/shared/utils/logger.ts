interface LogEntry {
  timestamp: Date;
  level: 'info' | 'warn' | 'error' | 'success';
  message: string;
  details?: string;
}

class Logger {
  private logs: LogEntry[] = [];
  private maxLogs = 500; // Keep last 500 logs

  log(level: LogEntry['level'], message: string, details?: string) {
    const entry: LogEntry = {
      timestamp: new Date(),
      level,
      message,
      details,
    };

    this.logs.push(entry);

    // Keep only last maxLogs entries
    if (this.logs.length > this.maxLogs) {
      this.logs = this.logs.slice(-this.maxLogs);
    }

    // Also log to console with color
    const colors = {
      info: '\x1b[36m',    // Cyan
      warn: '\x1b[33m',    // Yellow
      error: '\x1b[31m',   // Red
      success: '\x1b[32m', // Green
    };
    const reset = '\x1b[0m';
    console.log(`${colors[level]}[${level.toUpperCase()}]${reset} ${message}${details ? ` - ${details}` : ''}`);
  }

  info(message: string, details?: string) {
    this.log('info', message, details);
  }

  warn(message: string, details?: string) {
    this.log('warn', message, details);
  }

  error(message: string, details?: string) {
    this.log('error', message, details);
  }

  success(message: string, details?: string) {
    this.log('success', message, details);
  }

  getLogs(limit?: number, level?: LogEntry['level']): LogEntry[] {
    let filteredLogs = [...this.logs];

    if (level) {
      filteredLogs = filteredLogs.filter(log => log.level === level);
    }

    if (limit) {
      filteredLogs = filteredLogs.slice(-limit);
    }

    return filteredLogs.reverse(); // Most recent first
  }

  clear() {
    this.logs = [];
  }
}

export const logger = new Logger();
export type { LogEntry };

/**
 * Extract error message from unknown error type
 */
export function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
