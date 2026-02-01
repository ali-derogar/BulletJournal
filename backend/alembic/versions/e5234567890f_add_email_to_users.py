"""add email to users

Revision ID: e5234567890f
Revises: d9158181baf1
Create Date: 2026-02-01 12:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'e5234567890f'
down_revision: Union[str, None] = 'd9158181baf1'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    conn = op.get_bind()
    inspector = sa.inspect(conn)
    tables = inspector.get_table_names()

    if 'users' in tables:
        columns = [col['name'] for col in inspector.get_columns('users')]

        if 'email' not in columns:
            # Add as nullable first
            op.add_column('users', sa.Column('email', sa.String(), nullable=True))
            # Create unique index
            op.create_index(op.f('ix_users_email'), 'users', ['email'], unique=True)


def downgrade() -> None:
    conn = op.get_bind()
    inspector = sa.inspect(conn)
    tables = inspector.get_table_names()
    
    if 'users' in tables:
        columns = [col['name'] for col in inspector.get_columns('users')]
        
        if 'email' in columns:
            op.drop_index(op.f('ix_users_email'), table_name='users')
            op.drop_column('users', 'email')
