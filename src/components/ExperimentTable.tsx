import React from 'react';
import { useAppStore } from '../store';
import { ImageIcon, Copy } from 'lucide-react';

export const ExperimentTable: React.FC = () => {
    const { experimentItems, globalPrompt, models } = useAppStore();

    return (
        <div style={{ width: '100%', overflowX: 'auto' }}>
            <table style={{ minWidth: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.875rem' }}>
                <thead>
                    <tr style={{ backgroundColor: 'var(--bg-color)', borderBottom: '2px solid var(--border-color)' }}>
                        <th style={{ padding: '1rem', minWidth: '150px', position: 'sticky', left: 0, backgroundColor: 'var(--bg-color)', zIndex: 1, borderRight: '1px solid var(--border-color)' }}>
                            Obraz & Prompt
                        </th>
                        {models.map(model => (
                            <th key={model.id} style={{ padding: '1rem', minWidth: '350px', borderRight: '1px solid var(--border-color)' }}>
                                {model.name}
                            </th>
                        ))}
                    </tr>
                </thead>
                <tbody>
                    {experimentItems.map(item => (
                        <tr key={item.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                            <td style={{ padding: '1rem', position: 'sticky', left: 0, backgroundColor: 'var(--panel-bg)', zIndex: 1, borderRight: '1px solid var(--border-color)', verticalAlign: 'top' }}>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                    {item.imageBase64 ? (
                                        <img src={item.imageBase64} alt="thumbnail" style={{ width: '100%', borderRadius: '0.5rem', objectFit: 'cover' }} />
                                    ) : (
                                        <div style={{ height: '100px', backgroundColor: 'var(--bg-color)', borderRadius: '0.5rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                            <ImageIcon size={24} style={{ color: 'var(--text-secondary)' }} />
                                        </div>
                                    )}
                                    <textarea
                                        value={item.individualPrompt !== undefined && item.individualPrompt !== '' ? item.individualPrompt : globalPrompt}
                                        onChange={(e) => {
                                            useAppStore.getState().setExperimentItems(prev => prev.map(p =>
                                                p.id === item.id ? { ...p, individualPrompt: e.target.value } : p
                                            ))
                                        }}
                                        placeholder="Własny prompt dla tego zdjęcia..."
                                        style={{
                                            width: '100%',
                                            padding: '0.5rem',
                                            borderRadius: '0.25rem',
                                            border: '1px solid var(--border-color)',
                                            backgroundColor: 'var(--bg-color)',
                                            color: 'var(--text-primary)',
                                            fontFamily: 'inherit',
                                            resize: 'vertical',
                                            minHeight: '80px',
                                            fontSize: '0.75rem'
                                        }}
                                    />
                                </div>
                            </td>

                            {models.map(model => {
                                const result = item.results[model.id];

                                return (
                                    <td key={model.id} style={{ padding: '1rem', borderRight: '1px solid var(--border-color)', verticalAlign: 'top' }}>
                                        <div style={{
                                            height: '100%',
                                            minHeight: '200px',
                                            backgroundColor: 'var(--bg-color)',
                                            borderRadius: '0.5rem',
                                            padding: '1rem',
                                            display: 'flex',
                                            flexDirection: 'column'
                                        }}>
                                            {!result || result.status === 'idle' ? (
                                                <span style={{ color: 'var(--text-secondary)', margin: 'auto' }}>Oczekuje...</span>
                                            ) : result.status === 'loading' ? (
                                                <div style={{ margin: 'auto', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                                    <div className="spinner" style={{ width: '16px', height: '16px', border: '2px solid var(--accent-color)', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
                                                    <span style={{ color: 'var(--accent-color)' }}>Przetwarzanie...</span>
                                                </div>
                                            ) : result.status === 'error' ? (
                                                <span style={{ color: 'var(--danger-color)' }}>{result.error}</span>
                                            ) : (
                                                <div style={{ display: 'flex', flexDirection: 'column', height: '100%', position: 'relative' }}>
                                                    <button
                                                        onClick={() => navigator.clipboard.writeText(result.text || '')}
                                                        className="ghost"
                                                        style={{ position: 'absolute', top: '-0.5rem', right: '-0.5rem', padding: '0.4rem', color: 'var(--text-secondary)' }}
                                                        title="Kopiuj wynik do schowka"
                                                    >
                                                        <Copy size={16} />
                                                    </button>
                                                    <p style={{ whiteSpace: 'pre-wrap', flex: 1, marginTop: '0.5rem' }}>{result.text}</p>
                                                    {result.usage && (
                                                        <div style={{ marginTop: '1rem', paddingTop: '0.5rem', borderTop: '1px solid var(--border-color)', fontSize: '0.7rem', color: 'var(--text-secondary)', display: 'flex', justifyContent: 'space-between' }}>
                                                            <span>Tokens: {result.usage.totalTokens}</span>
                                                        </div>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    </td>
                                );
                            })}
                        </tr>
                    ))}
                </tbody>
            </table>
            <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
        </div>
    );
};
