import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

async function handler(req: NextRequest, { params }: { params: { path: string[] } }) {
    try {
        const path = params.path.join('/');
        const method = req.method;
        const backendUrl = process.env.INTERNAL_API_URL || 'http://backend:8000';

        // Construct full backend URL with query string
        const url = new URL(`${backendUrl}/api/${path}`);
        req.nextUrl.searchParams.forEach((value, key) => {
            url.searchParams.append(key, value);
        });

        // Prepare headers
        const headers = new Headers();
        const authHeader = req.headers.get('authorization');
        if (authHeader) headers.set('Authorization', authHeader);

        const contentType = req.headers.get('content-type');
        if (contentType) headers.set('Content-Type', contentType);

        // Prepare body
        let body: BodyInit | null = null;
        if (method !== 'GET' && method !== 'HEAD') {
            const text = await req.text();
            if (text) body = text;
        }

        // Forward request
        const response = await fetch(url.toString(), {
            method,
            headers,
            body,
        });

        // Get response content
        const responseBody = await response.text();
        let data;
        try {
            data = JSON.parse(responseBody);
        } catch {
            data = responseBody; // non-JSON response
        }

        if (!response.ok) {
            // Try to parse error as JSON if possible
            const errorResponse = typeof data === 'object' ? data : { message: data || response.statusText };
            return NextResponse.json(errorResponse, { status: response.status });
        }

        // Return success response
        if (typeof data === 'object') {
            return NextResponse.json(data, { status: response.status });
        } else {
            return new NextResponse(data, { status: response.status });
        }

    } catch (error) {
        console.error(`Proxy error for ${req.url}:`, error);
        return NextResponse.json(
            { message: 'Internal server error during proxy request' },
            { status: 500 }
        );
    }
}

export { handler as GET, handler as POST, handler as PUT, handler as DELETE, handler as PATCH, handler as HEAD };
