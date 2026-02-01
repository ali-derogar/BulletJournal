"""add password_hash to users

Revision ID: e52345678911
Revises: e52345678910
Create Date: 2026-02-01 12:10:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'e52345678911'
down_revision: Union[str, None] = 'e52345678910'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    conn = op.get_bind()
    inspector = sa.inspect(conn)
    tables = inspector.get_table_names()

    if 'users' in tables:
        columns = [col['name'] for col in inspector.get_columns('users')]

        if 'password_hash' not in columns:
            op.add_column('users', sa.Column('password_hash', sa.String(), nullable=True))


def downgrade() -> None:
    conn = op.get_bind()
    inspector = sa.inspect(conn)
    tables = inspector.get_table_names()
    
    if 'users' in tables:
        columns = [col['name'] for col in inspector.get_columns('users')]
        
        if 'password_hash' in columns:
            op.drop_column('users', 'password_hash')
