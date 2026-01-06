import logging
from sqlalchemy.orm import Session
from app.models.user import User

logger = logging.getLogger(__name__)

# Level Config
LEVELS = ["Iron", "Bronze", "Silver", "Gold", "Platinum", "Diamond"]

# XP required to REACH the next level
# Iron (0) -> Bronze (100) -> Silver (300) -> Gold (700) -> Platinum (1500) -> Diamond (3000)
XP_THRESHOLDS = {
    "Iron": 100,
    "Bronze": 300,
    "Silver": 700,
    "Gold": 1500,
    "Platinum": 3000,
    "Diamond": 999999999  # Max level
}

def gain_xp(db: Session, user: User, amount: int) -> bool:
    """
    Awards XP to the user and checks for level-ups.
    Returns True if the user leveled up.
    """
    if not user:
        return False

    old_level = user.level or "Iron"
    user.xp = (user.xp or 0) + amount
    
    leveled_up = False
    
    # Check for progression
    current_level_idx = 0
    try:
        current_level_idx = LEVELS.index(old_level)
    except ValueError:
        user.level = "Iron"
        current_level_idx = 0

    # Iterate through levels to see if current XP exceeds thresholds
    new_level = old_level
    for i in range(current_level_idx, len(LEVELS) - 1):
        level_name = LEVELS[i]
        threshold = XP_THRESHOLDS.get(level_name, 999999)
        
        if user.xp >= threshold:
            new_level = LEVELS[i+1]
            leveled_up = True
        else:
            break
            
    if leveled_up:
        user.level = new_level
        logger.info(f"User {user.id} LEVELED UP from {old_level} to {new_level}!")
        
    db.commit()
    return leveled_up

def calculate_level_from_xp(xp: int) -> str:
    """
    Calculates the appropriate level based on total XP.
    """
    if xp < 0:
        return "Iron"
        
    current_level = "Iron"
    for level in LEVELS:
        threshold = XP_THRESHOLDS.get(level, 999999999)
        if xp >= threshold:
            current_level = LEVELS[LEVELS.index(level) + 1] if LEVELS.index(level) + 1 < len(LEVELS) else level
        else:
            break
            
    return current_level

def get_next_level_info(user: User):
    """
    Returns (next_level_name, xp_to_go, total_required)
    """
    current_level = user.level or "Iron"
    xp = user.xp or 0
    
    threshold = XP_THRESHOLDS.get(current_level, 0)
    
    if current_level == "Diamond":
        return None, 0, 0
        
    current_idx = LEVELS.index(current_level)
    next_level = LEVELS[current_idx + 1]
    
    xp_to_go = max(0, threshold - xp)
    
    return next_level, xp_to_go, threshold
