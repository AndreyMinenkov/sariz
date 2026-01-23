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

class RequestCreate(RequestBase):
    category: Category
    priority: Optional[int] = None
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

    @validator('category', pre=True)
    def validate_category(cls, v):
        # Преобразуем строковые значения из базы данных в значения enum
        if isinstance(v, str):
            v = v.lower()
            # Маппинг старых значений на новые
            if v == 'approved_for_payment':
                return Category.APPROVED_FOR_PAYMENT
        return v

    class Config:
        from_attributes = True

class RequestUpdate(BaseModel):
    status: Optional[str] = None
    priority: Optional[int] = None
    payment_date: Optional[date] = None

class BulkStatusUpdate(BaseModel):
    request_ids: List[UUID]
    status: str

class BulkDelete(BaseModel):
    request_ids: List[UUID]

# Схемы для импортов
class ImportBase(BaseModel):
    file_name: str
    file_size: int
    payment_date: date
    import_type: Optional[ImportType] = None
    comment: Optional[str] = None

class ImportCreate(ImportBase):
    pass

class ImportResponse(ImportBase):
    id: UUID
    user_id: UUID
    status: str
    error_message: Optional[str] = None
    imported_count: int = 0
    skipped_count: int = 0
    created_at: datetime

    class Config:
        from_attributes = True

# Схемы для процессов согласования
class ApprovalProcessBase(BaseModel):
    deputy_id: UUID
    category: str
    comment: str
    request_ids: List[UUID]

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

# Схемы для статистики
class CategoryStats(BaseModel):
    label: str
    count: int
    total_amount: float
    category: Optional[str] = None

class DateStats(BaseModel):
    date: date
    count: int
    total_amount: float

class StatusStats(BaseModel):
    status: str
    count: int
    total_amount: float

# Схемы для выбора категорий
class CategorySelection(BaseModel):
    category: Category

# Схемы для токенов
class Token(BaseModel):
    access_token: str
    token_type: str

class TokenData(BaseModel):
    username: Optional[str] = None
    role: Optional[str] = None

# Схема для выбора заявок на экспорт
class ExportSelection(BaseModel):
    request_ids: List[UUID]

# Схема для пагинации
class PaginationParams(BaseModel):
    skip: int = 0
    limit: int = 100

# Схемы для сводной таблицы
class PivotTableFilters(BaseModel):
    organization: Optional[str] = None
    recipient: Optional[str] = None
    article: Optional[str] = None
    date_from: Optional[datetime] = None
    date_to: Optional[datetime] = None

class PivotTableRequest(BaseModel):
    category: str = Field(..., description="Категория: pitanie_projivanie, graphs, approved_by_director, non_transferable, filialy, all")
    filters: Optional[PivotTableFilters] = None

class PivotTableRow(BaseModel):
    type: str = Field(..., description="Тип строки: organization, recipient, total")
    organization: Optional[str] = None
    recipient: Optional[str] = None
    department_amounts: Dict[str, float] = {}
    total: float = 0
    is_expanded: Optional[bool] = False

class PivotTableTotalRow(BaseModel):
    department_totals: Dict[str, float] = {}
    grand_total: float = 0

class PivotTableResponse(BaseModel):
    rows: List[PivotTableRow]
    total_row: PivotTableTotalRow
    departments: List[str]
    category: str

# Схемы для согласования заявок
class CategorySelection(BaseModel):
    """Выбор категории"""
    category: str
    selected: bool = True

class RecipientSelection(BaseModel):
    """Выбор конкретного контрагента"""
    organization: str
    recipient: str
    selected: bool = True

class ApprovalSelection(BaseModel):
    """Выбор заявок для согласования"""
    selected_categories: List[CategorySelection] = Field(default_factory=list)
    selected_recipients: List[RecipientSelection] = Field(default_factory=list)

# Схема для запроса на согласование
class ApprovalRequest(BaseModel):
    """Запрос на согласование заявок"""
    selection: ApprovalSelection
    comment: str = Field(..., description="Комментарий для казначейства")
