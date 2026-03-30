import React, { useEffect, useState } from 'react';
import { useAppStore } from '../store';
import { Clock, CheckCircle, XCircle, Loader2 } from 'lucide-react';
import { checkActiveBatches } from '../api/BatchExecutor';

export const BatchStatusWidget: React.FC = () => {
    const { activeBatches } = useAppStore();
    const [isOpen, setIsOpen] = useState(false);

    // Filter to only show incomplete batches in the summary
    const inProgress = activeBatches.filter(b => b.status === 'in_progress');

    // Auto-open if a new batch starts
    useEffect(() => {
        if (inProgress.length > 0 && !isOpen) {
            setIsOpen(true);
        }
    }, [inProgress.length]);

    if (activeBatches.length === 0) {
        return null;
    }

    const formatTime = (ms: number) => {
        const totalMinutes = Math.floor(ms / 60000);
        const hours = Math.floor(totalMinutes / 60);
        const minutes = totalMinutes % 60;
        if (hours > 0) return `${hours}h ${minutes}m`;
        return `${minutes}m`;
    };

    return (
        <div style={{
            position: 'fixed',
            bottom: '2rem',
            right: '2rem',
            zIndex: 1000,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'flex-end',
            gap: '1rem'
        }}>
            {isOpen && (
                <div style={{
                    backgroundColor: 'var(--panel-bg)',
                    border: '1px solid var(--border-color)',
                    borderRadius: '1rem',
                    padding: '1rem',
                    boxShadow: '0 10px 25px rgba(0,0,0,0.1)',
                    width: '300px',
                    maxHeight: '400px',
                    overflowY: 'auto',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.5rem'
                }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                        <h4 style={{ margin: 0 }}>Aktywne Zadania (Batch)</h4>
                        <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                            {activeBatches.length} łącznie
                        </span>
                    </div>

                    {activeBatches.map(batch => (
                        <div key={batch.batchId} style={{
                            padding: '0.75rem',
                            borderRadius: '0.5rem',
                            backgroundColor: 'var(--bg-color)',
                            border: '1px solid var(--border-color)',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '0.25rem'
                        }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <strong style={{ fontSize: '0.9rem' }}>{batch.modelId}</strong>
                                {batch.status === 'in_progress' && <Loader2 size={16} className="animate-spin" style={{ color: 'var(--accent-color)' }} />}
                                {batch.status === 'completed' && <CheckCircle size={16} style={{ color: 'green' }} />}
                                {batch.status === 'failed' && <XCircle size={16} style={{ color: 'red' }} />}
                            </div>
                            <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'flex', justifyContent: 'space-between' }}>
                                <span>{batch.itemIds.length} zadań</span>
                                <span>{formatTime(Date.now() - batch.createdAt)}</span>
                            </div>
                        </div>
                    ))}
                    <button
                        className="primary"
                        onClick={async () => {
                            await checkActiveBatches();
                        }}
                        style={{ width: '100%', marginTop: '0.5rem', padding: '0.5rem', borderRadius: '0.5rem', fontSize: '0.9rem' }}
                    >
                        Sprawdź status
                    </button>
                    <div style={{ marginTop: '0.5rem', fontSize: '0.8rem', color: 'var(--text-secondary)', textAlign: 'center' }}>
                        Zwykle trwa to do 24h.
                    </div>
                </div>
            )}

            <button
                className="secondary"
                onClick={() => setIsOpen(!isOpen)}
                style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
                    borderRadius: '2rem',
                    padding: '0.75rem 1.5rem',
                    backgroundColor: inProgress.length > 0 ? 'var(--accent-color)' : 'var(--panel-bg)',
                    color: inProgress.length > 0 ? 'white' : 'var(--text-primary)',
                    border: inProgress.length > 0 ? 'none' : '1px solid var(--border-color)'
                }}
            >
                {inProgress.length > 0 ? <Loader2 size={18} className="animate-spin" /> : <Clock size={18} />}
                {inProgress.length > 0 ? `${inProgress.length} W Trakcie...` : 'Status Batch'}
            </button>
        </div>
    );
};
