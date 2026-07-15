"use client";

import React, { useEffect, useState } from 'react';
import { useOfflineQueue } from '@/lib/offline-queue';

export function ConflictResolver() {
  const status = useOfflineQueue();
  const [visible, setVisible] = useState(false);
  const [conflicts, setConflicts] = useState<any[]>([]);

  useEffect(() => {
    // update conflicts from hook
    setConflicts(status.getConflicts ? status.getConflicts() : []);

    const onConflict = (e: any) => {
      setConflicts((prev) => {
        const next = status.getConflicts ? status.getConflicts() : [];
        return next;
      });
      // open the panel on new conflict
      setVisible(true);
    };

    window.addEventListener('offline-queue-conflict', onConflict as EventListener);
    const interval = setInterval(() => {
      setConflicts(status.getConflicts ? status.getConflicts() : []);
    }, 1500);

    return () => {
      window.removeEventListener('offline-queue-conflict', onConflict as EventListener);
      clearInterval(interval);
    };
  }, [status]);

  async function handleResolve(id: string) {
    if (!status.resolveConflict) return;
    const ok = await status.resolveConflict(id, { action: 'discard' });
    if (ok) {
      setConflicts(status.getConflicts ? status.getConflicts() : []);
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
        <div style={{ marginTop: 8, width: 360, background: '#fff', color: '#000', borderRadius: 8, boxShadow: '0 6px 18px rgba(0,0,0,0.12)', padding: 12 }}>
          <h4 style={{ margin: '0 0 8px 0' }}>Offline Queue Conflicts</h4>
          <div style={{ maxHeight: 300, overflow: 'auto' }}>
            {conflicts.map((c) => (
              <div key={c.id} style={{ padding: 8, borderBottom: '1px solid #eee' }}>
                <div style={{ fontSize: 12, color: '#666' }}>{c.url}</div>
                <div style={{ fontSize: 12 }}>Status: {c.status} • Attempts: {c.attempts}</div>
                <div style={{ marginTop: 8 }}>
                  <button onClick={() => status.processQueue && status.processQueue()} style={{ marginRight: 8 }}>Retry</button>
                  <button onClick={() => handleResolve(c.id)}>Resolve (discard)</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
