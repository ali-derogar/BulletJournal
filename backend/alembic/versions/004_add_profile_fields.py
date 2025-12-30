"""add profile fields

Revision ID: 004
Revises: 003
Create Date: 2025-12-30 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '004'
down_revision: Union[str, None] = 'e008743b78db'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Add profile fields to users table
    conn = op.get_bind()
    inspector = sa.inspect(conn)
    columns = {col['name'] for col in inspector.get_columns('users')}

    if 'education_level' not in columns:
        op.add_column('users', sa.Column('education_level', sa.String(), nullable=True))
    if 'job_title' not in columns:
        op.add_column('users', sa.Column('job_title', sa.String(), nullable=True))
    if 'general_goal' not in columns:
        op.add_column('users', sa.Column('general_goal', sa.Text(), nullable=True))
    if 'income_level' not in columns:
        op.add_column('users', sa.Column('income_level', sa.String(), nullable=True))
    if 'mbti_type' not in columns:
        op.add_column('users', sa.Column('mbti_type', sa.String(), nullable=True))
    if 'bio' not in columns:
        op.add_column('users', sa.Column('bio', sa.Text(), nullable=True))
    if 'skills' not in columns:
        op.add_column('users', sa.Column('skills', sa.Text(), nullable=True))
    if 'location' not in columns:
        op.add_column('users', sa.Column('location', sa.String(), nullable=True))


def downgrade() -> None:
    op.drop_column('users', 'location')
    op.drop_column('users', 'skills')
    op.drop_column('users', 'bio')
    op.drop_column('users', 'mbti_type')
    op.drop_column('users', 'income_level')
    op.drop_column('users', 'general_goal')
    op.drop_column('users', 'job_title')
    op.drop_column('users', 'education_level')
