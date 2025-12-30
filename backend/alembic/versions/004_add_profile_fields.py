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
    op.add_column('users', sa.Column('education_level', sa.String(), nullable=True))
    op.add_column('users', sa.Column('job_title', sa.String(), nullable=True))
    op.add_column('users', sa.Column('general_goal', sa.Text(), nullable=True))
    op.add_column('users', sa.Column('income_level', sa.String(), nullable=True))
    op.add_column('users', sa.Column('mbti_type', sa.String(), nullable=True))
    op.add_column('users', sa.Column('bio', sa.Text(), nullable=True))
    op.add_column('users', sa.Column('skills', sa.Text(), nullable=True))
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
