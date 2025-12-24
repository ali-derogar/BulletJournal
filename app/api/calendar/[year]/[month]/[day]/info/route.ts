import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ year: string; month: string; day: string }> }
) {
  try {
    const { year, month, day } = await params;

    // Proxy to backend
    const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://backend:8000';
    const backendUrl = `${apiBaseUrl}/api/calendar/${year}/${month}/${day}/info`;
    console.log(`[Calendar Day Info API Route] Proxying to backend: ${backendUrl}`);

    const response = await fetch(backendUrl, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (response.ok) {
      const data = await response.json();
      console.log(`[Calendar Day Info API Route] Backend response for ${year}/${month}/${day}`);
      return NextResponse.json(data);
    } else {
      console.error(`[Calendar Day Info API Route] Backend error:`, response.status);
      // Return empty data structure
      return NextResponse.json({
        jalali_date: `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`,
        events: [],
        is_holiday: false,
        is_weekend: false,
        is_today: false,
        enabled: true,
      });
    }
  } catch (error) {
    console.error(`[Calendar Day Info API Route] Error proxying to backend:`, error);
    const resolvedParams = await params;
    return NextResponse.json({
      jalali_date: `${resolvedParams.year}-${resolvedParams.month.padStart(2, '0')}-${resolvedParams.day.padStart(2, '0')}`,
      events: [],
      is_holiday: false,
      is_weekend: false,
      is_today: false,
      enabled: true,
    });
  }
}
