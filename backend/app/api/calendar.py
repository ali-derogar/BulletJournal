from fastapi import APIRouter, HTTPException
import httpx
from typing import Dict, Any, List, Optional
from datetime import datetime

router = APIRouter()


@router.get("/calendar/{year}/{month}")
async def get_calendar_month(
    year: int,
    month: int,
    day: int = 0,
    base1: int = 0,
    base2: int = 1,
    base3: int = 2
) -> Dict[str, Any]:
    """
    Fetch calendar data from Time.ir API for a specific Persian month

    Args:
        year: Jalali year (e.g., 1404)
        month: Jalali month (1-12)
        day: Jalali day (0 for entire month)
        base1, base2, base3: Calendar bases to include in response

    Returns:
        Calendar data including events, holidays, and day information
    """
    headers = {
        'User-Agent': 'Mozilla/5.0 (X11; Ubuntu; Linux x86_64; rv:146.0) Gecko/20100101 Firefox/146.0',
        'Accept': 'application/json, text/plain, */*',
        'Accept-Language': 'en-US,en;q=0.5',
        'x-api-key': 'ZAVdqwuySASubByCed5KYuYMzb9uB2f7',
        'Origin': 'https://www.time.ir',
        'Connection': 'keep-alive',
        'Referer': 'https://www.time.ir/',
        'Sec-Fetch-Dest': 'empty',
        'Sec-Fetch-Mode': 'cors',
        'Sec-Fetch-Site': 'same-site',
        'Priority': 'u=0',
    }

    params = {
        'year': str(year),
        'month': str(month),
        'day': str(day),
        'base1': str(base1),
        'base2': str(base2),
        'base3': str(base3),
    }

    try:
        async with httpx.AsyncClient() as client:
            response = await client.get(
                'https://api.time.ir/v1/event/fa/events/calendar',
                params=params,
                headers=headers,
                timeout=10.0
            )
            response.raise_for_status()
            return response.json()
    except httpx.HTTPError as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch calendar: {str(e)}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Unexpected error: {str(e)}")


@router.get("/calendar/{year}/{month}/events")
async def get_calendar_events(
    year: int,
    month: int,
    day: int = 0
) -> Dict[str, Any]:
    """
    Fetch and format calendar events for a specific Persian month

    Returns formatted events with holiday information
    """
    try:
        # Fetch full calendar data
        calendar_data = await get_calendar_month(year, month, day)

        if not calendar_data or 'data' not in calendar_data:
            return {
                'year': year,
                'month': month,
                'events': [],
                'holidays': []
            }

        # Extract and format events
        events = []
        holidays = []
        event_list = calendar_data['data'].get('event_list', [])

        for event in event_list:
            formatted_event = {
                'id': event['id'],
                'title': event['title'],
                'description': event.get('body', ''),
                'is_holiday': event['is_holiday'],
                'jalali_date': f"{event['jalali_year']}-{event['jalali_month']:02d}-{event['jalali_day']:02d}",
                'gregorian_date': f"{event['gregorian_year']}-{event['gregorian_month']:02d}-{event['gregorian_day']:02d}",
                'hijri_date': f"{event['hijri_year']}-{event['hijri_month']:02d}-{event['hijri_day']:02d}",
                'jalali_day_title': event.get('jalali_day_title', ''),
                'gregorian_day_title': event.get('gregorian_day_title', ''),
                'date_string': event.get('date_string', ''),
                'base': event.get('base', 0),  # 0=Persian, 1=Gregorian, 2=Hijri
            }
            events.append(formatted_event)

            if event['is_holiday']:
                holidays.append(formatted_event)

        return {
            'year': year,
            'month': month,
            'day': day,
            'events': events,
            'holidays': holidays,
            'total_events': len(events),
            'total_holidays': len(holidays),
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to process events: {str(e)}")


@router.get("/calendar/{year}/{month}/{day}/info")
async def get_day_info(year: int, month: int, day: int) -> Dict[str, Any]:
    """
    Get detailed information for a specific day including events and holidays
    """
    try:
        calendar_data = await get_calendar_month(year, month, day)

        if not calendar_data or 'data' not in calendar_data:
            return {
                'jalali_date': f"{year}-{month:02d}-{day:02d}",
                'events': [],
                'is_holiday': False,
                'is_weekend': False,
            }

        # Find events for this specific day
        event_list = calendar_data['data'].get('event_list', [])
        day_events = [
            event for event in event_list
            if event['jalali_day'] == day and event['jalali_month'] == month
        ]

        # Find day info from day_list
        day_list = calendar_data['data'].get('day_list', [])
        day_info = next(
            (d for d in day_list if d.get('index_in_base1') == day),
            None
        )

        is_holiday = any(event['is_holiday'] for event in day_events)
        is_weekend = day_info.get('is_weekend', False) if day_info else False

        return {
            'jalali_date': f"{year}-{month:02d}-{day:02d}",
            'events': [
                {
                    'title': event['title'],
                    'description': event.get('body', ''),
                    'is_holiday': event['is_holiday'],
                    'base': event['base'],
                }
                for event in day_events
            ],
            'is_holiday': is_holiday or day_info.get('is_holiday', False) if day_info else is_holiday,
            'is_weekend': is_weekend,
            'is_today': day_info.get('is_today', False) if day_info else False,
            'enabled': day_info.get('enabled', True) if day_info else True,
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get day info: {str(e)}")


@router.get("/calendar/current")
async def get_current_month_calendar() -> Dict[str, Any]:
    """
    Get calendar for current Persian month
    """
    try:
        # Try to import jdatetime, fallback to current Jalali year/month if not available
        try:
            from jdatetime import datetime as jdatetime_dt
            now = jdatetime_dt.now()
            year = now.year
            month = now.month
        except ImportError:
            # Fallback: use a default or current known Jalali date
            # You can calculate this from Gregorian date or use a default
            year = 1404
            month = 11

        return await get_calendar_events(year, month)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get current calendar: {str(e)}")


@router.get("/holidays/{year}/{month}/{day}")
async def get_holiday_legacy(year: int, month: int, day: int) -> Dict[str, Any]:
    """
    Legacy endpoint for backward compatibility with existing frontend code.
    Returns holiday information in the old format.

    This endpoint is deprecated. Use /calendar/{year}/{month}/{day}/info instead.
    """
    try:
        # Get day info from the new API
        day_info = await get_day_info(year, month, day)

        if not day_info:
            return {
                "date": f"{year}-{month:02d}-{day:02d}",
                "title": "",
                "holiday": False
            }

        # Find the first holiday event for this day
        holiday_event = next(
            (event for event in day_info.get('events', []) if event.get('is_holiday')),
            None
        )

        if holiday_event:
            return {
                "date": day_info['jalali_date'],
                "title": holiday_event['title'],
                "holiday": True,
                "description": holiday_event.get('description', '')
            }

        # Check if it's marked as holiday even without specific event
        if day_info.get('is_holiday'):
            return {
                "date": day_info['jalali_date'],
                "title": "تعطیل",
                "holiday": True,
                "description": ""
            }

        # Not a holiday
        return {
            "date": day_info['jalali_date'],
            "title": "",
            "holiday": False
        }

    except Exception as e:
        # Return a safe default on error (like the old endpoint did)
        return {
            "date": f"{year}-{month:02d}-{day:02d}",
            "title": "",
            "holiday": False
        }
