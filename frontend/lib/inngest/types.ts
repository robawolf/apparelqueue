export type Job = {
  name: string
  schedule: string
  enabled: boolean
  running: boolean
}

export type JobRun = {
  runId: string
  jobName: string
  status: 'pending' | 'running' | 'completed' | 'failed'
  startedAt: string
  completedAt?: string
  durationMs?: number
  error?: string
  result?: string | Record<string, unknown>
}
