"use client";

import React, { useEffect, useState } from 'react';
import { useOfflineQueue } from '@/lib/offline-queue';

type ConflictChoice = 'keep-server' | 'keep-client' | 'merge';

export function ConflictResolver() {
  const status = useOfflineQueue();
  const [visible, setVisible] = useState(false);
  const [conflicts, setConflicts] = useState<any[]>([]);
  const [selectedAction, setSelectedAction] = useState<Record<string, ConflictChoice>>({});

  useEffect(() => {
    const syncConflicts = () => {
      const nextConflicts = status.getConflicts ? status.getConflicts() : [];
      setConflicts((prev) => {
        const prevKey = JSON.stringify(prev);
        const nextKey = JSON.stringify(nextConflicts);
        return prevKey === nextKey ? prev : nextConflicts;
      });
    };

    syncConflicts();

    const onConflict = () => {
      const latest = status.getConflicts ? status.getConflicts() : [];
      setConflicts((prev) => (JSON.stringify(prev) === JSON.stringify(latest) ? prev : latest));
      setVisible(true);
    };

    window.addEventListener('offline-queue-conflict', onConflict as EventListener);

    return () => {
      window.removeEventListener('offline-queue-conflict', onConflict as EventListener);
    };
  }, [status]);

  async function handleResolve(id: string) {
    if (!status.resolveConflict) return;
    const action = selectedAction[id] ?? 'keep-server';
    const ok = await status.resolveConflict(id, {
      action,
      reason: 'manual-conflict-resolution',
      payload: {
        body: {
          action,
          timestamp: new Date().toISOString(),
        },
      },
    });

    if (ok) {
      setConflicts(status.getConflicts ? status.getConflicts() : []);
      setSelectedAction((prev) => {
        const next = { ...prev };
        delete next[id];
        return next;
      });
    }
  }

  return (
    <div style={{ position: 'fixed', right: 16, bottom: 80, zIndex: 9999 }}>
      {conflicts.length > 0 && (
        <div style={{ background: '#1f2937', color: '#fff', padding: 8, borderRadius: 8 }}>
          <button onClick={() => setVisible((v) => !v)} style={{ background: 'transparent', color: 'inherit', border: 'none', cursor: 'pointer' }}>
            ⚠️ {conflicts.length} conflict(s)
          </button>
        </div>
      )}

      {visible && conflicts.length > 0 && (
        <div style={{ marginTop: 8, width: 380, background: '#fff', color: '#000', borderRadius: 8, boxShadow: '0 6px 18px rgba(0,0,0,0.12)', padding: 12 }}>
          <h4 style={{ margin: '0 0 8px 0' }}>Offline Queue Conflicts</h4>
          <div style={{ maxHeight: 320, overflow: 'auto' }}>
            {conflicts.map((c) => (
              <div key={c.id} style={{ padding: 8, borderBottom: '1px solid #eee' }}>
                <div style={{ fontSize: 12, color: '#666' }}>{c.url}</div>
                <div style={{ fontSize: 12 }}>Status: {c.status} • Attempts: {c.attempts}</div>
                <div style={{ display: 'flex', gap: 6, marginTop: 8 }}>
                  {(['keep-server', 'keep-client', 'merge'] as ConflictChoice[]).map((action) => (
                    <label key={action} style={{ fontSize: 12 }}>
                      <input
                        type="radio"
                        name={`resolve-${c.id}`}
                        checked={selectedAction[c.id] === action || (!selectedAction[c.id] && action === 'keep-server')}
                        onChange={() => setSelectedAction((prev) => ({ ...prev, [c.id]: action }))}
                      />{' '}
                      {action.replace('-', ' ')}
                    </label>
                  ))}
                </div>
                <div style={{ marginTop: 8 }}>
                  <button onClick={() => status.processQueue && status.processQueue()} style={{ marginRight: 8 }}>Retry</button>
                  <button onClick={() => handleResolve(c.id)}>Resolve</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
