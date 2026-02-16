'use client'

import {useState, useEffect, useCallback} from 'react'
import {toast} from 'sonner'
import type {Job, JobRun} from '@/lib/inngest/types'

const STORAGE_KEY = 'thingsfor-job-runs'
const MAX_STORED_RUNS = 50

// Load runs from localStorage
function loadStoredRuns(): JobRun[] {
  if (typeof window === 'undefined') return []
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    return stored ? JSON.parse(stored) : []
  } catch {
    return []
  }
}

// Save runs to localStorage
function saveStoredRuns(runs: JobRun[]) {
  if (typeof window === 'undefined') return
  try {
    // Keep only the most recent runs
    const trimmed = runs.slice(0, MAX_STORED_RUNS)
    localStorage.setItem(STORAGE_KEY, JSON.stringify(trimmed))
  } catch {
    // Ignore storage errors
  }
}

export default function JobsSection() {
  // Jobs state
  const [jobs, setJobs] = useState<Job[]>([])
  const [runs, setRuns] = useState<JobRun[]>([])
  const [jobsLoading, setJobsLoading] = useState(true)
  const [automationAvailable, setAutomationAvailable] = useState(true)
  const [triggeringJob, setTriggeringJob] = useState<string | null>(null)
  const [pollingRunIds, setPollingRunIds] = useState<Set<string>>(new Set())
  const [selectedRun, setSelectedRun] = useState<JobRun | null>(null)

  // Update a run in the list and persist to localStorage
  const updateRun = useCallback((updatedRun: JobRun) => {
    setRuns((prev) => {
      const existingIndex = prev.findIndex((r) => r.runId === updatedRun.runId)
      let newRuns: JobRun[]
      if (existingIndex >= 0) {
        newRuns = [...prev]
        newRuns[existingIndex] = updatedRun
      } else {
        newRuns = [updatedRun, ...prev]
      }
      saveStoredRuns(newRuns)
      return newRuns
    })
  }, [])

  // Fetch jobs and load runs from localStorage
  useEffect(() => {
    const fetchJobsData = async () => {
      setJobsLoading(true)
      try {
        // Load stored runs from localStorage
        const storedRuns = loadStoredRuns()
        setRuns(storedRuns)

        // Check for any runs that are still pending/running and add them to polling
        const activeRunIds = storedRuns
          .filter((r) => r.status === 'pending' || r.status === 'running')
          .map((r) => r.runId)
        if (activeRunIds.length > 0) {
          setPollingRunIds(new Set(activeRunIds))
        }

        // Fetch jobs list
        const jobsRes = await fetch('/api/admin/jobs')

        if (jobsRes.ok) {
          const jobsData = await jobsRes.json()
          setJobs(jobsData.jobs || [])
          setAutomationAvailable(true)
        } else if (jobsRes.status === 503) {
          setAutomationAvailable(false)
        }
      } catch (error) {
        console.error('Failed to fetch jobs data:', error)
        setAutomationAvailable(false)
      } finally {
        setJobsLoading(false)
      }
    }

    fetchJobsData()
  }, [])

  // Poll for running job status updates
  useEffect(() => {
    if (pollingRunIds.size === 0) return

    const pollInterval = setInterval(async () => {
      const completedRuns = new Set<string>()

      for (const runId of pollingRunIds) {
        try {
          const response = await fetch(`/api/admin/jobs/runs/${runId}`)
          if (response.ok) {
            const run: JobRun = await response.json()
            // Update the run in our list
            updateRun(run)

            if (run.status === 'completed' || run.status === 'failed') {
              completedRuns.add(runId)
              if (run.status === 'completed') {
                toast.success(`Job "${run.jobName}" completed`, {
                  description: `Duration: ${((run.durationMs || 0) / 1000).toFixed(1)}s`,
                })
              } else {
                toast.error(`Job "${run.jobName}" failed`, {
                  description: run.error ? (run.error.length > 100 ? run.error.substring(0, 100) + '...' : run.error) : 'Unknown error',
                  action: {
                    label: 'View Details',
                    onClick: () => setSelectedRun(run),
                  },
                })
              }
            }
          }
        } catch (error) {
          // Ignore polling errors
        }
      }

      // Remove completed runs from polling set and refresh jobs list
      if (completedRuns.size > 0) {
        setPollingRunIds((prev) => {
          const next = new Set(prev)
          completedRuns.forEach((id) => next.delete(id))
          return next
        })
        // Refresh jobs list to update running status
        const jobsRes = await fetch('/api/admin/jobs')
        if (jobsRes.ok) setJobs((await jobsRes.json()).jobs || [])
      }
    }, 3000)

    return () => clearInterval(pollInterval)
  }, [pollingRunIds, updateRun])

  const handleRunJob = async (jobName: string) => {
    setTriggeringJob(jobName)
    try {
      const response = await fetch(`/api/admin/jobs/${jobName}/run`, {
        method: 'POST',
      })

      const data = await response.json()

      if (response.ok) {
        toast.success(`Job "${jobName}" started`, {description: `Run ID: ${data.runId}`})

        // Add the new run to our list immediately
        const newRun: JobRun = {
          runId: data.runId,
          jobName,
          status: 'pending',
          startedAt: new Date().toISOString(),
        }
        updateRun(newRun)

        // Start polling for status updates
        setPollingRunIds((prev) => new Set(prev).add(data.runId))

        // Refresh job list to show running status
        const jobsRes = await fetch('/api/admin/jobs')
        if (jobsRes.ok) {
          const jobsData = await jobsRes.json()
          setJobs(jobsData.jobs || [])
        }
      } else if (response.status === 409) {
        toast.warning(`Job "${jobName}" is already running`)
      } else {
        toast.error('Failed to start job', {description: data.error})
      }
    } catch (error) {
      toast.error('Failed to trigger job', {description: 'Automation service may be unavailable'})
    } finally {
      setTriggeringJob(null)
    }
  }

  const refreshJobsData = async () => {
    setJobsLoading(true)
    try {
      // Load stored runs from localStorage
      const storedRuns = loadStoredRuns()
      setRuns(storedRuns)

      // Fetch jobs list
      const jobsRes = await fetch('/api/admin/jobs')

      if (jobsRes.ok) {
        const jobsData = await jobsRes.json()
        setJobs(jobsData.jobs || [])
        setAutomationAvailable(true)
      } else if (jobsRes.status === 503) {
        setAutomationAvailable(false)
      }
    } catch (error) {
      setAutomationAvailable(false)
    } finally {
      setJobsLoading(false)
    }
  }

  const getJobStatusBadgeColor = (status: JobRun['status']) => {
    switch (status) {
      case 'running':
      case 'pending':
        return 'bg-blue-100 text-blue-800'
      case 'completed':
        return 'bg-green-100 text-green-800'
      case 'failed':
        return 'bg-red-100 text-red-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const getCronDescription = (schedule: string): string => {
    const scheduleMap: Record<string, string> = {
      '0 */6 * * *': 'Every 6 hours',
      '0 * * * *': 'Every hour',
      '0 */2 * * *': 'Every 2 hours',
      '0 */4 * * *': 'Every 4 hours',
      '0 */8 * * *': 'Every 8 hours',
      '*/5 * * * *': 'Every 5 minutes',
      '*/15 * * * *': 'Every 15 minutes',
      '0 0 * * *': 'Daily at midnight',
    }
    return scheduleMap[schedule] || schedule
  }

  const formatDuration = (ms: number): string => {
    if (ms < 1000) return `${ms}ms`
    if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`
    return `${(ms / 60000).toFixed(1)}m`
  }

  const formatTimeAgo = (dateString: string): string => {
    const date = new Date(dateString)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMins / 60)
    const diffDays = Math.floor(diffHours / 24)

    if (diffMins < 1) return 'just now'
    if (diffMins < 60) return `${diffMins}m ago`
    if (diffHours < 24) return `${diffHours}h ago`
    return `${diffDays}d ago`
  }

  return (
    <div>
      {/* Automation Unavailable Warning */}
      {!automationAvailable && (
        <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
          <div className="flex items-center gap-3">
            <svg
              className="w-5 h-5 text-yellow-600"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path
                fillRule="evenodd"
                d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                clipRule="evenodd"
              />
            </svg>
            <span className="text-yellow-800 font-medium">
              Automation service is unavailable
            </span>
            <button
              onClick={refreshJobsData}
              className="ml-auto px-3 py-1 text-sm bg-yellow-100 hover:bg-yellow-200 rounded"
            >
              Retry
            </button>
          </div>
        </div>
      )}

      {/* Jobs Section */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold">Automation Jobs</h2>
          <button
            onClick={refreshJobsData}
            disabled={jobsLoading}
            className="px-3 py-1 text-sm bg-gray-100 hover:bg-gray-200 rounded disabled:opacity-50"
          >
            {jobsLoading ? 'Loading...' : 'Refresh'}
          </button>
        </div>

        {jobsLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="bg-white rounded-lg shadow-md p-4 animate-pulse"
              >
                <div className="h-4 bg-gray-200 rounded w-1/4 mb-2"></div>
                <div className="h-3 bg-gray-200 rounded w-1/3"></div>
              </div>
            ))}
          </div>
        ) : (
          <div className="space-y-3">
            {jobs.map((job) => (
              <div
                key={job.name}
                className="bg-white rounded-lg shadow-md p-4 flex items-center justify-between"
              >
                <div>
                  <h3 className="font-medium">{job.name}</h3>
                  <p className="text-sm text-gray-500">
                    {getCronDescription(job.schedule)}
                    <span className="text-gray-400 ml-2">({job.schedule})</span>
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <span
                    className={`px-2 py-1 rounded text-xs font-medium ${
                      job.enabled
                        ? 'bg-green-100 text-green-800'
                        : 'bg-gray-100 text-gray-500'
                    }`}
                  >
                    {job.enabled ? 'Enabled' : 'Disabled'}
                  </span>
                  {job.running ? (
                    <span className="px-3 py-1.5 bg-blue-100 text-blue-800 rounded text-sm font-medium flex items-center gap-2">
                      <svg
                        className="w-4 h-4 animate-spin"
                        fill="none"
                        viewBox="0 0 24 24"
                      >
                        <circle
                          className="opacity-25"
                          cx="12"
                          cy="12"
                          r="10"
                          stroke="currentColor"
                          strokeWidth="4"
                        />
                        <path
                          className="opacity-75"
                          fill="currentColor"
                          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                        />
                      </svg>
                      Running
                    </span>
                  ) : (
                    <button
                      onClick={() => handleRunJob(job.name)}
                      disabled={
                        !automationAvailable || triggeringJob === job.name
                      }
                      className="px-3 py-1.5 bg-blue-500 text-white rounded text-sm font-medium hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {triggeringJob === job.name ? 'Starting...' : 'Run Now'}
                    </button>
                  )}
                </div>
              </div>
            ))}

            {jobs.length === 0 && automationAvailable && (
              <p className="text-center text-gray-500 py-8">No jobs found</p>
            )}
          </div>
        )}
      </div>

      {/* Recent Runs Section */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold">Recent Runs</h2>
          <div className="flex items-center gap-3">
            {runs.length > 0 && (
              <button
                onClick={() => {
                  setRuns([])
                  saveStoredRuns([])
                }}
                className="px-3 py-1 text-sm text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded"
              >
                Clear History
              </button>
            )}
            <a
              href="https://app.inngest.com"
              target="_blank"
              rel="noopener noreferrer"
              className="px-3 py-1 text-sm bg-gray-100 hover:bg-gray-200 rounded flex items-center gap-1"
            >
              Inngest Dashboard
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
            </a>
          </div>
        </div>

        {runs.length === 0 ? (
          <div className="text-center py-8 bg-gray-50 rounded-lg">
            <p className="text-gray-500 mb-2">No recent runs</p>
            <p className="text-sm text-gray-400">
              Runs triggered from this page will appear here.
              <br />
              For complete history, visit the{' '}
              <a href="https://app.inngest.com" target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline">
                Inngest Dashboard
              </a>
              .
            </p>
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow-md overflow-hidden overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Job
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Started
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Duration
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Error
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {runs.map((run) => (
                  <tr key={run.runId}>
                    <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900">
                      {run.jobName}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span
                        className={`px-2 py-1 rounded text-xs font-medium ${getJobStatusBadgeColor(run.status)}`}
                      >
                        {run.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                      {formatTimeAgo(run.startedAt)}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                      {run.durationMs ? formatDuration(run.durationMs) : '-'}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-500">
                      {run.error ? (
                        <span className="text-red-600 truncate max-w-xs block" title={run.error}>
                          {run.error.length > 50 ? run.error.substring(0, 50) + '...' : run.error}
                        </span>
                      ) : (
                        '-'
                      )}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <button
                        onClick={() => setSelectedRun(run)}
                        className="text-sm text-blue-600 hover:text-blue-800 font-medium"
                      >
                        View Details
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Job Run Details Modal */}
      {selectedRun && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-3xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-start justify-between">
                <div>
                  <h2 className="text-2xl font-bold">Job Run Details</h2>
                  <p className="text-sm text-gray-600 mt-1">
                    Run ID: {selectedRun.runId}
                  </p>
                </div>
                <button
                  onClick={() => setSelectedRun(null)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            <div className="p-6 space-y-4">
              {/* Job Name */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Job Name
                </label>
                <p className="text-lg font-semibold">{selectedRun.jobName}</p>
              </div>

              {/* Status */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Status
                </label>
                <span
                  className={`inline-block px-3 py-1 rounded text-sm font-medium ${getJobStatusBadgeColor(selectedRun.status)}`}
                >
                  {selectedRun.status}
                </span>
              </div>

              {/* Timestamps */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Started At
                  </label>
                  <p className="text-sm">
                    {new Date(selectedRun.startedAt).toLocaleString()}
                  </p>
                  <p className="text-xs text-gray-500">
                    {formatTimeAgo(selectedRun.startedAt)}
                  </p>
                </div>
                {selectedRun.completedAt && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Completed At
                    </label>
                    <p className="text-sm">
                      {new Date(selectedRun.completedAt).toLocaleString()}
                    </p>
                  </div>
                )}
              </div>

              {/* Duration */}
              {selectedRun.durationMs && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Duration
                  </label>
                  <p className="text-sm">
                    {formatDuration(selectedRun.durationMs)} ({selectedRun.durationMs}ms)
                  </p>
                </div>
              )}

              {/* Error Message */}
              {selectedRun.error && (
                <div>
                  <label className="block text-sm font-medium text-red-700 mb-1">
                    Error Message
                  </label>
                  <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                    <pre className="text-sm text-red-900 whitespace-pre-wrap break-words font-mono">
                      {selectedRun.error}
                    </pre>
                  </div>
                </div>
              )}

              {/* Result (if available) */}
              {selectedRun.result && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Result
                  </label>
                  <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg">
                    <pre className="text-sm text-gray-900 whitespace-pre-wrap break-words font-mono">
                      {typeof selectedRun.result === 'string'
                        ? selectedRun.result
                        : JSON.stringify(selectedRun.result, null, 2)}
                    </pre>
                  </div>
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="p-6 border-t border-gray-200 flex gap-3 justify-end">
              <button
                onClick={() => setSelectedRun(null)}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
