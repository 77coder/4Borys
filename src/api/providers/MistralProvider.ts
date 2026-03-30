import type { GenerateParams, GenerateResult } from '../ModelProvider';
import { ModelProvider } from '../ModelProvider';

export class MistralProvider extends ModelProvider {
    readonly providerId = 'mistral';

    async generateLive(modelId: string, params: GenerateParams): Promise<GenerateResult> {
        if (!this.apiKey) {
            return { text: '', error: 'Brak klucza API dla Mistral' };
        }

        try {
            const messages: any[] = [];

            if (params.systemPrompt) {
                messages.push({ role: 'system', content: params.systemPrompt });
            }

            const content: any[] = [{ type: 'text', text: params.prompt }];

            if (params.base64Image) {
                content.push({
                    type: 'image_url',
                    image_url: params.base64Image,
                });
            }

            messages.push({ role: 'user', content });

            const reqBody: any = {
                model: modelId,
                messages,
                max_tokens: params.generationParams?.max_tokens ?? 1000,
            };

            if (params.generationParams) {
                reqBody.temperature = params.generationParams.temperature;
                reqBody.top_p = params.generationParams.top_p;
                if (params.generationParams.seed !== null && params.generationParams.seed !== undefined) {
                    reqBody.random_seed = params.generationParams.seed;
                }
            }

            const response = await fetch('https://api.mistral.ai/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.apiKey}`,
                },
                body: JSON.stringify(reqBody),
            });

            if (!response.ok) {
                const errBody = await response.text();
                throw new Error(`Mistral API Error: ${response.status} ${errBody}`);
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
            return { text: '', error: error.message || 'Nieznany błąd podczas łączenia z Mistral AI' };
        }
    }
}
