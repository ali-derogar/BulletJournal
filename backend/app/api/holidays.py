from fastapi import APIRouter, HTTPException
import httpx
from typing import Dict, Any

router = APIRouter()

@router.get("/holidays/{year}/{month}/{day}")
async def get_holiday(year: int, month: int, day: int) -> Dict[str, Any]:
    """
    Proxy endpoint to fetch holiday data from holidayapi.ir
    """
    try:
        async with httpx.AsyncClient() as client:
            url = f"https://holidayapi.ir/jalali/{year}/{month}/{day}"
            response = await client.get(url, timeout=10.0)

            if response.status_code == 200:
                try:
                    data = response.json()
                    # Parse the API response format
                    if data.get("events"):
                        # First, check for explicitly marked holidays (excluding regular Fridays)
                        holiday_event = next(
                            (event for event in data["events"]
                             if event.get("is_holiday", False) and event.get("description", "") != "جمعه"),
                            None
                        )
                        if holiday_event:
                            return {
                                "date": f"{year}-{month:02d}-{day:02d}",
                                "title": holiday_event.get("description", ""),
                                "holiday": True,
                                "description": holiday_event.get("additional_description", "")
                            }
    
                        # If no explicit holiday, check for known holiday descriptions
                        known_holidays = [
                            "روز معلم",  # Teacher's Day
                            "روز مادر",  # Mother's Day
                            "روز پدر",   # Father's Day
                            "روز جهانی", # International days that are holidays
                            "عید",       # Eid holidays
                            "نوروز",     # Nowruz
                            "یلدا",      # Yalda
                            "ملی",       # National days
                        ]
    
                        for event in data["events"]:
                            description = event.get("description", "")
                            if any(holiday_term in description for holiday_term in known_holidays):
                                return {
                                    "date": f"{year}-{month:02d}-{day:02d}",
                                    "title": description,
                                    "holiday": True,
                                    "description": event.get("additional_description", "")
                                }
    
                    # No holiday found
                    return {
                        "date": f"{year}-{month:02d}-{day:02d}",
                        "title": "",
                        "holiday": False
                    }
                except Exception:
                    # Response is not valid JSON (e.g., HTML error page)
                    return {
                        "date": f"{year}-{month:02d}-{day:02d}",
                        "title": "",
                        "holiday": False
                    }
            else:
                # Return a default non-holiday response
                return {
                    "date": f"{year}-{month:02d}-{day:02d}",
                    "title": "",
                    "holiday": False
                }
    except Exception as e:
        # Return a default non-holiday response on error
        return {
            "date": f"{year}-{month:02d}-{day:02d}",
            "title": "",
            "holiday": False
        }