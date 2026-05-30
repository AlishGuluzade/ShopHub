from pydantic import BaseModel
from typing import Optional, List


class CategoryCreate(BaseModel):
    name: str
    icon: Optional[str] = None


class CategoryResponse(BaseModel):
    id: int
    name: str
    icon: Optional[str]

    class Config:
        from_attributes = True


class ProductVariantCreate(BaseModel):
    size: Optional[str] = None
    color: Optional[str] = None
    stock: int = 0


class ProductVariantResponse(BaseModel):
    id: int
    size: Optional[str]
    color: Optional[str]
    stock: int

    class Config:
        from_attributes = True


class ProductCreate(BaseModel):
    name: str
    description: Optional[str] = None
    price: float
    stock: int = 0
    image_url: Optional[str] = None
    category_id: Optional[int] = None


class ProductUpdate(BaseModel):
    name: Optional[str] = None
    price: Optional[float] = None
    stock: Optional[int] = None
    is_active: Optional[bool] = None
    image_url: Optional[str] = None
    category_id: Optional[int] = None


class Product(BaseModel):
    id: int
    name: str
    description: Optional[str]
    price: float
    stock: int
    is_active: bool
    image_url: Optional[str]
    category_id: Optional[int]
    seller_id: Optional[int]

    class Config:
        from_attributes = True


class UserCreate(BaseModel):
    name: str
    email: str
    password: str


class UserLogin(BaseModel):
    email: str
    password: str


class UserResponse(BaseModel):
    id: int
    name: str
    email: str
    role: str
    is_active: bool

    class Config:
        from_attributes = True


class CartItemCreate(BaseModel):
    product_id: int
    quantity: int = 1


class CartItemResponse(BaseModel):
    id: int
    user_id: int
    product_id: int
    quantity: int

    class Config:
        from_attributes = True


class OrderItemResponse(BaseModel):
    id: int
    order_id: int
    product_id: int
    quantity: int
    price: float

    class Config:
        from_attributes = True


class OrderCreate(BaseModel):
    full_name: str
    phone: str
    address: str


class OrderResponse(BaseModel):
    id: int
    user_id: int
    total_price: float
    full_name: str
    phone: str
    address: str
    status: str
    items: List[OrderItemResponse] = []

    class Config:
        from_attributes = True