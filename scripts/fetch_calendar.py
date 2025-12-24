"""
Script to fetch Persian calendar events from Time.ir API
Usage: python scripts/fetch_calendar.py --year 1404 --month 11
"""
import requests
import json
import argparse
from pathlib import Path
from datetime import datetime


def fetch_calendar_events(year: int, month: int, day: int = 0) -> dict:
    """
    Fetch calendar events from Time.ir API

    Args:
        year: Jalali year (e.g., 1404)
        month: Jalali month (1-12)
        day: Jalali day (0 for entire month)

    Returns:
        Dictionary containing calendar data
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
        'base1': '0',  # Persian calendar
        'base2': '1',  # Gregorian calendar
        'base3': '2',  # Hijri calendar
    }

    try:
        response = requests.get(
            'https://api.time.ir/v1/event/fa/events/calendar',
            params=params,
            headers=headers,
            timeout=10
        )
        response.raise_for_status()
        return response.json()
    except requests.exceptions.RequestException as e:
        print(f"Error fetching calendar: {e}")
        return None


def save_calendar_data(data: dict, output_path: str):
    """Save calendar data to JSON file"""
    output_file = Path(output_path)
    output_file.parent.mkdir(parents=True, exist_ok=True)

    with open(output_file, 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=2)

    print(f"Calendar data saved to: {output_file}")


def extract_events(calendar_data: dict) -> list:
    """
    Extract and format events from calendar data

    Returns:
        List of formatted event dictionaries
    """
    if not calendar_data or 'data' not in calendar_data:
        return []

    events = []
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
            'jalali_day_title': event['jalali_day_title'],
            'base': event['base'],  # 0=Persian, 1=Gregorian, 2=Hijri
        }
        events.append(formatted_event)

    return events


def get_calendar_info(calendar_data: dict) -> dict:
    """Extract calendar metadata"""
    if not calendar_data or 'data' not in calendar_data:
        return {}

    data = calendar_data['data']
    return {
        'year': data['year'],
        'month': data['month'],
        'day': data['day'],
        'created_date': data.get('created_date'),
        'calendar_details': data.get('calendar_detail_list', []),
        'days': data.get('day_list', []),
    }


def main():
    parser = argparse.ArgumentParser(description='Fetch Persian calendar events from Time.ir API')
    parser.add_argument('--year', type=int, required=True, help='Jalali year (e.g., 1404)')
    parser.add_argument('--month', type=int, required=True, help='Jalali month (1-12)')
    parser.add_argument('--day', type=int, default=0, help='Jalali day (0 for entire month)')
    parser.add_argument('--output', type=str, default='calender_response.json',
                       help='Output file path')
    parser.add_argument('--events-only', action='store_true',
                       help='Save only formatted events')

    args = parser.parse_args()

    print(f"Fetching calendar for {args.year}/{args.month}/{args.day}...")
    calendar_data = fetch_calendar_events(args.year, args.month, args.day)

    if not calendar_data:
        print("Failed to fetch calendar data")
        return

    if args.events_only:
        events = extract_events(calendar_data)
        output_data = {
            'events': events,
            'info': get_calendar_info(calendar_data),
            'fetched_at': datetime.now().isoformat(),
        }
        save_calendar_data(output_data, args.output)
        print(f"Extracted {len(events)} events")
    else:
        save_calendar_data(calendar_data, args.output)
        events = extract_events(calendar_data)
        print(f"Found {len(events)} events")

    # Print summary
    holidays = [e for e in events if e.get('is_holiday')]
    print(f"Holidays: {len(holidays)}")
    for holiday in holidays:
        print(f"  - {holiday['jalali_date']}: {holiday['title']}")


if __name__ == '__main__':
    main()
