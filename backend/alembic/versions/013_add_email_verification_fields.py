"""Add email verification and password reset fields to users table

Revision ID: 013_add_email_verification_fields
Revises: e52345678912
Create Date: 2026-02-08 17:30:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '013_add_email_verification_fields'
down_revision = 'e52345678912'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Add email verification fields
    op.add_column('users', sa.Column('is_email_verified', sa.Boolean(), nullable=False, server_default='false'))
    op.add_column('users', sa.Column('email_verification_token_hash', sa.String(), nullable=True))
    op.add_column('users', sa.Column('email_verification_token_expires', sa.DateTime(timezone=True), nullable=True))
    
    # Add password reset fields
    op.add_column('users', sa.Column('password_reset_token_hash', sa.String(), nullable=True))
    op.add_column('users', sa.Column('password_reset_token_expires', sa.DateTime(timezone=True), nullable=True))
    op.add_column('users', sa.Column('last_password_reset_request', sa.DateTime(timezone=True), nullable=True))


def downgrade() -> None:
    # Remove password reset fields
    op.drop_column('users', 'last_password_reset_request')
    op.drop_column('users', 'password_reset_token_expires')
    op.drop_column('users', 'password_reset_token_hash')
    
    # Remove email verification fields
    op.drop_column('users', 'email_verification_token_expires')
    op.drop_column('users', 'email_verification_token_hash')
    op.drop_column('users', 'is_email_verified')
