from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from datetime import datetime, timedelta
import secrets
import json

from app.db.session import get_db
from app.models.profile_test import ProfileTest, SharedTestResult
from app.models.user import User
from app.auth.dependencies import get_current_active_user
from app.schemas.profile_test import (
    HollandTestAnswerRequest,
    HollandTestResult,
    MBTITestAnswerRequest,
    MBTITestResult,
    ProfileTestResponse,
    ShareTestResultRequest,
    ShareTestResultResponse,
    SharedTestResultPublic,
)

router = APIRouter()


# ============================================================================
# HOLLAND CAREER INTEREST TEST (RIASEC)
# ============================================================================

def compute_holland_scores(answers: dict) -> tuple[dict, str]:
    """
    Compute Holland RIASEC scores from answers.
    
    Args:
        answers: Dict mapping question_id to answer (R, I, A, S, E, C)
    
    Returns:
        Tuple of (scores_dict, dominant_codes_string)
    """
    # Initialize scores
    scores = {"R": 0, "I": 0, "A": 0, "S": 0, "E": 0, "C": 0}
    
    # Count answers
    for answer in answers.values():
        if answer in scores:
            scores[answer] += 1
    
    # Get top 3 codes
    sorted_codes = sorted(scores.items(), key=lambda x: x[1], reverse=True)
    dominant = "".join([code for code, _ in sorted_codes[:3]])
    
    return scores, dominant


@router.post("/tests/holland", response_model=HollandTestResult)
async def submit_holland_test(
    request: HollandTestAnswerRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """
    Submit Holland Career Interest Test answers and save results.
    """
    try:
        # Compute scores
        scores, dominant = compute_holland_scores(request.answers)
        
        # Check if user already has a profile test record
        profile_test = db.query(ProfileTest).filter(
            ProfileTest.user_id == current_user.id
        ).first()
        
        if profile_test:
            # Update existing record
            profile_test.holland_scores = scores
            profile_test.holland_dominant = dominant
            profile_test.updated_at = datetime.utcnow()
        else:
            # Create new record
            profile_test = ProfileTest(
                user_id=current_user.id,
                holland_scores=scores,
                holland_dominant=dominant,
            )
            db.add(profile_test)
        
        db.commit()
        db.refresh(profile_test)
        
        return HollandTestResult(scores=scores, dominant=dominant)
    
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to save Holland test results: {str(e)}"
        )


# ============================================================================
# MBTI PERSONALITY TEST
# ============================================================================

def compute_mbti_type(answers: dict) -> tuple[str, dict]:
    """
    Compute MBTI type from answers.
    
    Args:
        answers: Dict mapping question_id to answer (E/I, S/N, T/F, J/P)
    
    Returns:
        Tuple of (mbti_type_string, scores_dict)
    """
    # Initialize scores (higher = more of the first letter)
    # E/I: E=0, I=1
    # S/N: S=0, N=1
    # T/F: T=0, F=1
    # J/P: J=0, P=1
    scores = {"E": 0, "I": 0, "S": 0, "N": 0, "T": 0, "F": 0, "J": 0, "P": 0}
    
    # Count answers
    for answer in answers.values():
        if answer in scores:
            scores[answer] += 1
    
    # Determine type (pick the one with higher count in each pair)
    e_i = "E" if scores["E"] >= scores["I"] else "I"
    s_n = "S" if scores["S"] >= scores["N"] else "N"
    t_f = "T" if scores["T"] >= scores["F"] else "F"
    j_p = "J" if scores["J"] >= scores["P"] else "P"
    
    mbti_type = e_i + s_n + t_f + j_p
    
    return mbti_type, scores


@router.post("/tests/mbti", response_model=MBTITestResult)
async def submit_mbti_test(
    request: MBTITestAnswerRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """
    Submit MBTI Personality Test answers and save results.
    """
    try:
        # Compute MBTI type
        mbti_type, scores = compute_mbti_type(request.answers)
        
        # Check if user already has a profile test record
        profile_test = db.query(ProfileTest).filter(
            ProfileTest.user_id == current_user.id
        ).first()
        
        if profile_test:
            # Update existing record
            profile_test.mbti_type = mbti_type
            profile_test.mbti_scores = scores
            profile_test.updated_at = datetime.utcnow()
        else:
            # Create new record
            profile_test = ProfileTest(
                user_id=current_user.id,
                mbti_type=mbti_type,
                mbti_scores=scores,
            )
            db.add(profile_test)
        
        db.commit()
        db.refresh(profile_test)
        
        return MBTITestResult(type=mbti_type, scores=scores)
    
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to save MBTI test results: {str(e)}"
        )


