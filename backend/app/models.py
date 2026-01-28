from sqlalchemy import Column, String, Integer, Float, Boolean, DateTime, Text, Date, ForeignKey
from sqlalchemy.orm import relationship
from sqlalchemy.dialects.postgresql import UUID, ARRAY, JSON
from sqlalchemy.sql import func
import uuid
from app.database import Base

class User(Base):
    __tablename__ = "users"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    username = Column(String(50), unique=True, nullable=False)
    password_hash = Column(String(255), nullable=False)
    full_name = Column(String(100), nullable=False)
    email = Column(String(100), nullable=False)
    role = Column(String(20), nullable=False)
    organization = Column(String(100), nullable=False)
    department = Column(String(100), nullable=False)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    # Relationships
    notifications = relationship("UserNotification", back_populates="user", cascade="all, delete-orphan")

class Request(Base):
    __tablename__ = "requests"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    article = Column(String(200), nullable=False)
    amount = Column(Float, nullable=False)
    recipient = Column(String(200), nullable=False)
    request_number = Column(String(50), nullable=False)
    request_date = Column(DateTime(timezone=True), nullable=False)
    status = Column(String(30), nullable=False, default='draft')
    organization = Column(String(100), nullable=False)
    department = Column(String(100), nullable=False)
    priority = Column(Integer)
    purpose = Column(Text, nullable=False)
    payment_date = Column(Date)
    applicant = Column(String(100), nullable=False)
    category = Column(String(50), nullable=False)
    import_type = Column(String(30), default='regular')

    created_by = Column(UUID(as_uuid=True), ForeignKey('users.id'), nullable=False)
    approval_process_id = Column(UUID(as_uuid=True), ForeignKey('approval_processes.id'))
    import_id = Column(UUID(as_uuid=True), ForeignKey("imports.id"), nullable=True)

    paid_at = Column(Date)

    employee_category = Column(String(50))
    treasury_import_type = Column(String(30))
    source = Column(String(20), default="employee")
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    # Relationships

class ApprovalProcess(Base):
    __tablename__ = "approval_processes"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    deputy_id = Column(UUID(as_uuid=True), ForeignKey('users.id'), nullable=False)
    category = Column(String(50), nullable=False)
    comment = Column(Text, nullable=False)
    status = Column(String(20), nullable=False, default='pending')
    request_ids = Column(ARRAY(UUID(as_uuid=True)), nullable=False)
    
    # Новые поля для комментария казначейства
    treasury_comment = Column(Text)
    treasury_user_id = Column(UUID(as_uuid=True), ForeignKey('users.id'))

    created_at = Column(DateTime(timezone=True), server_default=func.now())
    approved_at = Column(DateTime(timezone=True))

class TreasuryNotification(Base):
    __tablename__ = "treasury_notifications"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    approval_process_id = Column(UUID(as_uuid=True), ForeignKey('approval_processes.id'))
    category = Column(String(50), nullable=False)
    deputy_name = Column(String(100), nullable=False)
    comment = Column(Text, nullable=False)
    request_count = Column(Integer, nullable=False)
    total_amount = Column(Float, nullable=False)
    is_read = Column(Boolean, default=False)

    created_at = Column(DateTime(timezone=True), server_default=func.now())

class Import(Base):
    __tablename__ = "imports"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey('users.id'), nullable=False)
    file_name = Column(String(255), nullable=False)
    file_size = Column(Integer, nullable=False)
    payment_date = Column(Date, nullable=False)
    import_type = Column(String(30))
    comment = Column(Text)
    status = Column(String(20), nullable=False, default='processing')
    error_message = Column(Text)
    imported_count = Column(Integer, default=0)
    skipped_count = Column(Integer, default=0)

    created_at = Column(DateTime(timezone=True), server_default=func.now())

class CategoryKeyword(Base):
    __tablename__ = "category_keywords"

    id = Column(Integer, primary_key=True, index=True)
    category = Column(String(50), nullable=False)
    keyword = Column(String(100), nullable=False)
    weight = Column(Integer, default=1)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    # Relationships

class UserNotification(Base):
    """Уведомления пользователей для колокольчика в хедере"""
    __tablename__ = "user_notifications"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey('users.id'), nullable=False)
    notification_type = Column(String(50), nullable=False)
    title = Column(String(200), nullable=False)
    message = Column(Text, nullable=False)
    data = Column(JSON)  # Дополнительные данные в формате JSON
    is_read = Column(Boolean, default=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # Связи с другими сущностями (опционально)
    request_id = Column(UUID(as_uuid=True), ForeignKey('requests.id'), nullable=True)
    approval_process_id = Column(UUID(as_uuid=True), ForeignKey('approval_processes.id'), nullable=True)
    import_id = Column(UUID(as_uuid=True), ForeignKey('imports.id'), nullable=True)

    # Связь с пользователем
    # Связь с заявкой
    user = relationship("User", back_populates="notifications")
    request = relationship("Request")
