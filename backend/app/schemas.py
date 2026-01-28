from datetime import datetime, date
from typing import List, Optional, Dict, Any
from uuid import UUID
from pydantic import BaseModel, EmailStr, validator, Field
from enum import Enum

# Enum для типов импорта
class ImportType(str, Enum):
    REGULAR = "regular"
    NON_TRANSFERABLE = "non_transferable"
    SCHEDULES = "schedules"
    APPROVED_BY_DIRECTOR = "approved_by_director"
    APPROVED_FOR_PAYMENT = "approved_for_payment"

# Enum для категорий заявок
class Category(str, Enum):
    SUBDIVISIONS = "subdivisions"
    NON_TRANSFERABLE = "non_transferable"
    SCHEDULES = "schedules"
    LIVING_EXPENSES = "living_expenses"
    APPROVED_FOR_PAYMENT = "approved_for_payment"
    TEST = "test"
# Enum для статусов заявок
class RequestStatus(str, Enum):
    DRAFT = "draft"
    PENDING = "pending"
    APPROVED_FOR_PAYMENT = "approved_for_payment"
    FOR_PAYMENT = "for_payment"
    REJECTED = "rejected"

# Enum для типов уведомлений
class NotificationType(str, Enum):
    NEW_REQUESTS_FOR_APPROVAL = "new_requests_for_approval"
    BATCH_REQUESTS_FOR_APPROVAL = "batch_requests_for_approval"
    BATCH_REQUESTS_APPROVED = "batch_requests_approved"
    BATCH_REQUESTS_REJECTED = "batch_requests_rejected"
    BATCH_REQUESTS_PROCESSED = "batch_requests_processed"
    TREASURY_NOTIFICATION = "treasury_notification"

# Схемы для пользователей
class UserBase(BaseModel):
    username: str
    email: EmailStr
    full_name: str

class UserCreate(UserBase):
    password: str

class UserLogin(BaseModel):
    username: str
    password: str

class UserResponse(UserBase):
    id: UUID
    role: str
    organization: str
    department: str
    is_active: bool
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

# Схемы для заявок
class RequestBase(BaseModel):
    article: str = Field(..., min_length=1, max_length=200)
    amount: float = Field(..., gt=0)
    recipient: str = Field(..., min_length=1, max_length=200)
    request_number: str = Field(..., min_length=1, max_length=50)
    request_date: datetime
    purpose: str = Field(..., min_length=1)
    organization: str = Field(..., min_length=1, max_length=100)
    department: str = Field(..., min_length=1, max_length=100)
    priority: Optional[int] = Field(None, ge=1, le=10)
# Схемы для токенов
class Token(BaseModel):
    access_token: str
    token_type: str
    
class TokenData(BaseModel):
    username: str
    role: str
# Схема для смены пароля
class ChangePasswordRequest(BaseModel):
    current_password: str
    new_password: str = Field(..., min_length=8)



class RequestCreate(RequestBase):
    category: Category
    payment_date: Optional[date] = None
    applicant: Optional[str] = None
    import_type: Optional[ImportType] = ImportType.REGULAR

class RequestResponse(RequestBase):
    id: UUID
    status: str
    category: Category
    priority: Optional[int] = None
    payment_date: Optional[date] = None
    applicant: str
    import_type: str
    source: str
    employee_category: Optional[str] = None
    treasury_import_type: Optional[str] = None
    created_by: UUID
    approval_process_id: Optional[UUID] = None
    import_id: Optional[UUID] = None
    paid_at: Optional[date] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

class RequestUpdate(BaseModel):
    status: Optional[str] = None
    priority: Optional[int] = None
    payment_date: Optional[date] = None

# Схемы для импортов
# Схемы для массовых операций
class BulkStatusUpdate(BaseModel):
    request_ids: List[UUID]
    status: str

class BulkDelete(BaseModel):
    request_ids: List[UUID]

class ImportBase(BaseModel):
    file_name: str
    file_size: int
    payment_date: date
    comment: Optional[str] = None
    import_type: Optional[ImportType] = None

class ImportCreate(ImportBase):
    pass

class ImportResponse(ImportBase):
    id: UUID
    user_id: UUID
    status: str
    error_message: Optional[str] = None
    imported_count: int
    skipped_count: int
    created_at: datetime

    class Config:
        from_attributes = True

# Схемы для процессов согласования
class ApprovalProcessBase(BaseModel):
    deputy_id: UUID
    category: str
    comment: str
    request_ids: List[UUID]
    treasury_comment: Optional[str] = None
    treasury_user_id: Optional[UUID] = None

class ApprovalProcessCreate(ApprovalProcessBase):
    pass

class ApprovalProcessResponse(ApprovalProcessBase):
    id: UUID
    status: str
    created_at: datetime
    approved_at: Optional[datetime] = None

    class Config:
        from_attributes = True

class ApprovalProcessUpdate(BaseModel):
    status: str

# Схемы для уведомлений казначейства
class TreasuryNotificationBase(BaseModel):
    approval_process_id: Optional[UUID] = None
    category: str
    deputy_name: str
    comment: str
    request_count: int
    total_amount: float

class TreasuryNotificationResponse(TreasuryNotificationBase):
    id: UUID
    is_read: bool
    created_at: datetime

    class Config:
        from_attributes = True

# Схемы для пользовательских уведомлений
class UserNotificationBase(BaseModel):
    user_id: UUID
    notification_type: str
    title: str
    message: str
    data: Optional[Dict[str, Any]] = None
    request_id: Optional[UUID] = None
    approval_process_id: Optional[UUID] = None
    import_id: Optional[UUID] = None

class UserNotificationResponse(UserNotificationBase):
    id: UUID
    is_read: bool
    created_at: datetime

    class Config:
        from_attributes = True

# Схемы для ключевых слов категорий
class CategoryKeywordBase(BaseModel):
    category: str
    keyword: str
    weight: int = 1

class CategoryKeywordResponse(CategoryKeywordBase):
    id: int
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

# Схема для дерева пользователей с комментариями (для левой панели казначейства)
class UserCommentNode(BaseModel):
    id: UUID
    full_name: str
    comment: Optional[str] = None  # Комментарий из импорта
    import_id: Optional[UUID] = None

class DepartmentNode(BaseModel):
    name: str
    users: List[UserCommentNode]

class OrganizationNode(BaseModel):
    name: str
    departments: List[DepartmentNode]

class UserTreeResponse(BaseModel):
    organizations: List[OrganizationNode]

# Схемы для сводной таблицы
class PivotTableRequest(BaseModel):
    category: str
    filters: Optional[Dict[str, str]] = None
    category: str

class PivotTableResponse(BaseModel):
    rows: List[Dict[str, Any]]
    departments: List[str]

class CategorySelection(BaseModel):
    category: str
    selected: bool

class RecipientSelection(BaseModel):
    organization: str
    recipient: str
    selected: bool

class RecipientSelection(BaseModel):
    """Выбор конкретного контрагента"""
    organization: str
    recipient: str
    selected: bool = True

class ApprovalSelection(BaseModel):
    """Выбор заявок для согласования"""
    selected_categories: List[CategorySelection] = Field(default_factory=list)
    selected_recipients: List[RecipientSelection] = Field(default_factory=list)

class ApprovalRequest(BaseModel):
    selection: ApprovalSelection
    comment: str

class CategoryStats(BaseModel):
    label: str
    count: int
    total_amount: float
    category: Optional[str] = None
