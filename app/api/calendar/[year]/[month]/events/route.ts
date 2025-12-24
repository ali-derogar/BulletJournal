import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ year: string; month: string }> }
) {
  try {
    const { year, month } = await params;

    // Proxy to backend
    const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://backend:8000';
    const backendUrl = `${apiBaseUrl}/api/calendar/${year}/${month}/events`;
    console.log(`[Calendar API Route] Proxying to backend: ${backendUrl}`);

    const response = await fetch(backendUrl, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (response.ok) {
      const data = await response.json();
      console.log(`[Calendar API Route] Backend response: ${data.total_events} events, ${data.total_holidays} holidays`);
      return NextResponse.json(data);
    } else {
      console.error(`[Calendar API Route] Backend error:`, response.status, response.statusText);
      // Return empty data structure
      return NextResponse.json({
        year: parseInt(year),
        month: parseInt(month),
        day: 0,
        events: [],
        holidays: [],
        total_events: 0,
        total_holidays: 0,
      });
    }
  } catch (error) {
    console.error(`[Calendar API Route] Error proxying to backend:`, error);
    const resolvedParams = await params;
    return NextResponse.json({
      year: parseInt(resolvedParams.year),
      month: parseInt(resolvedParams.month),
      day: 0,
      events: [],
      holidays: [],
      total_events: 0,
      total_holidays: 0,
    });
  }
}
