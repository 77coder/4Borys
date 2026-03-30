import type { GenerateParams, GenerateResult } from '../ModelProvider';
import { ModelProvider } from '../ModelProvider';

export class AnthropicProvider extends ModelProvider {
    readonly providerId = 'anthropic';

    async generateLive(modelId: string, params: GenerateParams): Promise<GenerateResult> {
        if (!this.apiKey) {
            return { text: '', error: 'Brak klucza API dla Anthropic' };
        }

        try {
            const content: any[] = [];

            if (params.base64Image) {
                // base64Image is typically 'data:image/jpeg;base64,...'
                const match = params.base64Image.match(/^data:(image\/[a-zA-Z]+);base64,(.*)$/);
                if (match) {
                    const mediaType = match[1];
                    const base64Data = match[2];
                    content.push({
                        type: 'image',
                        source: {
                            type: 'base64',
                            media_type: mediaType,
                            data: base64Data,
                        }
                    });
                }
            }

            content.push({ type: 'text', text: params.prompt });

            const requestBody: any = {
                model: modelId,
                max_tokens: params.generationParams?.max_tokens ?? 4096, // Anthropic defaults higher usually
                messages: [{ role: 'user', content }],
            };

            if (params.generationParams) {
                requestBody.temperature = params.generationParams.temperature;
                requestBody.top_p = params.generationParams.top_p;
                if (params.generationParams.top_k !== undefined) {
                    requestBody.top_k = params.generationParams.top_k;
                }
                // Note: Anthropic officially supports temperature, top_p, top_k.
                // It does not support frequency_penalty and presence_penalty in standard messages API.
            }

            if (params.systemPrompt) {
                requestBody.system = params.systemPrompt;
            }

            const response = await fetch('https://api.anthropic.com/v1/messages', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-api-key': this.apiKey,
                    'anthropic-version': '2023-06-01',
                    'anthropic-dangerous-direct-browser-access': 'true', // Required for Client-side fetches
                },
                body: JSON.stringify(requestBody),
            });

            if (!response.ok) {
                const errBody = await response.text();
                throw new Error(`Anthropic API Error: ${response.status} ${errBody}`);
            }

            const data = await response.json();

            return {
                text: data.content[0]?.text || '',
                usage: {
                    promptTokens: data.usage?.input_tokens || 0,
                    completionTokens: data.usage?.output_tokens || 0,
                    totalTokens: (data.usage?.input_tokens || 0) + (data.usage?.output_tokens || 0),
                }
            };
        } catch (error: any) {
            return { text: '', error: error.message || 'Nieznany błąd podczas łączenia z Anthropic' };
        }
    }

    async createBatchJob(modelId: string, requests: GenerateParams[]): Promise<string> {
        if (!this.apiKey) {
            throw new Error('Brak klucza API dla Anthropic');
        }

        const batchRequests = requests.map((req, index) => {
            const content: any[] = [];

            if (req.base64Image) {
                const match = req.base64Image.match(/^data:(image\/[a-zA-Z]+);base64,(.*)$/);
                if (match) {
                    content.push({
                        type: 'image',
                        source: {
                            type: 'base64',
                            media_type: match[1],
                            data: match[2],
                        }
                    });
                }
            }

            content.push({ type: 'text', text: req.prompt });

            const requestBody: any = {
                model: modelId,
                max_tokens: req.generationParams?.max_tokens ?? 4096,
                messages: [{ role: 'user', content }],
            };

            if (req.generationParams) {
                requestBody.temperature = req.generationParams.temperature;
                requestBody.top_p = req.generationParams.top_p;
                if (req.generationParams.top_k !== undefined) {
                    requestBody.top_k = req.generationParams.top_k;
                }
            }

            if (req.systemPrompt) {
                requestBody.system = req.systemPrompt;
            }

            return {
                custom_id: req.customId || `request-${index}`,
                params: requestBody
            };
        });

        const res = await fetch('https://api.anthropic.com/v1/messages/batches', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-api-key': this.apiKey,
                'anthropic-version': '2023-06-01',
                'anthropic-dangerous-direct-browser-access': 'true',
            },
            body: JSON.stringify({ requests: batchRequests }),
        });

        if (!res.ok) {
            const err = await res.text();
            throw new Error(`Anthropic Batch Create Error: ${res.status} ${err}`);
        }

        const data = await res.json();
        return data.id;
    }

    async checkBatchStatus(batchId: string): Promise<any> {
        if (!this.apiKey) {
            throw new Error('Brak klucza API dla Anthropic');
        }

        const res = await fetch(`https://api.anthropic.com/v1/messages/batches/${batchId}`, {
            method: 'GET',
            headers: {
                'x-api-key': this.apiKey,
                'anthropic-version': '2023-06-01',
                'anthropic-dangerous-direct-browser-access': 'true',
            },
        });

        if (!res.ok) {
            const err = await res.text();
            throw new Error(`Anthropic Batch Status Error: ${res.status} ${err}`);
        }

        return await res.json();
    }

    async getBatchResults(batchId: string): Promise<Record<string, GenerateResult>> {
        if (!this.apiKey) {
            throw new Error('Brak klucza API dla Anthropic');
        }

        // 1. Get Batch Status to grab `results_url`
        const statusRes = await fetch(`https://api.anthropic.com/v1/messages/batches/${batchId}`, {
            method: 'GET',
            headers: {
                'x-api-key': this.apiKey,
                'anthropic-version': '2023-06-01',
                'anthropic-dangerous-direct-browser-access': 'true',
            },
        });

        if (!statusRes.ok) throw new Error(`Anthropic Error: ${statusRes.status}`);
        const statusData = await statusRes.json();

        if (statusData.processing_status !== 'ended') {
            throw new Error('Batch is not yet completed');
        }

        const resultsUrl = statusData.results_url;
        if (!resultsUrl) {
            throw new Error('No results URL found for batch');
        }

        // 2. Fetch the actual JSONL results from the results_url (which requires auth headers)
        const resultsRes = await fetch(resultsUrl, {
            method: 'GET',
            headers: {
                'x-api-key': this.apiKey,
                'anthropic-version': '2023-06-01',
                'anthropic-dangerous-direct-browser-access': 'true',
            },
        });

        if (!resultsRes.ok) throw new Error(`Anthropic Results Fetch Error`);

        const resultsText = await resultsRes.text();
        const lines = resultsText.split('\n').filter(l => l.trim() !== '');

        const resultMap: Record<string, GenerateResult> = {};

        for (const line of lines) {
            try {
                const parsed = JSON.parse(line);
                const customId = parsed.custom_id;

                if (parsed.result?.type === 'succeeded') {
                    const msg = parsed.result.message;
                    resultMap[customId] = {
                        text: msg.content[0]?.text || '',
                        usage: {
                            promptTokens: msg.usage?.input_tokens || 0,
                            completionTokens: msg.usage?.output_tokens || 0,
                            totalTokens: (msg.usage?.input_tokens || 0) + (msg.usage?.output_tokens || 0),
                        }
                    };
                } else if (parsed.result?.type === 'errored') {
                    resultMap[customId] = {
                        text: '',
                        error: parsed.result.error?.message || 'Error processing this item'
                    };
                }
            } catch (e) {
                console.error("Failed to parse anthropic result line", line);
            }
        }

        return resultMap;
    }
}
