'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useStore } from '@/stores/useStore';
import { buildView, buildRollupText, findUnknownApps } from './view';
import type { RawAggregate, WorkflowView } from './types';

function todayLocal(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

const EMPTY: RawAggregate = { date: todayLocal(), totalSeconds: 0, byApp: [], byHour: [] };

export function useWorkflowData() {
  const overrides = useStore((s) => s.workflowCategoryOverrides);
  const summary = useStore((s) => s.workflowSummary);
  const setSummary = useStore((s) => s.setWorkflowSummary);
  const setCategory = useStore((s) => s.setWorkflowCategory);

  const [raw, setRaw] = useState<RawAggregate>(EMPTY);
  const [monitorRunning, setMonitorRunning] = useState(false);
  const [loading, setLoading] = useState(true);
  const [summarizing, setSummarizing] = useState(false);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/workflow/usage');
      const data = await res.json();
      setRaw(data.aggregate ?? EMPTY);
      setMonitorRunning(!!data.monitorRunning);
    } catch {
      setRaw(EMPTY);
      setMonitorRunning(false);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  const view: WorkflowView = useMemo(() => buildView(raw, overrides), [raw, overrides]);

  const summarize = useCallback(async () => {
    setSummarizing(true);
    try {
      const res = await fetch('/api/workflow/summarize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          rollup: buildRollupText(view),
          unknownApps: findUnknownApps(raw, overrides),
        }),
      });
      if (res.ok) {
        const data = await res.json();
        if (typeof data.summary === 'string') setSummary(view.date, data.summary);
        if (Array.isArray(data.suggestions)) {
          for (const s of data.suggestions) {
            if (s && typeof s.app === 'string' && typeof s.category === 'string') {
              setCategory(s.app, s.category);
            }
          }
        }
      }
    } catch {
      // leave existing summary in place on failure
    } finally {
      setSummarizing(false);
    }
  }, [view, raw, overrides, setSummary, setCategory]);

  const todaysSummary = summary && summary.date === view.date ? summary.text : null;

  return { view, monitorRunning, loading, summarizing, refresh, summarize, todaysSummary, setCategory };
}
