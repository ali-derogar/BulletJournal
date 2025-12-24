import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ year: string; month: string; day: string }> }
) {
  try {
    const { year, month, day } = await params;

    // Proxy to backend
    const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
    const backendUrl = `${apiBaseUrl}/api/holidays/${year}/${month}/${day}`;
    console.log(`[API Route] NEXT_PUBLIC_API_URL: ${process.env.NEXT_PUBLIC_API_URL}`);
    console.log(`[API Route] Proxying to backend: ${backendUrl}`);

    const response = await fetch(backendUrl, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (response.ok) {
      const data = await response.json();
      console.log(`[API Route] Backend response:`, data);
      return NextResponse.json(data);
    } else {
      console.error(`[API Route] Backend error:`, response.status);
      // Return safe default
      return NextResponse.json({
        date: `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`,
        title: "",
        holiday: false
      });
    }
  } catch (error) {
    console.error(`[API Route] Error proxying to backend:`, error);
    // Return safe default
    const resolvedParams = await params;
    return NextResponse.json({
      date: `${resolvedParams.year}-${resolvedParams.month.padStart(2, '0')}-${resolvedParams.day.padStart(2, '0')}`,
      title: "",
      holiday: false
    });
  }
}