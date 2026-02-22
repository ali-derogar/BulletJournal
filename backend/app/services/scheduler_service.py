import asyncio
import logging
from datetime import datetime, timedelta, timezone

from app.db.session import SessionLocal
from app.models.notification import PushSubscription
from app.services.ai_digest_service import ai_digest_service

logger = logging.getLogger(__name__)


class AIDigestSchedulerService:
    def __init__(self, interval_seconds: int = 60):
        self.interval_seconds = max(30, interval_seconds)
        self._task: asyncio.Task | None = None
        self._running = False

    def start(self) -> None:
        if self._running:
            return
        self._running = True
        self._task = asyncio.create_task(self._run_loop())
        logger.info("AI Digest Scheduler started (interval=%ss)", self.interval_seconds)

    async def stop(self) -> None:
        self._running = False
        if self._task:
            self._task.cancel()
            try:
                await self._task
            except asyncio.CancelledError:
                pass
            self._task = None
        logger.info("AI Digest Scheduler stopped")

    async def _run_loop(self) -> None:
        while self._running:
            started = datetime.now(timezone.utc)
            try:
                await self.run_once()
            except asyncio.CancelledError:
                raise
            except Exception as exc:
                logger.exception("AI Digest Scheduler iteration failed: %s", exc)

            elapsed = (datetime.now(timezone.utc) - started).total_seconds()
            sleep_time = max(1, self.interval_seconds - int(elapsed))
            await asyncio.sleep(sleep_time)

    async def run_once(self) -> None:
        db = SessionLocal()
        try:
            utc_now = datetime.now(timezone.utc).replace(second=0, microsecond=0)
            user_ids = [row[0] for row in db.query(PushSubscription.user_id).distinct().all()]

            for user_id in user_ids:
                try:
                    pref = ai_digest_service.get_or_create_preferences(db, user_id)
                    due_types = ai_digest_service.due_digest_types(pref, utc_now)
                    if not due_types:
                        continue

                    local_today = utc_now.astimezone(ai_digest_service._get_zoneinfo(pref)).date()  # noqa: SLF001

                    for digest_type in due_types:
                        # Use the latest completed period for weekly/monthly/yearly digests.
                        if digest_type in {"monthly", "yearly"}:
                            target_date = local_today - timedelta(days=1)
                        else:
                            target_date = local_today

                        result = await ai_digest_service.generate_digest_for_user(
                            db,
                            user_id,
                            digest_type=digest_type,
                            target_date=target_date,
                            force=False,
                            created_by="scheduler",
                            deliver_notification=True,
                            require_push_subscription=True,
                        )
                        logger.info(
                            "AI digest run user=%s type=%s status=%s",
                            user_id,
                            digest_type,
                            result.get("status"),
                        )
                except Exception as exc:
                    logger.warning("AI digest user iteration failed user=%s error=%s", user_id, exc)
        finally:
            db.close()


ai_digest_scheduler = AIDigestSchedulerService()
