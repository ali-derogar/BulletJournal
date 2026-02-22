import json
import logging
import uuid
from datetime import date, datetime, timedelta, timezone
from typing import Any, Optional
from zoneinfo import ZoneInfo, ZoneInfoNotFoundError

from pydantic_ai import Agent
from sqlalchemy import and_, func
from sqlalchemy.orm import Session

from app.api.ai_agent import default_model
from app.models.ai_coach import AICoachPreference, AIDailySnapshot, AIDigestReport
from app.models.expense import Expense
from app.models.goal import Goal
from app.models.journal import DailyJournal
from app.models.mood import MoodInfo
from app.models.notification import Notification, PushSubscription
from app.models.reflection import Reflection
from app.models.sleep import SleepInfo
from app.models.task import Task
from app.models.user import User
from app.services.ai_memory_service import ai_memory_service
from app.services.ai_service import ai_service
from app.services.push_notifications import send_web_push
from app.services.websocket_manager import manager

logger = logging.getLogger(__name__)


def _clamp(value: float, minimum: float, maximum: float) -> float:
    return max(minimum, min(maximum, value))


def _safe_float(value: Any, default: float = 0.0) -> float:
    try:
        return float(value)
    except Exception:
        return default


def _safe_int(value: Any, default: int = 0) -> int:
    try:
        return int(value)
    except Exception:
        return default


def _extract_json(text: str) -> Optional[dict[str, Any]]:
    if not text:
        return None

    candidate = text.strip()
    try:
        parsed = json.loads(candidate)
        return parsed if isinstance(parsed, dict) else None
    except Exception:
        pass

    start = candidate.find("{")
    end = candidate.rfind("}")
    if start >= 0 and end > start:
        try:
            parsed = json.loads(candidate[start : end + 1])
            return parsed if isinstance(parsed, dict) else None
        except Exception:
            return None

    return None


analysis_agent: Agent[dict[str, Any], str] = Agent(
    default_model,
    deps_type=dict,
    system_prompt=(
        "You are an elite productivity and life-systems coach. "
        "You produce concise, data-driven coaching output in strict JSON."
    ),
)


