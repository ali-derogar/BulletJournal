"""add reports table for content moderation

Revision ID: 010_add_reports_table
Revises: 009_add_userid_column
Create Date: 2025-12-30 16:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '010_add_reports_table'
down_revision: Union[str, None] = '009_add_userid_column'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        'reports',
        sa.Column('id', sa.String(), nullable=False),
        sa.Column('reporter_id', sa.String(), nullable=False),
        sa.Column('reported_user_id', sa.String(), nullable=False),
        sa.Column('content_type', sa.String(), nullable=False),
        sa.Column('content_id', sa.String(), nullable=False),
        sa.Column('reason', sa.String(), nullable=False),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('status', sa.String(), nullable=False, server_default='pending'),
        sa.Column('admin_notes', sa.Text(), nullable=True),
        sa.Column('reviewed_by', sa.String(), nullable=True),
        sa.Column('reviewed_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('CURRENT_TIMESTAMP')),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('CURRENT_TIMESTAMP')),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index('ix_reports_id', 'reports', ['id'])
    op.create_index('ix_reports_reporter_id', 'reports', ['reporter_id'])
    op.create_index('ix_reports_reported_user_id', 'reports', ['reported_user_id'])
    op.create_index('ix_reports_content_type', 'reports', ['content_type'])
    op.create_index('ix_reports_content_id', 'reports', ['content_id'])
    op.create_index('ix_reports_status', 'reports', ['status'])
    print("✅ Created reports table for content moderation")


def downgrade() -> None:
    op.drop_index('ix_reports_status', table_name='reports')
    op.drop_index('ix_reports_content_id', table_name='reports')
    op.drop_index('ix_reports_content_type', table_name='reports')
    op.drop_index('ix_reports_reported_user_id', table_name='reports')
    op.drop_index('ix_reports_reporter_id', table_name='reports')
    op.drop_index('ix_reports_id', table_name='reports')
    op.drop_table('reports')
