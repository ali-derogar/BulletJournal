"""create reflections table

Revision ID: e52345678910
Revises: e5234567890f
Create Date: 2026-02-01 12:05:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'e52345678910'
down_revision: Union[str, None] = 'e5234567890f'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    conn = op.get_bind()
    inspector = sa.inspect(conn)
    tables = inspector.get_table_names()

    if 'reflections' not in tables:
        op.create_table('reflections',
            sa.Column('id', sa.String(), nullable=False),
            # Note: Code uses userId = Column(String, name='user_id'...), so DB column is user_id
            sa.Column('user_id', sa.String(), nullable=False),
            sa.Column('date', sa.String(), nullable=False),
            sa.Column('notes', sa.Text(), nullable=False, server_default=""),
            sa.Column('water_intake', sa.Integer(), nullable=False, server_default='0'),
            sa.Column('study_minutes', sa.Integer(), nullable=False, server_default='0'),
            sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('(CURRENT_TIMESTAMP)'), nullable=True),
            sa.Column('updatedAt', sa.DateTime(timezone=True), server_default=sa.text('(CURRENT_TIMESTAMP)'), nullable=True),
            sa.Column('deletedAt', sa.DateTime(timezone=True), nullable=True),
            sa.PrimaryKeyConstraint('id')
        )
        op.create_index(op.f('ix_reflections_id'), 'reflections', ['id'], unique=False)
        op.create_index(op.f('ix_reflections_user_id'), 'reflections', ['user_id'], unique=False)
        op.create_index(op.f('ix_reflections_date'), 'reflections', ['date'], unique=False)


def downgrade() -> None:
    conn = op.get_bind()
    inspector = sa.inspect(conn)
    tables = inspector.get_table_names()
    
    if 'reflections' in tables:
        op.drop_table('reflections')
