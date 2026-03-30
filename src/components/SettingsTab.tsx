import React from 'react';
import { useAppStore, type AppSettings } from '../store';
import { Shield, Key, Sliders, MessageSquare } from 'lucide-react';

export const SettingsTab: React.FC = () => {
    const settings = useAppStore();

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        if (name === 'concurrencyLimit') {
            settings.updateSettings({ [name]: parseInt(value) || 1 });
        } else if (name.startsWith('gen_')) {
            const paramName = name.replace('gen_', '');
            let numValue: number | null = Number(value);
            if (paramName === 'seed' && value === '') {
                numValue = null;
            } else if (isNaN(numValue)) { // Handle cases where parsing to number fails for other gen params
                numValue = 0; // Default to 0 or another sensible default
            }
            settings.updateGenerationParams({
                [paramName]: numValue
            });
        } else if (['temperature', 'top_p', 'top_k', 'max_tokens', 'presence_penalty', 'frequency_penalty'].includes(name)) {
            settings.updateGenerationParams({ [name]: parseFloat(value) || 0 });
        } else {
            settings.updateSettings({ [name]: value });
        }
    };

    const [newModel, setNewModel] = React.useState({
        id: '',
        name: '',
        provider: 'openai',
        worksWithImages: true,
        supportsBatch: false
    });

    const handleAddModel = (e: React.FormEvent) => {
        e.preventDefault();
        if (!newModel.id || !newModel.name) return;
        settings.addModel(newModel);
        setNewModel({
            id: '', name: '', provider: 'openai', worksWithImages: true, supportsBatch: false
        });
    };

    return (
        <div style={{ padding: '2rem', maxWidth: '800px', margin: '0 auto' }}>
            <div style={{ marginBottom: '2rem' }}>
                <h2 style={{ fontSize: '1.875rem', marginBottom: '0.5rem' }}>Ustawienia Aplikacji</h2>
                <p>Skonfiguruj klucze dostępowe do modeli oraz parametry eksperymentów.</p>

                <div style={{ marginTop: '1rem', padding: '1rem', backgroundColor: 'rgba(59, 130, 246, 0.1)', border: '1px solid var(--accent-color)', borderRadius: '0.5rem', display: 'flex', gap: '1rem', alignItems: 'flex-start' }}>
                    <Shield style={{ color: 'var(--accent-color)', flexShrink: 0 }} />
                    <div>
                        <h4 style={{ color: 'var(--accent-color)', margin: '0 0 0.5rem 0' }}>Bezpieczeństwo</h4>
                        <p style={{ margin: 0, fontSize: '0.875rem' }}>Twoje klucze są bezpieczne i nigdy nie opuszczają tej przeglądarki. Są zapisane wykorzystując mechanizm Local Storage Twojego urządzenia.</p>
                    </div>
                </div>
            </div>

            <div className="panel" style={{ marginBottom: '2rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.5rem' }}>
                    <Key size={20} style={{ color: 'var(--text-secondary)' }} />
                    <h3 style={{ margin: 0 }}>Klucze API</h3>
                </div>

                <div style={{ display: 'grid', gap: '1.5rem' }}>
                    {[
                        { label: 'OpenAI (GPT-4o)', name: 'openAIKey' as keyof AppSettings, placeholder: 'sk-...' },
                        { label: 'Anthropic (Claude)', name: 'anthropicKey' as keyof AppSettings, placeholder: 'sk-ant-...' },
                        { label: 'Google (Gemini)', name: 'googleKey' as keyof AppSettings, placeholder: 'AIza...' },
                        { label: 'Mistral AI', name: 'mistralKey' as keyof AppSettings, placeholder: 'Klucz API...' },
                        { label: 'xAI (Grok)', name: 'grokKey' as keyof AppSettings, placeholder: 'xai-...' },
                        { label: 'Moonshot (Kimi)', name: 'kimiKey' as keyof AppSettings, placeholder: 'sk-...' },
                        { label: 'DashScope (Qwen)', name: 'qwenKey' as keyof AppSettings, placeholder: 'sk-...' },
                        { label: 'Together AI (Llama)', name: 'llamaKey' as keyof AppSettings, placeholder: 'Klucz API do Together AI...' },
                        { label: 'OpenRouter', name: 'openRouterKey' as keyof AppSettings, placeholder: 'sk-or-v1-...' }
                    ].map((field) => (
                        <div key={field.name}>
                            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>{field.label}</label>
                            <input
                                type="password"
                                name={field.name}
                                value={settings[field.name as keyof AppSettings] as string}
                                onChange={handleChange}
                                placeholder={field.placeholder}
                                style={{
                                    width: '100%',
                                    padding: '0.75rem 1rem',
                                    borderRadius: '0.5rem',
                                    border: '1px solid var(--border-color)',
                                    backgroundColor: 'var(--bg-color)',
                                    color: 'var(--text-primary)',
                                    fontFamily: 'inherit',
                                    transition: 'border-color 0.2s'
                                }}
                            />
                        </div>
                    ))}
                </div>
            </div>

            <div className="panel" style={{ marginBottom: '2rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.5rem' }}>
                    <MessageSquare size={20} style={{ color: 'var(--text-secondary)' }} />
                    <h3 style={{ margin: 0 }}>Globalny Prompt</h3>
                </div>
                <p style={{ marginBottom: '1rem', fontSize: '0.875rem' }}>Ten tekst zostanie wysłany do modeli razem z wybranym przez Ciebie obrazkiem. Do każdego obrazka użyty zostanie ten sam prompt o ile globalnie nie zadecydujesz o jego zmianie w Laboratorium.</p>
                <textarea
                    name="globalPrompt"
                    value={settings.globalPrompt}
                    onChange={handleChange}
                    rows={4}
                    style={{
                        width: '100%',
                        padding: '0.75rem 1rem',
                        borderRadius: '0.5rem',
                        border: '1px solid var(--border-color)',
                        backgroundColor: 'var(--bg-color)',
                        color: 'var(--text-primary)',
                        fontFamily: 'inherit',
                        resize: 'vertical',
                        lineHeight: 1.5
                    }}
                />
            </div>

            <div className="panel" style={{ marginBottom: '2rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.5rem' }}>
                    <Sliders size={20} style={{ color: 'var(--text-secondary)' }} />
                    <h3 style={{ margin: 0 }}>Sterowanie zapytaniami "Live"</h3>
                </div>
                <p style={{ marginBottom: '1rem', fontSize: '0.875rem' }}>Zapytania do modeli są odpalane asynchronicznie i kolejkowane. Ten parametr chroni Cię przed wyrzutem setek requestów na sekundę, co zablokowałoby Twoje darmowe/osobiste API. Definiuje ile współbieżnych zapytań dla jednego modelu może trwać w tle.</p>

                <label style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem', fontWeight: 500 }}>
                    <span>Współbieżność (Zapytania w jednym momencie na API)</span>
                    <span style={{ color: 'var(--accent-color)' }}>{settings.concurrencyLimit} zapytania</span>
                </label>
                <input
                    type="range"
                    name="concurrencyLimit"
                    min="1"
                    max="10"
                    value={settings.concurrencyLimit}
                    onChange={handleChange}
                    style={{ width: '100%', cursor: 'pointer', accentColor: 'var(--accent-color)', height: '6px' }}
                />
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.5rem' }}>
                    <span>1 (Najbezpieczniej)</span>
                    <span>10 (Może zablokować darmowe API)</span>
                </div>
            </div>

            <div className="panel" style={{ marginBottom: '2rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.5rem' }}>
                    <Sliders size={20} style={{ color: 'var(--text-secondary)' }} />
                    <h3 style={{ margin: 0 }}>Zaawansowane Parametry Generowania</h3>
                </div>
                <p style={{ marginBottom: '1rem', fontSize: '0.875rem' }}>Te parametry sterują zachowaniem (kreatywnością, logiką i wylewnością) modeli językowych. Wartości zależą od dostawcy (niektóre, np. modele dedukcyjne, odrzucają na sztywno część parametrów).</p>

                <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)', gap: '1.5rem' }}>
                    <div>
                        <label style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem', fontWeight: 500, fontSize: '0.875rem' }}>
                            <span>Temperature</span>
                            <span style={{ color: 'var(--accent-color)' }}>{(settings.generationParams.temperature ?? 0.7).toFixed(2)}</span>
                        </label>
                        <input type="range" name="temperature" min="0" max="2" step="0.05" value={settings.generationParams.temperature} onChange={handleChange} style={{ width: '100%', cursor: 'pointer', accentColor: 'var(--accent-color)', height: '6px' }} />
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>Odpowiada za decyzyjną kreatywność. (0 = deteministyczny inżynieryjny, 1.5 = potężna kreatywność).</div>
                    </div>

                    <div>
                        <label style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem', fontWeight: 500, fontSize: '0.875rem' }}>
                            <span>Top P</span>
                            <span style={{ color: 'var(--accent-color)' }}>{(settings.generationParams.top_p ?? 1.0).toFixed(2)}</span>
                        </label>
                        <input type="range" name="top_p" min="0" max="1" step="0.05" value={settings.generationParams.top_p} onChange={handleChange} style={{ width: '100%', cursor: 'pointer', accentColor: 'var(--accent-color)', height: '6px' }} />
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>Alternatywa do temperatury zawężająca dystrybucję do rdzenia (nucleus sampling).</div>
                    </div>

                    <div>
                        <label style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem', fontWeight: 500, fontSize: '0.875rem' }}>
                            <span>Top K</span>
                            <span style={{ color: 'var(--accent-color)' }}>{settings.generationParams.top_k}</span>
                        </label>
                        <input type="range" name="top_k" min="0" max="100" step="1" value={settings.generationParams.top_k} onChange={handleChange} style={{ width: '100%', cursor: 'pointer', accentColor: 'var(--accent-color)', height: '6px' }} />
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>Wymagane przez Llama / Anthropic. Zawęża do K najbardziej celnych tokenów bazowych.</div>
                    </div>

                    <div>
                        <label style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem', fontWeight: 500, fontSize: '0.875rem' }}>
                            <span>Max Output Tokens</span>
                            <span style={{ color: 'var(--accent-color)' }}>{settings.generationParams.max_tokens}</span>
                        </label>
                        <input type="range" name="max_tokens" min="256" max="16384" step="256" value={settings.generationParams.max_tokens} onChange={handleChange} style={{ width: '100%', cursor: 'pointer', accentColor: 'var(--accent-color)', height: '6px' }} />
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>Maksymalna długość tekstu którą LLM może zwrócić (limit obcinający wynik).</div>
                    </div>

                    <div>
                        <label style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem', fontWeight: 500, fontSize: '0.875rem' }}>
                            <span>Presence Penalty</span>
                            <span style={{ color: 'var(--accent-color)' }}>{(settings.generationParams.presence_penalty ?? 0).toFixed(2)}</span>
                        </label>
                        <input type="range" name="presence_penalty" min="-2" max="2" step="0.1" value={settings.generationParams.presence_penalty} onChange={handleChange} style={{ width: '100%', cursor: 'pointer', accentColor: 'var(--accent-color)', height: '6px' }} />
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>Zniechęca do kręcenia się w okół tego samego tematu (-2 do 2).</div>
                    </div>

                    <div>
                        <label style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem', fontWeight: 500, fontSize: '0.875rem' }}>
                            <span>Frequency Penalty</span>
                            <span style={{ color: 'var(--accent-color)' }}>{(settings.generationParams.frequency_penalty ?? 0).toFixed(2)}</span>
                        </label>
                        <input type="range" name="frequency_penalty" min="-2" max="2" step="0.1" value={settings.generationParams.frequency_penalty} onChange={handleChange} style={{ width: '100%', cursor: 'pointer', accentColor: 'var(--accent-color)', height: '6px' }} />
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>Zniechęca używania dokładnie tych samych wyrazów/fraz.</div>
                    </div>
                </div>
            </div>

            <div className="panel" style={{ marginBottom: '2rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.5rem' }}>
                    <Shield size={20} style={{ color: 'var(--text-secondary)' }} />
                    <h3 style={{ margin: 0 }}>Zarządzanie modelami (Dynamiczne)</h3>
                </div>
                <p style={{ marginBottom: '1.5rem', fontSize: '0.875rem' }}>Dodawaj lub usuwaj modele widoczne w widoku Laboratorium. Modele dodawane użytkownika są zapisywane w pamięci przeglądarki.</p>

                {/* Formularz dodawania */}
                <form onSubmit={handleAddModel} style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.5fr) minmax(0, 1.5fr) minmax(0, 1fr) auto', gap: '1rem', alignItems: 'end', marginBottom: '2rem', background: 'var(--bg-color)', padding: '1rem', borderRadius: '0.5rem', border: '1px solid var(--border-color)' }}>
                    <div>
                        <label style={{ display: 'block', marginBottom: '0.25rem', fontSize: '0.75rem' }}>Wyświetlana nazwa (np. GPT-5)</label>
                        <input
                            type="text"
                            required
                            value={newModel.name}
                            onChange={e => setNewModel({ ...newModel, name: e.target.value })}
                            style={{ width: '100%', padding: '0.5rem', borderRadius: '0.25rem', border: '1px solid var(--border-color)', backgroundColor: 'var(--panel-bg)', color: 'var(--text-primary)' }}
                        />
                    </div>
                    <div>
                        <label style={{ display: 'block', marginBottom: '0.25rem', fontSize: '0.75rem' }}>Systemowe ID (np. gpt-5-turbo)</label>
                        <input
                            type="text"
                            required
                            value={newModel.id}
                            onChange={e => setNewModel({ ...newModel, id: e.target.value })}
                            style={{ width: '100%', padding: '0.5rem', borderRadius: '0.25rem', border: '1px solid var(--border-color)', backgroundColor: 'var(--panel-bg)', color: 'var(--text-primary)' }}
                        />
                    </div>
                    <div>
                        <label style={{ display: 'block', marginBottom: '0.25rem', fontSize: '0.75rem' }}>Podmiot API</label>
                        <select
                            value={newModel.provider}
                            onChange={e => setNewModel({ ...newModel, provider: e.target.value })}
                            style={{ width: '100%', padding: '0.5rem', borderRadius: '0.25rem', border: '1px solid var(--border-color)', backgroundColor: 'var(--panel-bg)', color: 'var(--text-primary)' }}
                        >
                            <option value="openai">OpenAI</option>
                            <option value="anthropic">Anthropic</option>
                            <option value="google">Google</option>
                            <option value="mistral">Mistral AI</option>
                            <option value="grok">xAI (Grok)</option>
                            <option value="kimi">Moonshot (Kimi)</option>
                            <option value="qwen">DashScope (Qwen)</option>
                            <option value="llama">Llama (Together AI)</option>
                            <option value="openrouter">OpenRouter (Dowolny Model)</option>
                        </select>
                    </div>
                    <div>
                        <button type="submit" className="primary" style={{ padding: '0.5rem 1rem' }}>Dodaj</button>
                    </div>
                    <div style={{ gridColumn: '1 / -1', display: 'flex', gap: '1.5rem', marginTop: '0.5rem' }}>
                        <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem', cursor: 'pointer' }}>
                            <input type="checkbox" checked={newModel.worksWithImages} onChange={e => setNewModel({ ...newModel, worksWithImages: e.target.checked })} />
                            Wspiera Obraz (Multimodalność)
                        </label>
                        <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem', cursor: 'pointer' }}>
                            <input type="checkbox" checked={newModel.supportsBatch} onChange={e => setNewModel({ ...newModel, supportsBatch: e.target.checked })} />
                            Wspiera oficjalny pakiet "Batch API"
                        </label>
                    </div>
                </form>

                {/* Lista modli */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    {settings.models.map(model => (
                        <div key={model.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.75rem 1rem', background: 'var(--bg-color)', borderRadius: '0.5rem', border: '1px solid var(--border-color)' }}>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                                <span style={{ fontWeight: 500 }}>{model.name}</span>
                                <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>ID: {model.id} | Router: {model.provider} | Batch: {model.supportsBatch ? 'Zgodny' : 'Brak'} | Obraz: {model.worksWithImages ? 'Zgodny' : 'Brak'}</span>
                            </div>
                            <button className="ghost" onClick={() => settings.removeModel(model.id)} style={{ color: 'var(--danger-color)', padding: '0.5rem' }} title="Usuń z laboratorium">
                                Usuń
                            </button>
                        </div>
                    ))}
                    {settings.models.length === 0 && (
                        <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
                            Brak skonfigurowanych modeli. Dodaj przynajmniej jeden model aby zarządzać widokiem Laboratorium.
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
