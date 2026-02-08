import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

async function proxyRequest(req: NextRequest, method: 'GET' | 'PATCH') {
    try {
        const authHeader = req.headers.get('authorization');

        if (!authHeader) {
            return NextResponse.json(
                { message: 'Unauthorized' },
                { status: 401 }
            );
        }

        const backendUrl = process.env.INTERNAL_API_URL || 'http://backend:8000';

        const options: RequestInit = {
            method,
            headers: {
                'Authorization': authHeader,
                'Content-Type': 'application/json',
            },
        };

        if (method === 'PATCH') {
            const body = await req.json();
            options.body = JSON.stringify(body);
        }

        const response = await fetch(`${backendUrl}/api/auth/me`, options);
        const data = await response.json();

        if (!response.ok) {
            return NextResponse.json(
                data,
                { status: response.status }
            );
        }

        return NextResponse.json(data, { status: 200 });

    } catch (error) {
        console.error(`Profile ${method} proxy error:`, error);
        return NextResponse.json(
            { message: 'Internal server error processing profile request' },
            { status: 500 }
        );
    }
}

export async function GET(req: NextRequest) {
    return proxyRequest(req, 'GET');
}

export async function PATCH(req: NextRequest) {
    return proxyRequest(req, 'PATCH');
}
