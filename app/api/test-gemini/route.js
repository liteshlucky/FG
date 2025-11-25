import { NextResponse } from 'next/server';

export async function GET() {
    try {
        const apiKey = process.env.GEMINI_API_KEY;
        if (!apiKey) {
            return NextResponse.json({ error: 'No API key' }, { status: 500 });
        }

        // Try direct API call to test the key
        const response = await fetch(
            `https://generativelanguage.googleapis.com/v1/models?key=${apiKey}`
        );

        const data = await response.json();

        if (!response.ok) {
            return NextResponse.json({
                success: false,
                error: data.error?.message || 'API call failed',
                status: response.status
            });
        }

        // Extract model names
        const models = data.models?.map(m => m.name) || [];

        return NextResponse.json({
            success: true,
            models,
            availableForGeneration: models.filter(m => m.includes('gemini'))
        });
    } catch (error) {
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
