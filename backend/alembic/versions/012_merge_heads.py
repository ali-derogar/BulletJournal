"""merge heads

Revision ID: 012_merge_heads
Revises: 011_add_notifications, f1a2b3c4d5e6
Create Date: 2026-01-07 00:00:00.000000

"""

from typing import Sequence, Union


# revision identifiers, used by Alembic.
revision: str = '012_merge_heads'
down_revision: Union[str, Sequence[str], None] = (
    '011_add_notifications',
    'f1a2b3c4d5e6',
)
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    pass


def downgrade() -> None:
    pass