# ============================================================================
# GET USER'S TEST RESULTS
# ============================================================================

@router.get("/tests", response_model=ProfileTestResponse)
async def get_user_tests(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """
    Get current user's saved test results.
    """
    profile_test = db.query(ProfileTest).filter(
        ProfileTest.user_id == current_user.id
    ).first()
    
    if not profile_test:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No test results found for this user"
        )
    
    return profile_test


# ============================================================================
# SHARE TEST RESULTS
# ============================================================================

@router.post("/tests/{test_type}/share", response_model=ShareTestResultResponse)
async def share_test_result(
    test_type: str,
    request: ShareTestResultRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """
    Generate a shareable link for a test result.
    """
    if test_type not in ["holland", "mbti"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid test type. Must be 'holland' or 'mbti'"
        )
    
    try:
        # Check if user has test results
        profile_test = db.query(ProfileTest).filter(
            ProfileTest.user_id == current_user.id
        ).first()
        
        if not profile_test:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="No test results found for this user"
            )
        
        # Check if the specific test has been taken
        if test_type == "holland" and not profile_test.holland_dominant:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Holland test has not been taken yet"
            )
        
        if test_type == "mbti" and not profile_test.mbti_type:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="MBTI test has not been taken yet"
            )
        
        # Generate share token
        share_token = secrets.token_urlsafe(32)
        
        # Calculate expiry if specified
        expires_at = None
        if request.expires_in_days:
            expires_at = datetime.utcnow() + timedelta(days=request.expires_in_days)
        
        # Create shared result record
        shared_result = SharedTestResult(
            user_id=current_user.id,
            test_type=test_type,
            share_token=share_token,
            expires_at=expires_at,
        )
        
        db.add(shared_result)
        db.commit()
        db.refresh(shared_result)
        
        # Generate share URL (frontend will handle the actual URL)
        share_url = f"/share/profile-test/{share_token}"
        
        return ShareTestResultResponse(
            share_token=share_token,
            share_url=share_url,
            expires_at=expires_at,
        )
    
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create share link: {str(e)}"
        )


# ============================================================================
# PUBLIC SHARE VIEW (NO AUTHENTICATION REQUIRED)
# ============================================================================

@router.get("/share/profile-test/{share_token}", response_model=SharedTestResultPublic)
async def view_shared_test_result(
    share_token: str,
    db: Session = Depends(get_db),
):
    """
    View a shared test result (public endpoint, no authentication required).
    """
    try:
        # Find the shared result
        shared_result = db.query(SharedTestResult).filter(
            SharedTestResult.share_token == share_token
        ).first()
        
        if not shared_result:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Shared test result not found"
            )
        
        # Check if expired
        if shared_result.expires_at and shared_result.expires_at < datetime.utcnow():
            raise HTTPException(
                status_code=status.HTTP_410_GONE,
                detail="This shared result has expired"
            )
        
        # Get the actual test result
        profile_test = db.query(ProfileTest).filter(
            ProfileTest.user_id == shared_result.user_id
        ).first()
        
        if not profile_test:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Test result not found"
            )
        
        # Return only the relevant test data
        return SharedTestResultPublic(
            test_type=shared_result.test_type,
            holland_scores=profile_test.holland_scores if shared_result.test_type == "holland" else None,
            holland_dominant=profile_test.holland_dominant if shared_result.test_type == "holland" else None,
            mbti_type=profile_test.mbti_type if shared_result.test_type == "mbti" else None,
            mbti_scores=profile_test.mbti_scores if shared_result.test_type == "mbti" else None,
            created_at=profile_test.created_at,
            expires_at=shared_result.expires_at,
        )
    
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to retrieve shared result: {str(e)}"
        )
