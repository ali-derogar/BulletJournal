import json
import uuid
from datetime import datetime, timezone
from typing import Any, Optional

from sqlalchemy.orm import Session

from app.models.ai_coach import AIMemoryItem


class AIMemoryService:
    """Manage structured long-term memory signals for AI coach."""

    @staticmethod
    def upsert_memory(
        db: Session,
        user_id: str,
        memory_type: str,
        key: str,
        summary: str,
        *,
        value: Optional[dict[str, Any]] = None,
        confidence: float = 0.6,
        salience: float = 0.6,
        decay: float = 0.95,
        source: str = "digest",
    ) -> AIMemoryItem:
        now = datetime.now(timezone.utc)
        existing = (
            db.query(AIMemoryItem)
            .filter(
                AIMemoryItem.user_id == user_id,
                AIMemoryItem.memory_type == memory_type,
                AIMemoryItem.key == key,
            )
            .first()
        )

        if existing:
            existing.summary = summary
            existing.value_json = json.dumps(value, ensure_ascii=False) if value is not None else None
            existing.confidence = max(existing.confidence or 0.0, confidence)
            existing.salience = min(1.0, max(existing.salience or 0.0, salience) + 0.05)
            existing.decay = decay
            existing.source = source
            existing.last_observed_at = now
            existing.last_reinforced_at = now
            db.flush()
            return existing

        item = AIMemoryItem(
            id=str(uuid.uuid4()),
            user_id=user_id,
            memory_type=memory_type,
            key=key,
            summary=summary,
            value_json=json.dumps(value, ensure_ascii=False) if value is not None else None,
            confidence=confidence,
            salience=salience,
            decay=decay,
            source=source,
            last_observed_at=now,
            last_reinforced_at=now,
        )
        db.add(item)
        db.flush()
        return item

    @staticmethod
    def get_top_memories(db: Session, user_id: str, limit: int = 12) -> list[AIMemoryItem]:
        return (
            db.query(AIMemoryItem)
            .filter(AIMemoryItem.user_id == user_id)
            .order_by(AIMemoryItem.salience.desc(), AIMemoryItem.updated_at.desc())
            .limit(limit)
            .all()
        )

    @staticmethod
    def get_memory_context(db: Session, user_id: str, limit: int = 10) -> list[dict[str, Any]]:
        memories = AIMemoryService.get_top_memories(db, user_id, limit=limit)
        rows: list[dict[str, Any]] = []
        for m in memories:
            value = None
            if m.value_json:
                try:
                    value = json.loads(m.value_json)
                except Exception:
                    value = None
            rows.append(
                {
                    "id": m.id,
                    "type": m.memory_type,
                    "key": m.key,
                    "summary": m.summary,
                    "value": value,
                    "confidence": m.confidence,
                    "salience": m.salience,
                    "last_reinforced_at": m.last_reinforced_at.isoformat() if m.last_reinforced_at else None,
                }
            )
        return rows

    @staticmethod
    def decay_memories(db: Session, user_id: Optional[str] = None, floor: float = 0.1) -> int:
        query = db.query(AIMemoryItem)
        if user_id:
            query = query.filter(AIMemoryItem.user_id == user_id)

        items = query.all()
        changed = 0
        for item in items:
            if item.salience is None:
                continue
            next_salience = max(floor, item.salience * (item.decay or 0.95))
            if abs(next_salience - item.salience) >= 0.001:
                item.salience = next_salience
                changed += 1

        return changed

    @staticmethod
    def delete_memory(db: Session, user_id: str, memory_id: str) -> bool:
        item = (
            db.query(AIMemoryItem)
            .filter(AIMemoryItem.id == memory_id, AIMemoryItem.user_id == user_id)
            .first()
        )
        if not item:
            return False
        db.delete(item)
        return True


ai_memory_service = AIMemoryService()
