'use client'

import {useCallback, useEffect, useState} from 'react'

interface BrandConfig {
  id: string
  name: string
  verbiageTheme: string
  verbiagePromptContext: string
  toneGuidelines: string
  graphicThemes: string
  canvaTemplateIds: string
  defaultApparelTypes: string
  defaultMarkupPercent: number
  aiModelPreference: string
  ideaBatchSize: number
}

export default function SettingsPage() {
  const [config, setConfig] = useState<BrandConfig | null>(null)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  const fetchConfig = useCallback(async () => {
    const res = await fetch('/api/admin/settings')
    if (res.ok) {
      setConfig(await res.json())
    }
  }, [])

  useEffect(() => {
    fetchConfig()
  }, [fetchConfig])

  async function handleSave() {
    if (!config) return
    setSaving(true)
    setSaved(false)
    const {id: _id, ...data} = config
    await fetch('/api/admin/settings', {
      method: 'PATCH',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify(data),
    })
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  if (!config) {
    return <p className="py-8 text-center text-gray-500">Loading settings...</p>
  }

  function updateField(field: keyof BrandConfig, value: string | number) {
    setConfig((prev) => (prev ? {...prev, [field]: value} : prev))
  }

  return (
    <div className="max-w-2xl">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold">Brand Settings</h1>
        <div className="flex items-center gap-2">
          {saved && <span className="text-sm text-green-400">Saved</span>}
          <button
            onClick={handleSave}
            disabled={saving}
            className="rounded bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {saving ? 'Saving...' : 'Save'}
          </button>
        </div>
      </div>

      <div className="space-y-6">
        <Section title="Brand Identity">
          <Field label="Brand Name">
            <input
              value={config.name}
              onChange={(e) => updateField('name', e.target.value)}
              className="w-full rounded bg-gray-700 px-3 py-2 text-sm"
            />
          </Field>
        </Section>

        <Section title="Verbiage">
          <Field label="Theme">
            <input
              value={config.verbiageTheme}
              onChange={(e) => updateField('verbiageTheme', e.target.value)}
              className="w-full rounded bg-gray-700 px-3 py-2 text-sm"
            />
          </Field>
          <Field label="Prompt Context">
            <textarea
              value={config.verbiagePromptContext}
              onChange={(e) => updateField('verbiagePromptContext', e.target.value)}
              className="w-full rounded bg-gray-700 px-3 py-2 text-sm"
              rows={4}
            />
          </Field>
          <Field label="Tone Guidelines">
            <textarea
              value={config.toneGuidelines}
              onChange={(e) => updateField('toneGuidelines', e.target.value)}
              className="w-full rounded bg-gray-700 px-3 py-2 text-sm"
              rows={3}
            />
          </Field>
        </Section>

        <Section title="Graphics">
          <Field label="Graphic Themes (JSON array)">
            <textarea
              value={config.graphicThemes}
              onChange={(e) => updateField('graphicThemes', e.target.value)}
              className="w-full rounded bg-gray-700 px-3 py-2 text-sm font-mono"
              rows={3}
            />
          </Field>
          <Field label="Canva Template IDs (JSON map)">
            <textarea
              value={config.canvaTemplateIds}
              onChange={(e) => updateField('canvaTemplateIds', e.target.value)}
              className="w-full rounded bg-gray-700 px-3 py-2 text-sm font-mono"
              rows={3}
            />
          </Field>
        </Section>

        <Section title="Products">
          <Field label="Default Apparel Types (JSON array)">
            <textarea
              value={config.defaultApparelTypes}
              onChange={(e) => updateField('defaultApparelTypes', e.target.value)}
              className="w-full rounded bg-gray-700 px-3 py-2 text-sm font-mono"
              rows={2}
            />
          </Field>
          <Field label="Default Markup %">
            <input
              type="number"
              value={config.defaultMarkupPercent}
              onChange={(e) =>
                updateField('defaultMarkupPercent', parseFloat(e.target.value) || 0)
              }
              className="w-32 rounded bg-gray-700 px-3 py-2 text-sm"
            />
          </Field>
        </Section>

        <Section title="AI">
          <Field label="Model Preference">
            <input
              value={config.aiModelPreference}
              onChange={(e) => updateField('aiModelPreference', e.target.value)}
              className="w-full rounded bg-gray-700 px-3 py-2 text-sm"
            />
          </Field>
          <Field label="Idea Batch Size">
            <input
              type="number"
              value={config.ideaBatchSize}
              onChange={(e) =>
                updateField('ideaBatchSize', parseInt(e.target.value) || 5)
              }
              className="w-32 rounded bg-gray-700 px-3 py-2 text-sm"
            />
          </Field>
        </Section>
      </div>
    </div>
  )
}

function Section({title, children}: {title: string; children: React.ReactNode}) {
  return (
    <div className="rounded border border-gray-700 bg-gray-800 p-4">
      <h2 className="mb-3 text-lg font-medium">{title}</h2>
      <div className="space-y-3">{children}</div>
    </div>
  )
}

function Field({label, children}: {label: string; children: React.ReactNode}) {
  return (
    <div>
      <label className="mb-1 block text-sm text-gray-400">{label}</label>
      {children}
    </div>
  )
}
