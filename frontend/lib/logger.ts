// Simple console-based logger for serverless environment
// Replaces pino from automation service

type LogData = Record<string, unknown>

export function createJobLogger(jobName: string) {
  const prefix = `[${jobName}]`

  const formatLog = (level: string, data: LogData, msg?: string) => {
    const timestamp = new Date().toISOString()
    const dataStr = Object.keys(data).length > 0 ? JSON.stringify(data) : ''
    return `${timestamp} ${level} ${prefix} ${msg || ''} ${dataStr}`.trim()
  }

  return {
    info: (data: LogData, msg?: string) => {
      console.log(formatLog('INFO', data, msg))
    },
    warn: (data: LogData, msg?: string) => {
      console.warn(formatLog('WARN', data, msg))
    },
    error: (data: LogData, msg?: string) => {
      console.error(formatLog('ERROR', data, msg))
    },
    debug: (data: LogData, msg?: string) => {
      if (process.env.LOG_LEVEL === 'debug') {
        console.log(formatLog('DEBUG', data, msg))
      }
    },
  }
}

// Default logger instance
export const logger = createJobLogger('automation')
