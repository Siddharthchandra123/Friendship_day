import fetch from "node-fetch";

const GUARDRAIL_URL = "http://localhost:8000/moderate";

export interface ModerationResult {
    allowed: boolean;
    reason?: string;
    sanitizedText?: string;
}

export async function moderateText(
    text: string
): Promise<ModerationResult> {

    try {

        const response = await fetch(GUARDRAIL_URL, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                text,
            }),
        });

        return await response.json();

    } catch (err) {

        console.error("Guardrail Error", err);

        // Fail-open so chat still works if AI is down
        return {
            allowed: true,
            sanitizedText: text,
        };
    }
}