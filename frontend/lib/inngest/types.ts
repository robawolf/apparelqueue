// Types for Inngest job API responses

export interface Job {
  name: string
  schedule: string
  enabled: boolean
  running: boolean
}

export interface JobRun {
  runId: string
  jobName: string
  status: 'pending' | 'running' | 'completed' | 'failed'
  startedAt: string
  completedAt?: string
  durationMs?: number
  error?: string
  result?: any // Job-specific result data
}

export interface JobsResponse {
  jobs: Job[]
}

export interface RunsResponse {
  runs: JobRun[]
}

export interface TriggerJobResponse {
  runId: string
  jobName: string
  status: 'started'
}

export interface JobError {
  error: string
  jobName?: string
}
