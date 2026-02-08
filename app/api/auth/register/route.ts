import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();

        // Internal backend URL - use docker service name if available, otherwise fallback
        // In production docker-compose, 'backend' is the service name
        const backendUrl = process.env.INTERNAL_API_URL || 'http://backend:8000';

        // Validate required fields
        if (!body.email || !body.password || !body.username || !body.name) {
            return NextResponse.json(
                { message: 'Missing required fields' },
                { status: 400 }
            );
        }

        const response = await fetch(`${backendUrl}/api/auth/register`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(body),
        });

        const data = await response.json();

        if (!response.ok) {
            // Forward backend error
            return NextResponse.json(
                data,
                { status: response.status }
            );
        }

        // Success
        return NextResponse.json(data, { status: 201 });

    } catch (error) {
        console.error('Registration proxy error:', error);
        return NextResponse.json(
            { message: 'Internal server error processing registration' },
            { status: 500 }
        );
    }
}
