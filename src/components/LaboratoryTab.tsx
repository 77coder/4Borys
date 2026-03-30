import React, { useState } from 'react';
import { UploadCloud, Trash2, PlayCircle, Download, ClipboardPaste, ClipboardCopy } from 'lucide-react';
import { useAppStore, type ExperimentItem } from '../store';
import { ExperimentTable } from './ExperimentTable';
import { startLiveExecution } from '../api/LiveExecutor';
import { startBatchExecution } from '../api/BatchExecutor';
import { Zap } from 'lucide-react';

export const LaboratoryTab: React.FC = () => {
    const { experimentItems, setExperimentItems, clearExperiment } = useAppStore();
    const [isDragging, setIsDragging] = useState(false);

    // Helper to convert File to Base64
    const fileToBase64 = (file: File): Promise<string> => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = () => resolve(reader.result as string);
            reader.onerror = (error) => reject(error);
        });
    };

    const handleDrop = async (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        setIsDragging(false);

        const files = Array.from(e.dataTransfer.files).filter((f: File) => f.type.startsWith('image/'));

        if (files.length === 0) return;

        // Process new images
        const newItems: ExperimentItem[] = await Promise.all(
            files.map(async (file) => ({
                id: crypto.randomUUID(),
                imageFile: file,
                imageBase64: await fileToBase64(file),
                individualPrompt: '',
                results: {},
            }))
        );

        setExperimentItems((prev: ExperimentItem[]) => [...prev, ...newItems]);
    };

    const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        setIsDragging(true);
    };

    const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        setIsDragging(false);
    };

    const handleRunLive = () => {
        startLiveExecution();
    };

    const downloadFile = (content: string, fileName: string, contentType: string) => {
        const a = document.createElement('a');
        const file = new Blob([content], { type: contentType });
        a.href = URL.createObjectURL(file);
        a.download = fileName;
        a.click();
        URL.revokeObjectURL(a.href);
    };

    const handleExportCSV = () => {
        const { experimentItems, models, globalPrompt, generationParams } = useAppStore.getState();
        if (experimentItems.length === 0) return;

        let csvContent = `"Global_Parameters","Temperature=${generationParams.temperature}","Top_P=${generationParams.top_p}","Top_K=${generationParams.top_k}","Max_Tokens=${generationParams.max_tokens}","Presence_Penalty=${generationParams.presence_penalty}","Frequency_Penalty=${generationParams.frequency_penalty}"\n`;

        // Header row
        const headers = ['Zdjecie_ID', 'Prompt', ...models.map(m => m.name)];
        csvContent += headers.join(',') + '\n';

        experimentItems.forEach((item, index) => {
            const promptUsed = item.individualPrompt || globalPrompt;
            // Escape double quotes and wrap in double quotes
            const row = [
                `"Image_${index + 1}"`,
                `"${promptUsed.replace(/"/g, '""')}"`
            ];

            models.forEach(model => {
                const result = item.results[model.id];
                if (result && result.text) {
                    row.push(`"${result.text.replace(/"/g, '""')}"`);
                } else {
                    row.push('""');
                }
            });

            csvContent += row.join(',') + '\n';
        });

        downloadFile(csvContent, 'llm-batch-results.csv', 'text/csv;charset=utf-8;');
    };

    const handleExportJSON = () => {
        const { experimentItems, models, globalPrompt, generationParams } = useAppStore.getState();
        if (experimentItems.length === 0) return;

        // Strip Base64 to save space
        const exportData = experimentItems.map((item, index) => {
            const resultsForModels: Record<string, string | undefined> = {};
            models.forEach(m => {
                resultsForModels[m.name] = item.results[m.id]?.text;
            });

            return {
                id: `Image_${index + 1}`,
                originalId: item.id,
                prompt: item.individualPrompt || globalPrompt,
                results: resultsForModels
            };
        });

        const finalOutput = {
            generationParameters: generationParams,
            items: exportData
        };

        downloadFile(JSON.stringify(finalOutput, null, 2), 'llm-batch-results.json', 'application/json');
    };

    const handleCopyForSheets = () => {
        const { experimentItems, models, globalPrompt } = useAppStore.getState();
        if (experimentItems.length === 0) return;

        const headers = ['Zdjecie_ID', 'Prompt', ...models.map(m => m.name)];
        let tsvContent = headers.join('\t') + '\n';

        experimentItems.forEach((item, index) => {
            const promptUsed = item.individualPrompt || globalPrompt;
            // Usuwamy entery z promptów by nie psuły tabeli w Excelu/Sheets
            const cleanPrompt = promptUsed.replace(/\n/g, ' ').replace(/\t/g, ' ');
            const row = [`Image_${index + 1}`, cleanPrompt];

            models.forEach(model => {
                const result = item.results[model.id];
                if (result && result.text) {
                    const cleanText = result.text.replace(/\n/g, ' ').replace(/\t/g, ' ');
                    row.push(cleanText);
                } else {
                    row.push('');
                }
            });
            tsvContent += row.join('\t') + '\n';
        });

        navigator.clipboard.writeText(tsvContent).then(() => {
            alert('Tabela skopiowana do schowka! Możesz teraz wkleić w Google Sheets (CMD+V / CTRL+V).');
        }).catch(err => {
            alert('Nie udało się skopiować do schowka: ' + err);
        });
    };

    const handlePasteFromSheets = async () => {
        try {
            const text = await navigator.clipboard.readText();
            if (!text) {
                alert('Schowek jest pusty.');
                return;
            }

            // Dzielimy po enterach, a potem po tsv
            const rows = text.split('\n').map(row => row.split('\t'));

            const { experimentItems, setExperimentItems } = useAppStore.getState();
            if (experimentItems.length === 0) {
                alert('Najpierw wgraj zdjęcia, aby móc pobrać do nich prompty z arkusza.');
                return;
            }

            // Bierzemy ostatnią (lub jedyną kolumnę) jako prompt
            const prompts = rows.map(r => r[r.length - 1].trim()).filter(p => p.length > 0);

            if (prompts.length === 0) {
                alert('Nie znaleziono tekstów promptów w schowku.');
                return;
            }

            const updatedItems = experimentItems.map((item, index) => {
                if (index < prompts.length) {
                    return { ...item, individualPrompt: prompts[index] };
                }
                return item;
            });

            // Need to pass a function returning the array or just the array if bounded properly. 
            // In store interface, setExperimentItems takes either value or updater.
            setExperimentItems(() => updatedItems);
            alert(`Pomyślnie wklejono ${Math.min(prompts.length, experimentItems.length)} promptów z Google Sheets!`);

        } catch (error) {
            alert('Błąd odczytu schowka. Upewnij się, że przeglądarka ma uprawnienia lub skopiowałeś tekst.');
        }
    };

    return (
        <div style={{ padding: '2rem', height: '100%', display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                <div>
                    <h2 style={{ fontSize: '1.875rem', margin: '0 0 0.5rem 0' }}>Laboratorium Testowe</h2>
                    <p style={{ margin: 0, color: 'var(--text-secondary)' }}>Wgraj zdjęcia znamion i testuj odpowiedzi LLM-ów równolegle.</p>
                </div>

                <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                    {experimentItems.length > 0 && (
                        <div style={{ display: 'flex', gap: '0.5rem', marginRight: '1rem', borderRight: '1px solid var(--border-color)', paddingRight: '1rem' }}>
                            <button className="ghost" onClick={handleExportCSV} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem' }} title="Pobierz wyniki do pliku CSV (Excel)">
                                <Download size={16} /> CSV
                            </button>
                            <button className="ghost" onClick={handleExportJSON} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem' }} title="Pobierz lekki zrzut JSON bez obrazów">
                                <Download size={16} /> JSON
                            </button>
                        </div>
                    )}

                    {experimentItems.length > 0 && (
                        <div style={{ display: 'flex', gap: '0.5rem', marginRight: '1rem', borderRight: '1px solid var(--border-color)', paddingRight: '1rem' }}>
                            <button className="ghost" onClick={handleCopyForSheets} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem', color: '#10b981' }} title="Kopiuj złączoną tabelę gotową do wklejenia w Google Sheets (CMD+C)">
                                <ClipboardCopy size={16} /> Sheets (Kopiuj Wyniki)
                            </button>
                            <button className="ghost" onClick={handlePasteFromSheets} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem', color: '#10b981' }} title="Wklej skopiowaną kolumnę promptów z Google Sheets (CMD+V)">
                                <ClipboardPaste size={16} /> Sheets (Wklej Prompty)
                            </button>
                        </div>
                    )}

                    {experimentItems.length > 0 && (
                        <button
                            className="ghost"
                            onClick={clearExperiment}
                            style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
                        >
                            <Trash2 size={18} /> Wyczyść ({experimentItems.length})
                        </button>
                    )}
                    <button
                        className="secondary"
                        onClick={startBatchExecution}
                        disabled={experimentItems.length === 0}
                        style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', opacity: experimentItems.length === 0 ? 0.5 : 1 }}
                        title="Tworzy pakiety (Batch API). Do -50% tańsze, czas 24h."
                    >
                        <Zap size={18} /> Wyślij Batch (-50%)
                    </button>
                    <button
                        className="primary"
                        onClick={handleRunLive}
                        disabled={experimentItems.length === 0}
                        style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', opacity: experimentItems.length === 0 ? 0.5 : 1 }}
                    >
                        <PlayCircle size={18} /> Uruchom Test "Live"
                    </button>
                </div>
            </div>

            {experimentItems.length === 0 ? (
                <div
                    onDrop={handleDrop}
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    style={{
                        flex: 1,
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        border: `2px dashed ${isDragging ? 'var(--accent-color)' : 'var(--border-color)'}`,
                        borderRadius: '1rem',
                        backgroundColor: isDragging ? 'rgba(59, 130, 246, 0.05)' : 'var(--panel-bg)',
                        transition: 'all 0.2s ease',
                        color: 'var(--text-secondary)',
                        gap: '1rem'
                    }}
                >
                    <div style={{ padding: '1.5rem', borderRadius: '50%', backgroundColor: 'var(--bg-color)', color: 'var(--accent-color)' }}>
                        <UploadCloud size={64} style={{ margin: '1.5rem' }} />
                    </div>
                    <h3>Przeciągnij i upuść obrazy tutaj</h3>
                    <p>Obsługujemy paczki od 1 do 500 zdjęć (.jpg, .png).</p>
                </div>
            ) : (
                <div style={{ flex: 1, overflow: 'auto', backgroundColor: 'var(--panel-bg)', borderRadius: '1rem', border: '1px solid var(--border-color)' }}>
                    <ExperimentTable />
                </div>
            )}
        </div>
    );
};
