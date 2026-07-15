// Gemini AI summarization service
// Uses REST API directly — no SDK needed, keeps dependencies minimal
// Called only when: command is /report AND server has ai_enabled: true

const GEMINI_API_URL =
    'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent';

export interface GeminiResult {
    summary: string;
    tags: string[];
}

export async function summarizeReport(text: string): Promise<GeminiResult | null> {
    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
        console.warn('[gemini] GEMINI_API_KEY not set, skipping AI');
        return null;
    }

    const prompt = `You are a support triage assistant. Analyze this report and respond with JSON only.
Report: "${text}"

Respond with this exact JSON format (no markdown, no code blocks):
{"summary": "one sentence summary", "tags": ["tag1", "tag2"]}`;

    try {
        const res = await fetch(`${GEMINI_API_URL}?key=${apiKey}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{ parts: [{ text: prompt }] }],
                generationConfig: { temperature: 0.2 }  // low temp = consistent, structured output
            }),
        });

        if (!res.ok) {
            const errBody = await res.text();
            console.error('[gemini] API error:', res.status, errBody);
            return null;
        }

        const data = await res.json() as any;
        const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text ?? '';

        // Parse the JSON response from Gemini
        const parsed = JSON.parse(rawText.trim()) as GeminiResult;
        return parsed;

    } catch (err) {
        console.error('[gemini] Failed to summarize:', err);
        return null;
    }
}