class AIDigestService:
    DEFAULT_TZ = "UTC"

    @staticmethod
    def serialize_report(report: AIDigestReport) -> dict[str, Any]:
        parsed = None
        if report.parsed_json:
            try:
                parsed = json.loads(report.parsed_json)
            except Exception:
                parsed = None

        return {
            "id": report.id,
            "user_id": report.user_id,
            "digest_type": report.digest_type,
            "period_key": report.period_key,
            "target_date": report.target_date,
            "language": report.language,
            "title": report.title,
            "summary": report.summary,
            "score": report.score,
            "delivered": report.delivered,
            "delivered_at": report.delivered_at.isoformat() if report.delivered_at else None,
            "delivery_channel": report.delivery_channel,
            "created_by": report.created_by,
            "created_at": report.created_at.isoformat() if report.created_at else None,
            "parsed": parsed,
            "raw": report.raw,
        }

    @staticmethod
    def get_or_create_preferences(db: Session, user_id: str) -> AICoachPreference:
        pref = db.query(AICoachPreference).filter(AICoachPreference.user_id == user_id).first()
        if pref:
            return pref

        pref = AICoachPreference(id=str(uuid.uuid4()), user_id=user_id)
        db.add(pref)
        db.commit()
        db.refresh(pref)
        return pref

    @staticmethod
    def _is_digest_enabled(pref: AICoachPreference, digest_type: str) -> bool:
        if digest_type == "daily":
            return bool(pref.daily_digest_enabled)
        if digest_type == "weekly":
            return bool(pref.weekly_digest_enabled)
        if digest_type == "monthly":
            return bool(pref.monthly_digest_enabled)
        if digest_type == "yearly":
            return bool(pref.yearly_digest_enabled)
        return False

    @staticmethod
    def _get_zoneinfo(pref: AICoachPreference) -> ZoneInfo:
        tz_name = pref.timezone or AIDigestService.DEFAULT_TZ
        try:
            return ZoneInfo(tz_name)
        except ZoneInfoNotFoundError:
            return ZoneInfo(AIDigestService.DEFAULT_TZ)

    @staticmethod
    def _is_in_quiet_hours(pref: AICoachPreference, local_now: datetime) -> bool:
        if not pref.quiet_hours_enabled:
            return False

        if not pref.quiet_hours_start or not pref.quiet_hours_end:
            return False

        try:
            start_h, start_m = [int(p) for p in pref.quiet_hours_start.split(":")]
            end_h, end_m = [int(p) for p in pref.quiet_hours_end.split(":")]
        except Exception:
            return False

        now_minutes = local_now.hour * 60 + local_now.minute
        start_minutes = start_h * 60 + start_m
        end_minutes = end_h * 60 + end_m

        if start_minutes == end_minutes:
            return False

        if start_minutes < end_minutes:
            return start_minutes <= now_minutes < end_minutes

        return now_minutes >= start_minutes or now_minutes < end_minutes

    @staticmethod
    def should_trigger_for_minute(pref: AICoachPreference, utc_now: datetime) -> bool:
        local_now = utc_now.astimezone(AIDigestService._get_zoneinfo(pref))

        if local_now.hour != _safe_int(pref.daily_digest_hour, 20):
            return False
        if local_now.minute != _safe_int(pref.daily_digest_minute, 0):
            return False
        if AIDigestService._is_in_quiet_hours(pref, local_now):
            return False

        return True

    @staticmethod
    def due_digest_types(pref: AICoachPreference, utc_now: datetime) -> list[str]:
        if not AIDigestService.should_trigger_for_minute(pref, utc_now):
            return []

        local_now = utc_now.astimezone(AIDigestService._get_zoneinfo(pref))
        due: list[str] = []

        if pref.daily_digest_enabled:
            due.append("daily")
        if pref.weekly_digest_enabled and local_now.weekday() == 6:
            due.append("weekly")
        if pref.monthly_digest_enabled and local_now.day == 1:
            due.append("monthly")
        if pref.yearly_digest_enabled and local_now.day == 1 and local_now.month == 1:
            due.append("yearly")

        return due

    @staticmethod
    def _period_bounds(digest_type: str, target_date: date) -> tuple[date, date, str]:
        if digest_type == "daily":
            return target_date, target_date, target_date.isoformat()

        if digest_type == "weekly":
            start = target_date - timedelta(days=target_date.weekday())
            end = start + timedelta(days=6)
            iso_year, iso_week, _ = target_date.isocalendar()
            return start, end, f"{iso_year}-W{iso_week:02d}"

        if digest_type == "monthly":
            start = date(target_date.year, target_date.month, 1)
            if target_date.month == 12:
                next_month = date(target_date.year + 1, 1, 1)
            else:
                next_month = date(target_date.year, target_date.month + 1, 1)
            end = next_month - timedelta(days=1)
            return start, end, f"{target_date.year}-{target_date.month:02d}"

        if digest_type == "yearly":
            start = date(target_date.year, 1, 1)
            end = date(target_date.year, 12, 31)
            return start, end, f"{target_date.year}"

        raise ValueError(f"Unsupported digest_type: {digest_type}")

    @staticmethod
    def _calculate_daily_score(payload: dict[str, Any]) -> float:
        stats = payload.get("stats", {})
        wellbeing = payload.get("wellbeing", {})

        completion_rate = _safe_float(stats.get("tasks_completion_rate"), 0.0)
        goal_progress_avg = _safe_float(stats.get("goals_progress_avg"), 0.0)
        wellbeing_score = _safe_float(wellbeing.get("wellbeing_score"), 50.0)

        estimated = _safe_float(stats.get("total_estimated_time"), 0.0)
        actual = _safe_float(stats.get("total_spent_time"), 0.0)
        carry_over = _safe_float(stats.get("carry_over_count"), 0.0)

        if estimated > 0:
            diff_ratio = abs(actual - estimated) / estimated
            efficiency = _clamp(100.0 - diff_ratio * 100.0, 0.0, 100.0)
        else:
            efficiency = 50.0

        carry_penalty = _clamp(carry_over * 6.0, 0.0, 24.0)

        score = (
            (completion_rate * 0.4)
            + (goal_progress_avg * 0.25)
            + (wellbeing_score * 0.2)
            + (efficiency * 0.15)
            - carry_penalty
        )
        return round(_clamp(score, 0.0, 100.0), 1)

    @staticmethod
    def _collect_payload(
        db: Session,
        user: User,
        digest_type: str,
        target_date: date,
    ) -> tuple[dict[str, Any], str]:
        start_date, end_date, period_key = AIDigestService._period_bounds(digest_type, target_date)
        start_str = start_date.isoformat()
        end_str = end_date.isoformat()

        tasks = (
            db.query(Task)
            .filter(Task.userId == user.id, Task.date >= start_str, Task.date <= end_str)
            .all()
        )
        done_tasks = [t for t in tasks if (t.status or "").lower() == "done"]
        carry_over = [t for t in tasks if bool(getattr(t, "is_copied_to_next_day", False))]

        total_spent = sum(_safe_float(getattr(t, "spentTime", 0.0), 0.0) for t in tasks)
        total_estimated = sum(_safe_float(getattr(t, "estimated_time", 0.0), 0.0) for t in tasks)
        completion_rate = (len(done_tasks) / len(tasks) * 100.0) if tasks else 0.0

        expenses = (
            db.query(Expense)
            .filter(Expense.userId == user.id, Expense.date >= start_str, Expense.date <= end_str)
            .all()
        )
        total_expense = sum(_safe_float(getattr(e, "amount", 0.0), 0.0) for e in expenses)

        moods = (
            db.query(MoodInfo)
            .filter(MoodInfo.userId == user.id, MoodInfo.date >= start_str, MoodInfo.date <= end_str)
            .all()
        )
        sleeps = (
            db.query(SleepInfo)
            .filter(SleepInfo.userId == user.id, SleepInfo.date >= start_str, SleepInfo.date <= end_str)
            .all()
        )
        journals = (
            db.query(DailyJournal)
            .filter(DailyJournal.userId == user.id, DailyJournal.date >= start_str, DailyJournal.date <= end_str)
            .all()
        )
        reflections = (
            db.query(Reflection)
            .filter(Reflection.userId == user.id, Reflection.date >= start_str, Reflection.date <= end_str)
            .all()
        )

        mood_avg = sum(_safe_float(m.rating, 0.0) for m in moods) / len(moods) if moods else None
        day_score_avg = sum(_safe_float(m.day_score, 0.0) for m in moods) / len(moods) if moods else None
        sleep_hours_avg = sum(_safe_float(s.hours_slept, 0.0) for s in sleeps) / len(sleeps) if sleeps else None
        sleep_quality_avg = sum(_safe_float(s.quality, 0.0) for s in sleeps) / len(sleeps) if sleeps else None

        mood_component = (_safe_float(mood_avg, 5.0) / 10.0) * 50.0
        sleep_quality_component = (_safe_float(sleep_quality_avg, 5.0) / 10.0) * 35.0
        sleep_hours = _safe_float(sleep_hours_avg, 7.0)
        sleep_hours_component = _clamp((1.0 - min(abs(sleep_hours - 8.0), 4.0) / 4.0) * 15.0, 0.0, 15.0)
        wellbeing_score = round(mood_component + sleep_quality_component + sleep_hours_component, 1)

        goals = db.query(Goal).filter(Goal.userId == user.id).all()

        def goal_progress(g: Goal) -> float:
            target = _safe_float(getattr(g, "targetValue", 0.0), 0.0)
            current = _safe_float(getattr(g, "currentValue", 0.0), 0.0)
            if target <= 0:
                return 0.0
            return _clamp((current / target) * 100.0, 0.0, 200.0)

        goals_progress_avg = (
            sum(goal_progress(g) for g in goals) / len(goals)
            if goals
            else 0.0
        )

        top_unfinished = [
            {
                "id": t.id,
                "title": t.title,
                "date": t.date,
                "status": t.status,
                "estimated_time": _safe_float(getattr(t, "estimated_time", 0.0), 0.0),
            }
            for t in tasks
            if (t.status or "") != "done"
        ]
        top_unfinished.sort(key=lambda x: x.get("estimated_time", 0.0), reverse=True)

        payload: dict[str, Any] = {
            "period": {
                "type": digest_type,
                "start": start_str,
                "end": end_str,
                "target_date": target_date.isoformat(),
                "period_key": period_key,
            },
            "profile": {
                "name": user.name,
                "general_goal": user.general_goal,
                "mbti_type": user.mbti_type,
                "level": user.level,
                "xp": user.xp,
                "job_title": user.job_title,
                "skills": user.skills,
                "education_level": user.education_level,
            },
            "stats": {
                "tasks_total": len(tasks),
                "tasks_done": len(done_tasks),
                "tasks_completion_rate": round(completion_rate, 1),
                "total_spent_time": round(total_spent, 1),
                "total_estimated_time": round(total_estimated, 1),
                "carry_over_count": len(carry_over),
                "expenses_total": round(total_expense, 2),
                "goals_total": len(goals),
                "goals_progress_avg": round(goals_progress_avg, 1),
                "journal_count": len(journals),
                "reflection_count": len(reflections),
            },
            "wellbeing": {
                "mood_avg": round(mood_avg, 2) if mood_avg is not None else None,
                "day_score_avg": round(day_score_avg, 2) if day_score_avg is not None else None,
                "sleep_hours_avg": round(sleep_hours_avg, 2) if sleep_hours_avg is not None else None,
                "sleep_quality_avg": round(sleep_quality_avg, 2) if sleep_quality_avg is not None else None,
                "wellbeing_score": wellbeing_score,
                "mood_days": len(moods),
                "sleep_days": len(sleeps),
            },
            "samples": {
                "unfinished_tasks": top_unfinished[:8],
                "carry_over_tasks": [
                    {
                        "id": t.id,
                        "title": t.title,
                        "date": t.date,
                    }
                    for t in carry_over[:8]
                ],
                "goals": [
                    {
                        "id": g.id,
                        "title": g.title,
                        "type": g.type,
                        "status": g.status,
                        "current": _safe_float(getattr(g, "currentValue", 0.0), 0.0),
                        "target": _safe_float(getattr(g, "targetValue", 0.0), 0.0),
                        "progress": round(goal_progress(g), 1),
                        "unit": g.unit,
                    }
                    for g in goals[:12]
                ],
            },
        }

        payload["stats"]["performance_score"] = AIDigestService._calculate_daily_score(payload)
        return payload, period_key

    @staticmethod
    def _save_daily_snapshot(db: Session, user_id: str, target_date: date, payload: dict[str, Any]) -> None:
        stats = payload.get("stats", {})
        wellbeing = payload.get("wellbeing", {})

        snapshot = (
            db.query(AIDailySnapshot)
            .filter(AIDailySnapshot.user_id == user_id, AIDailySnapshot.date == target_date.isoformat())
            .first()
        )

        if not snapshot:
            snapshot = AIDailySnapshot(id=str(uuid.uuid4()), user_id=user_id, date=target_date.isoformat())
            db.add(snapshot)

        snapshot.tasks_total = _safe_int(stats.get("tasks_total"), 0)
        snapshot.tasks_done = _safe_int(stats.get("tasks_done"), 0)
        snapshot.completion_rate = _safe_float(stats.get("tasks_completion_rate"), 0.0)
        snapshot.total_spent_time = _safe_float(stats.get("total_spent_time"), 0.0)
        snapshot.total_estimated_time = _safe_float(stats.get("total_estimated_time"), 0.0)
        snapshot.carry_over_count = _safe_int(stats.get("carry_over_count"), 0)
        snapshot.goals_total = _safe_int(stats.get("goals_total"), 0)
        snapshot.goals_progress_avg = _safe_float(stats.get("goals_progress_avg"), 0.0)
        snapshot.expenses_total = _safe_float(stats.get("expenses_total"), 0.0)
        snapshot.wellbeing_score = _safe_float(wellbeing.get("wellbeing_score"), 0.0)
        snapshot.sleep_hours_avg = wellbeing.get("sleep_hours_avg")
        snapshot.mood_avg = wellbeing.get("mood_avg")
        snapshot.score = _safe_float(stats.get("performance_score"), 0.0)
        snapshot.payload_json = json.dumps(payload, ensure_ascii=False)

    @staticmethod
    def _update_memory_signals(db: Session, user_id: str, payload: dict[str, Any]) -> None:
        stats = payload.get("stats", {})
        wellbeing = payload.get("wellbeing", {})

        completion_rate = _safe_float(stats.get("tasks_completion_rate"), 0.0)
        carry_over_count = _safe_int(stats.get("carry_over_count"), 0)
        score = _safe_float(stats.get("performance_score"), 0.0)
        goals_progress = _safe_float(stats.get("goals_progress_avg"), 0.0)

        if completion_rate < 40:
            ai_memory_service.upsert_memory(
                db,
                user_id,
                "risk",
                "low_completion_recent",
                "Completion rate has stayed low recently; workload prioritization is needed.",
                value={"completion_rate": completion_rate},
                confidence=0.75,
                salience=0.8,
                source="daily_digest",
            )

        if completion_rate >= 80:
            ai_memory_service.upsert_memory(
                db,
                user_id,
                "habit",
                "high_execution_momentum",
                "User is maintaining strong execution momentum.",
                value={"completion_rate": completion_rate},
                confidence=0.7,
                salience=0.75,
                source="daily_digest",
            )

        if carry_over_count >= 3:
            ai_memory_service.upsert_memory(
                db,
                user_id,
                "risk",
                "carry_over_pressure",
                "Carry-over tasks are building up and causing planning pressure.",
                value={"carry_over_count": carry_over_count},
                confidence=0.8,
                salience=0.85,
                source="daily_digest",
            )

        if goals_progress < 40 and _safe_int(stats.get("goals_total"), 0) > 0:
            ai_memory_service.upsert_memory(
                db,
                user_id,
                "goal_signal",
                "goal_alignment_drop",
                "Current actions are weakly aligned with active goals.",
                value={"goals_progress_avg": goals_progress},
                confidence=0.72,
                salience=0.78,
                source="daily_digest",
            )

        wellbeing_score = _safe_float(wellbeing.get("wellbeing_score"), 50.0)
        if wellbeing_score < 45:
            ai_memory_service.upsert_memory(
                db,
                user_id,
                "risk",
                "wellbeing_decline",
                "Wellbeing indicators suggest recovery should be prioritized.",
                value={"wellbeing_score": wellbeing_score},
                confidence=0.7,
                salience=0.8,
                source="daily_digest",
            )

        if score >= 75:
            ai_memory_service.upsert_memory(
                db,
                user_id,
                "habit",
                "stable_high_performance",
                "User can sustain good routines when focused on priorities.",
                value={"score": score},
                confidence=0.7,
                salience=0.7,
                source="daily_digest",
            )

    @staticmethod
    def _fallback_digest(payload: dict[str, Any], language: str, digest_type: str) -> dict[str, Any]:
        stats = payload.get("stats", {})
        wellbeing = payload.get("wellbeing", {})

        completion = _safe_float(stats.get("tasks_completion_rate"), 0.0)
        goals_progress = _safe_float(stats.get("goals_progress_avg"), 0.0)
        score = _safe_float(stats.get("performance_score"), 0.0)

        if language.startswith("fa"):
            summary = (
                f"نرخ تکمیل شما {completion:.0f}% و هم‌راستایی با اهداف {goals_progress:.0f}% است. "
                f"امتیاز عملکرد {score:.0f} از 100 ثبت شد."
            )
            title = {
                "daily": "گزارش روزانه هوش مصنوعی",
                "weekly": "گزارش هفتگی هوش مصنوعی",
                "monthly": "گزارش ماهانه هوش مصنوعی",
                "yearly": "گزارش سالانه هوش مصنوعی",
            }.get(digest_type, "گزارش هوش مصنوعی")
            recommendations = [
                "۳ کار با بیشترین اثر را انتخاب و اولویت‌بندی کن.",
                "هر کار انتقالی را یا زمان‌بندی کن یا حذف کن.",
                "اگر کیفیت خواب پایین است، برنامه فردا را سبک‌تر ببند.",
            ]
            critiques = [
                "اگر تعداد کارهای باز زیاد است، هدف‌گذاری روزانه واقع‌بینانه نیست.",
            ]
            notification_message = summary[:220]
        else:
            summary = (
                f"Completion is {completion:.0f}% with {goals_progress:.0f}% goal alignment. "
                f"Performance score is {score:.0f}/100."
            )
            title = {
                "daily": "Daily AI Digest",
                "weekly": "Weekly AI Digest",
                "monthly": "Monthly AI Digest",
                "yearly": "Yearly AI Digest",
            }.get(digest_type, "AI Digest")
            recommendations = [
                "Pick three highest-impact tasks for the next period.",
                "Resolve or re-plan carry-over tasks explicitly.",
                "Protect recovery if sleep or mood trends are low.",
            ]
            critiques = [
                "Open-task load suggests over-planning versus actual execution capacity.",
            ]
            notification_message = summary[:220]

        return {
            "title": title,
            "notification_title": title,
            "notification_message": notification_message,
            "summary": summary,
            "score": round(score, 1),
            "strengths": [],
            "critiques": critiques,
            "root_causes": [],
            "recommendations": recommendations,
            "goal_alignment": "Moderate",
            "plan_7_days": recommendations,
            "plan_30_days": recommendations,
            "questions": [],
            "wellbeing_note": wellbeing,
        }

    @staticmethod
    def _build_instructions(pref: AICoachPreference, digest_type: str) -> str:
        lang = pref.language or "fa"
        style_map = {
            "gentle": "Warm and supportive with light critique.",
            "balanced": "Balanced critique and actionable coaching.",
            "strict": "Direct, critical, and high-accountability tone.",
        }
        tone = style_map.get(pref.critique_style or "balanced", style_map["balanced"])

        return (
            f"Respond only in language '{lang}'. "
            f"Tone: {tone} "
            "Use 70% strictly from INPUT_JSON and at most 30% reasoned guidance. "
            "Return strict JSON only (no markdown). "
            "Required keys: title, notification_title, notification_message, summary, score, strengths, critiques, "
            "root_causes, recommendations, goal_alignment, plan_7_days, plan_30_days, questions. "
            "All list fields must be arrays of short strings. "
            f"Digest type is {digest_type}."
        )

    @staticmethod
    async def _generate_digest(
        payload: dict[str, Any],
        memory_context: list[dict[str, Any]],
        pref: AICoachPreference,
        digest_type: str,
    ) -> tuple[str, dict[str, Any]]:
        message = "INPUT_JSON:\n" + json.dumps(
            {
                "payload": payload,
                "memory_context": memory_context,
                "critique_style": pref.critique_style,
            },
            ensure_ascii=False,
        )

        raw = await ai_service.execute_agent(
            analysis_agent,
            message,
            deps={},
            history=None,
            instructions=AIDigestService._build_instructions(pref, digest_type),
        )

        parsed = _extract_json(raw)
        if parsed is None:
            parsed = AIDigestService._fallback_digest(payload, pref.language or "fa", digest_type)

        return raw, parsed

    @staticmethod
    async def _send_notification(
        db: Session,
        user_id: str,
        title: str,
        message: str,
        report_id: str,
        score: float,
    ) -> tuple[str, dict[str, Any]]:
        notification_type = "success" if score >= 70 else "warning" if score < 45 else "info"

        notification = Notification(
            id=str(uuid.uuid4()),
            user_id=user_id,
            title=title,
            message=message,
            type=notification_type,
            link="/",
            sent_by="ai-coach",
        )
        db.add(notification)
        db.commit()
        db.refresh(notification)

        websocket_ok = False
        try:
            await manager.send_notification_update(
                user_id=user_id,
                notification_id=notification.id,
                title=notification.title,
                message=notification.message,
                notification_type=notification.type,
                link=notification.link,
            )
            unread = (
                db.query(func.count(Notification.id))
                .filter(and_(Notification.user_id == user_id, Notification.is_read == False))
                .scalar()
            )
            total = db.query(func.count(Notification.id)).filter(Notification.user_id == user_id).scalar()
            muted = (
                db.query(func.count(Notification.id))
                .filter(and_(Notification.user_id == user_id, Notification.is_muted == True))
                .scalar()
            )
            await manager.send_stats_update(
                user_id,
                {
                    "total": int(total or 0),
                    "unread": int(unread or 0),
                    "muted": int(muted or 0),
                },
            )
            websocket_ok = True
        except Exception as exc:
            logger.warning("WebSocket update failed for user %s: %s", user_id, exc)

        push_result = send_web_push(
            db,
            user_id,
            title=title,
            message=message,
            notification_type=notification_type,
            link=notification.link,
        )

        sent_push = int(push_result.get("sent", 0)) > 0
        if websocket_ok and sent_push:
            channel = "mixed"
        elif sent_push:
            channel = "push"
        else:
            channel = "in_app"

        return channel, push_result

    @staticmethod
    async def generate_digest_for_user(
        db: Session,
        user_id: str,
        *,
        digest_type: str = "daily",
        target_date: Optional[date] = None,
        force: bool = False,
        created_by: str = "scheduler",
        deliver_notification: bool = True,
        require_push_subscription: bool = False,
    ) -> dict[str, Any]:
        if digest_type not in {"daily", "weekly", "monthly", "yearly"}:
            raise ValueError("digest_type must be one of: daily, weekly, monthly, yearly")

        user = db.query(User).filter(User.id == user_id).first()
        if not user:
            return {"status": "skipped", "reason": "user_not_found"}

        if require_push_subscription:
            has_push = db.query(PushSubscription).filter(PushSubscription.user_id == user_id).first() is not None
            if not has_push:
                return {"status": "skipped", "reason": "no_push_subscription"}

        pref = AIDigestService.get_or_create_preferences(db, user_id)
        if not force and not AIDigestService._is_digest_enabled(pref, digest_type):
            return {"status": "skipped", "reason": "disabled"}

        if target_date is None:
            now_local = datetime.now(timezone.utc).astimezone(AIDigestService._get_zoneinfo(pref))
            target_date = now_local.date()

        payload, period_key = AIDigestService._collect_payload(db, user, digest_type, target_date)

        existing = (
            db.query(AIDigestReport)
            .filter(
                AIDigestReport.user_id == user_id,
                AIDigestReport.digest_type == digest_type,
                AIDigestReport.period_key == period_key,
            )
            .first()
        )

        if existing and not force:
            return {
                "status": "exists",
                "report": AIDigestService.serialize_report(existing),
            }

        if digest_type == "daily":
            AIDigestService._save_daily_snapshot(db, user_id, target_date, payload)
            AIDigestService._update_memory_signals(db, user_id, payload)
            ai_memory_service.decay_memories(db, user_id=user_id)

        memory_context = ai_memory_service.get_memory_context(db, user_id, limit=10)
        raw, parsed = await AIDigestService._generate_digest(payload, memory_context, pref, digest_type)

        title = str(
            parsed.get("notification_title")
            or parsed.get("title")
            or {
                "daily": "Daily AI Digest",
                "weekly": "Weekly AI Digest",
                "monthly": "Monthly AI Digest",
                "yearly": "Yearly AI Digest",
            }.get(digest_type, "AI Digest")
        )
        summary = str(parsed.get("summary") or "")
        notification_message = str(parsed.get("notification_message") or summary)[:250]

        score = _safe_float(parsed.get("score"), _safe_float(payload.get("stats", {}).get("performance_score"), 0.0))

        if existing:
            report = existing
        else:
            report = AIDigestReport(
                id=str(uuid.uuid4()),
                user_id=user_id,
                digest_type=digest_type,
                period_key=period_key,
            )
            db.add(report)

        report.target_date = target_date.isoformat()
        report.language = pref.language or "fa"
        report.title = title
        report.summary = summary
        report.raw = raw
        report.parsed_json = json.dumps(parsed, ensure_ascii=False)
        report.score = score
        report.created_by = created_by

        if deliver_notification:
            channel, push_result = await AIDigestService._send_notification(
                db,
                user_id,
                title=title,
                message=notification_message,
                report_id=report.id,
                score=score,
            )
            report.delivered = True
            report.delivered_at = datetime.now(timezone.utc)
            report.delivery_channel = channel
        else:
            push_result = {"sent": 0, "failed": 0, "expired": 0}

        db.commit()
        db.refresh(report)

        return {
            "status": "created" if not existing else "updated",
            "report": AIDigestService.serialize_report(report),
            "push_result": push_result,
        }


ai_digest_service = AIDigestService()
