import type { GenerateParams, GenerateResult } from '../ModelProvider';
import { ModelProvider } from '../ModelProvider';

export class OpenAIProvider extends ModelProvider {
    readonly providerId = 'openai';
    protected baseURL: string;

    constructor(apiKey: string, baseURL?: string) {
        super(apiKey);
        this.baseURL = baseURL || 'https://api.openai.com/v1';
    }

    async generateLive(modelId: string, params: GenerateParams): Promise<GenerateResult> {
        if (!this.apiKey) {
            return { text: '', error: 'Brak klucza API dla OpenAI' };
        }

        try {
            const messages: any[] = [];

            if (params.systemPrompt) {
                messages.push({ role: 'system', content: params.systemPrompt });
            }

            const userContent: any[] = [{ type: 'text', text: params.prompt }];

            if (params.base64Image) {
                userContent.push({
                    type: 'image_url',
                    image_url: {
                        url: params.base64Image,
                    },
                });
            }

            messages.push({ role: 'user', content: userContent });

            // Build the body, injecting params if they exist
            // OpenAI and mostly compatible providers (like OpenRouter) accept these flags
            const reqBody: any = {
                model: modelId,
                messages,
                max_tokens: params.generationParams?.max_tokens ?? 1000,
            };

            if (params.generationParams) {
                // OpenAI 'o' series models might reject some parameters, but since we are standardizing
                // we push them as defined by the user
                reqBody.temperature = params.generationParams.temperature;
                reqBody.top_p = params.generationParams.top_p;
                reqBody.presence_penalty = params.generationParams.presence_penalty;
                reqBody.frequency_penalty = params.generationParams.frequency_penalty;

                // top_k is generally not supported natively by OpenAI standard chat/completions but OpenRouter or Together might interpret it
                // we include it. If OpenAI rejects it in standard calls on o1, it might need stripping later.
                if (params.generationParams.top_k !== undefined) {
                    reqBody.top_k = params.generationParams.top_k;
                }
            }

            const response = await fetch(`${this.baseURL}/chat/completions`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.apiKey}`,
                },
                body: JSON.stringify(reqBody),
            });

            if (!response.ok) {
                const errBody = await response.text();
                throw new Error(`OpenAI API Error: ${response.status} ${errBody}`);
            }

            const data = await response.json();

            return {
                text: data.choices[0]?.message?.content || '',
                usage: {
                    promptTokens: data.usage?.prompt_tokens || 0,
                    completionTokens: data.usage?.completion_tokens || 0,
                    totalTokens: data.usage?.total_tokens || 0,
                }
            };
        } catch (error: any) {
            return { text: '', error: error.message || 'Nieznany błąd podczas łączenia z OpenAI' };
        }
    }

    async createBatchJob(modelId: string, requests: GenerateParams[]): Promise<string> {
        if (!this.apiKey) {
            throw new Error('Brak klucza API dla OpenAI');
        }

        const jsonlLines = requests.map((req, index) => {
            const messages: any[] = [];
            if (req.systemPrompt) {
                messages.push({ role: 'system', content: req.systemPrompt });
            }

            const userContent: any[] = [{ type: 'text', text: req.prompt }];
            if (req.base64Image) {
                userContent.push({
                    type: 'image_url',
                    image_url: { url: req.base64Image },
                });
            }
            messages.push({ role: 'user', content: userContent });

            const reqBody: any = {
                model: modelId,
                messages,
                max_tokens: req.generationParams?.max_tokens ?? 1000,
            };

            if (req.generationParams) {
                reqBody.temperature = req.generationParams.temperature;
                reqBody.top_p = req.generationParams.top_p;
                reqBody.presence_penalty = req.generationParams.presence_penalty;
                reqBody.frequency_penalty = req.generationParams.frequency_penalty;
                if (req.generationParams.top_k !== undefined) {
                    reqBody.top_k = req.generationParams.top_k;
                }
                if (req.generationParams.seed !== undefined) {
                    reqBody.seed = req.generationParams.seed;
                }
            }

            return JSON.stringify({
                custom_id: req.customId || `request-${index}`,
                method: 'POST',
                url: '/v1/chat/completions',
                body: reqBody
            });
        });

        const jsonlString = jsonlLines.join('\n');
        const blob = new Blob([jsonlString], { type: 'application/jsonl' });
        const formData = new FormData();
        formData.append('file', blob, 'batch.jsonl');
        formData.append('purpose', 'batch');

        // 1. Upload File
        const fileRes = await fetch(`${this.baseURL}/files`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${this.apiKey}`,
            },
            body: formData,
        });

        if (!fileRes.ok) {
            const err = await fileRes.text();
            throw new Error(`OpenAI Upload Error: ${fileRes.status} ${err}`);
        }

        const fileData = await fileRes.json();
        const fileId = fileData.id;

        // 2. Create Batch
        const batchRes = await fetch(`${this.baseURL}/batches`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${this.apiKey}`,
            },
            body: JSON.stringify({
                input_file_id: fileId,
                endpoint: '/v1/chat/completions',
                completion_window: '24h'
            }),
        });

        if (!batchRes.ok) {
            const err = await batchRes.text();
            throw new Error(`OpenAI Batch Create Error: ${batchRes.status} ${err}`);
        }

        const batchData = await batchRes.json();
        return batchData.id;
    }

    async checkBatchStatus(batchId: string): Promise<any> {
        if (!this.apiKey) {
            throw new Error('Brak klucza API dla OpenAI');
        }

        const res = await fetch(`${this.baseURL}/batches/${batchId}`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${this.apiKey}`,
            },
        });

        if (!res.ok) {
            const err = await res.text();
            throw new Error(`OpenAI Batch Status Error: ${res.status} ${err}`);
        }

        return await res.json();
    }

    async getBatchResults(batchId: string): Promise<Record<string, GenerateResult>> {
        if (!this.apiKey) {
            throw new Error('Brak klucza API dla OpenAI');
        }

        // 1. Get batch info to get output_file_id
        const batchInfoRes = await fetch(`${this.baseURL}/batches/${batchId}`, {
            headers: { 'Authorization': `Bearer ${this.apiKey}` }
        });

        if (!batchInfoRes.ok) throw new Error('OpenAI status fetch failed');
        const batchInfo = await batchInfoRes.json();

        if (batchInfo.status !== 'completed' || !batchInfo.output_file_id) {
            throw new Error(`Batch status is ${batchInfo.status}, output file not ready`);
        }

        // 2. Get file content
        const fileContentRes = await fetch(`${this.baseURL}/files/${batchInfo.output_file_id}/content`, {
            headers: { 'Authorization': `Bearer ${this.apiKey}` }
        });

        if (!fileContentRes.ok) throw new Error('OpenAI file content fetch failed');
        const content = await fileContentRes.text();

        const lines = content.split('\n').filter(l => l.trim() !== '');
        const resultMap: Record<string, GenerateResult> = {};

        for (const line of lines) {
            try {
                const parsed = JSON.parse(line);
                const customId = parsed.custom_id;

                // OpenAI format has response details inside `response.body`
                if (parsed.response?.status_code === 200) {
                    const body = parsed.response.body;
                    resultMap[customId] = {
                        text: body.choices[0]?.message?.content || '',
                        usage: {
                            promptTokens: body.usage?.prompt_tokens || 0,
                            completionTokens: body.usage?.completion_tokens || 0,
                            totalTokens: body.usage?.total_tokens || 0,
                        }
                    };
                } else {
                    resultMap[customId] = {
                        text: '',
                        error: `HTTP ${parsed.response?.status_code}`
                    };
                }

            } catch (e) {
                console.error("OpenAI JSONL Parse Error:", line);
            }
        }

        return resultMap;
    }
}
