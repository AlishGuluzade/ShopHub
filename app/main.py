from fastapi import FastAPI, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from typing import List
from . import models, schemas, database, auth
from .models import User

app = FastAPI(title="E-Ticarət API", version="2.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

models.Base.metadata.create_all(bind=database.engine)


def get_db():
    db = database.SessionLocal()
    try:
        yield db
    finally:
        db.close()


@app.get("/")
def root():
    return {"message": "E-Ticarət API v2.0 🚀"}


# ── KATEQORİYALAR ──────────────────────────────────

@app.get("/categories", response_model=List[schemas.CategoryResponse])
def get_categories(db: Session = Depends(get_db)):
    return db.query(models.Category).all()


@app.post("/categories", response_model=schemas.CategoryResponse, status_code=201)
def create_category(cat: schemas.CategoryCreate, db: Session = Depends(get_db), admin=Depends(auth.admin_yoxla)):
    db_cat = models.Category(**cat.dict())
    db.add(db_cat)
    db.commit()
    db.refresh(db_cat)
    return db_cat


# ── MƏHSULLAR ──────────────────────────────────────

@app.get("/products", response_model=List[schemas.Product])
def get_products(search: str = None, category_id: int = None, db: Session = Depends(get_db)):
    query = db.query(models.Product).filter(models.Product.is_active == True)
    if search:
        query = query.filter(models.Product.name.ilike(f"%{search}%"))
    if category_id:
        query = query.filter(models.Product.category_id == category_id)
    return query.all()


@app.get("/products", response_model=List[schemas.Product])
def get_products(search: str = None, category_id: int = None, db: Session = Depends(get_db)):
    query = db.query(models.Product).filter(
        models.Product.is_active == True,
        models.Product.is_approved == True
    )
    if search:
        query = query.filter(models.Product.name.ilike(f"%{search}%"))
    if category_id:
        query = query.filter(models.Product.category_id == category_id)
    return query.all()


@app.post("/products", response_model=schemas.Product, status_code=201)
def create_product(product: schemas.ProductCreate, db: Session = Depends(get_db), istifadeci=Depends(auth.aktiv_istifadeci)):
    user = db.query(User).filter(User.email == istifadeci["sub"]).first()
    db_product = models.Product(**product.dict(), seller_id=user.id)
    db.add(db_product)
    db.commit()
    db.refresh(db_product)
    return db_product


@app.put("/products/{product_id}", response_model=schemas.Product)
def update_product(product_id: int, updated: schemas.ProductUpdate, db: Session = Depends(get_db), admin=Depends(auth.admin_yoxla)):
    product = db.query(models.Product).filter(models.Product.id == product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Məhsul tapılmadı")
    for key, value in updated.dict(exclude_unset=True).items():
        setattr(product, key, value)
    db.commit()
    db.refresh(product)
    return product


@app.delete("/products/{product_id}", status_code=204)
def delete_product(product_id: int, db: Session = Depends(get_db), admin=Depends(auth.admin_yoxla)):
    product = db.query(models.Product).filter(models.Product.id == product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Məhsul tapılmadı")
    db.delete(product)
    db.commit()


# ── İSTİFADƏÇİLƏR ──────────────────────────────────

@app.post("/register", response_model=schemas.UserResponse, status_code=201)
def register(user: schemas.UserCreate, db: Session = Depends(get_db)):
    movcud = db.query(User).filter(User.email == user.email).first()
    if movcud:
        raise HTTPException(status_code=400, detail="Bu email artıq qeydiyyatdadır")
    hashli_shifre = auth.shifre_hashle(user.password)
    yeni_user = User(name=user.name, email=user.email, password=hashli_shifre)
    db.add(yeni_user)
    db.commit()
    db.refresh(yeni_user)
    return yeni_user


@app.post("/login")
def login(user: schemas.UserLogin, db: Session = Depends(get_db)):
    db_user = db.query(User).filter(User.email == user.email).first()
    if not db_user:
        raise HTTPException(status_code=401, detail="Email və ya şifrə yanlışdır")
    if not auth.shifre_yoxla(user.password, db_user.password):
        raise HTTPException(status_code=401, detail="Email və ya şifrə yanlışdır")
    token = auth.token_yarat({"sub": db_user.email, "role": db_user.role.value})
    return {"token": token, "user": db_user.name}


# ── SƏBƏT ──────────────────────────────────────────

@app.post("/cart", response_model=schemas.CartItemResponse, status_code=201)
def sebete_elave_et(item: schemas.CartItemCreate, db: Session = Depends(get_db), istifadeci=Depends(auth.aktiv_istifadeci)):
    user = db.query(User).filter(User.email == istifadeci["sub"]).first()
    movcud = db.query(models.CartItem).filter(
        models.CartItem.user_id == user.id,
        models.CartItem.product_id == item.product_id
    ).first()
    if movcud:
        movcud.quantity += item.quantity
        db.commit()
        db.refresh(movcud)
        return movcud
    yeni = models.CartItem(user_id=user.id, product_id=item.product_id, quantity=item.quantity)
    db.add(yeni)
    db.commit()
    db.refresh(yeni)
    return yeni


@app.get("/cart")
def sebete_bax(db: Session = Depends(get_db), istifadeci=Depends(auth.aktiv_istifadeci)):
    user = db.query(User).filter(User.email == istifadeci["sub"]).first()
    items = db.query(models.CartItem).filter(models.CartItem.user_id == user.id).all()
    netice = []
    for item in items:
        product = db.query(models.Product).filter(models.Product.id == item.product_id).first()
        netice.append({
            "id": item.id,
            "user_id": item.user_id,
            "product_id": item.product_id,
            "product_name": product.name if product else "?",
            "product_image": product.image_url if product else None,
            "price": product.price if product else 0,
            "quantity": item.quantity
        })
    return netice


@app.delete("/cart/{item_id}", status_code=204)
def sebetden_sil(item_id: int, db: Session = Depends(get_db), istifadeci=Depends(auth.aktiv_istifadeci)):
    user = db.query(User).filter(User.email == istifadeci["sub"]).first()
    item = db.query(models.CartItem).filter(
        models.CartItem.id == item_id,
        models.CartItem.user_id == user.id
    ).first()
    if not item:
        raise HTTPException(status_code=404, detail="Məhsul səbətdə tapılmadı")
    db.delete(item)
    db.commit()


# ── SİFARİŞLƏR ──────────────────────────────────────

@app.post("/orders", response_model=schemas.OrderResponse, status_code=201)
def sifaris_ver(order: schemas.OrderCreate, db: Session = Depends(get_db), istifadeci=Depends(auth.aktiv_istifadeci)):
    user = db.query(User).filter(User.email == istifadeci["sub"]).first()
    sebet = db.query(models.CartItem).filter(models.CartItem.user_id == user.id).all()
    if not sebet:
        raise HTTPException(status_code=400, detail="Səbət boşdur")
    umumi_qiymet = 0
    for item in sebet:
        product = db.query(models.Product).filter(models.Product.id == item.product_id).first()
        umumi_qiymet += product.price * item.quantity
    sifaris = models.Order(
        user_id=user.id,
        total_price=umumi_qiymet,
        full_name=order.full_name,
        phone=order.phone,
        address=order.address
    )
    db.add(sifaris)
    db.commit()
    db.refresh(sifaris)
    for item in sebet:
        product = db.query(models.Product).filter(models.Product.id == item.product_id).first()
        sifaris_item = models.OrderItem(
            order_id=sifaris.id,
            product_id=item.product_id,
            quantity=item.quantity,
            price=product.price
        )
        db.add(sifaris_item)
        db.delete(item)
    db.commit()
    db.refresh(sifaris)
    return sifaris


@app.get("/orders", response_model=List[schemas.OrderResponse])
def sifarishlere_bax(db: Session = Depends(get_db), istifadeci=Depends(auth.aktiv_istifadeci)):
    user = db.query(User).filter(User.email == istifadeci["sub"]).first()
    return db.query(models.Order).filter(models.Order.user_id == user.id).all()


# ── ADMİN ──────────────────────────────────────────

@app.get("/admin/orders")
def admin_sifarishler(db: Session = Depends(get_db), admin=Depends(auth.admin_yoxla)):
    sifarishler = db.query(models.Order).all()
    netice = []
    for s in sifarishler:
        user = db.query(User).filter(User.id == s.user_id).first()
        items = db.query(models.OrderItem).filter(models.OrderItem.order_id == s.id).all()
        item_list = []
        for item in items:
            product = db.query(models.Product).filter(models.Product.id == item.product_id).first()
            item_list.append({
                "product_name": product.name if product else "?",
                "product_image": product.image_url if product else None,
                "quantity": item.quantity,
                "price": item.price
            })
        netice.append({
            "id": s.id,
            "user": user.name,
            "email": user.email,
            "total_price": s.total_price,
            "full_name": s.full_name,
            "phone": s.phone,
            "address": s.address,
            "status": s.status,
            "created_at": s.created_at,
            "items": item_list
        })
    return netice


@app.get("/admin/users")
def admin_istifadeciler(db: Session = Depends(get_db), admin=Depends(auth.admin_yoxla)):
    users = db.query(User).all()
    return [{"id": u.id, "name": u.name, "email": u.email, "role": u.role.value, "is_active": u.is_active} for u in users]


@app.put("/admin/users/{user_id}/role")
def rol_deyish(user_id: int, db: Session = Depends(get_db), admin=Depends(auth.admin_yoxla)):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="İstifadəçi tapılmadı")
    if user.role.value == "superadmin":
        raise HTTPException(status_code=403, detail="Superadmin rolunu dəyişdirmək olmaz")
    token_role = admin.get("role")
    if token_role != "superadmin" and user.role.value == "admin":
        raise HTTPException(status_code=403, detail="Admini yalnız superadmin dəyişdirə bilər")
    if user.role.value == "admin":
        user.role = models.UserRole.customer
    else:
        user.role = models.UserRole.admin
    db.commit()
    return {"message": f"{user.name} rolu dəyişdirildi"}


@app.put("/admin/orders/{order_id}/status")
def sifaris_status_deyish(order_id: int, status: str, db: Session = Depends(get_db), admin=Depends(auth.admin_yoxla)):
    order = db.query(models.Order).filter(models.Order.id == order_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Sifariş tapılmadı")
    order.status = status
    db.commit()
    return {"message": "Status dəyişdirildi"}

@app.put("/cart/{item_id}")
def sebet_say_deyish(item_id: int, quantity: int, db: Session = Depends(get_db), istifadeci=Depends(auth.aktiv_istifadeci)):
    user = db.query(User).filter(User.email == istifadeci["sub"]).first()
    item = db.query(models.CartItem).filter(
        models.CartItem.id == item_id,
        models.CartItem.user_id == user.id
    ).first()
    if not item:
        raise HTTPException(status_code=404, detail="Tapılmadı")
    if quantity <= 0:
        db.delete(item)
    else:
        item.quantity = quantity
    db.commit()
    return {"ok": True}


@app.get("/admin/pending-products")
def gozleyen_mehsullar(db: Session = Depends(get_db), admin=Depends(auth.admin_yoxla)):
    products = db.query(models.Product).filter(models.Product.is_approved == False).all()
    netice = []
    for p in products:
        seller = db.query(User).filter(User.id == p.seller_id).first()
        netice.append({
            "id": p.id,
            "name": p.name,
            "description": p.description,
            "price": p.price,
            "stock": p.stock,
            "image_url": p.image_url,
            "seller": seller.name if seller else "?",
            "category_id": p.category_id
        })
    return netice

@app.put("/admin/products/{product_id}/approve")
def mehsul_tesdiq(product_id: int, db: Session = Depends(get_db), admin=Depends(auth.admin_yoxla)):
    product = db.query(models.Product).filter(models.Product.id == product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Məhsul tapılmadı")
    product.is_approved = True
    db.commit()
    return {"message": "Məhsul təsdiqləndi"}

@app.delete("/admin/products/{product_id}")
def mehsul_sil_admin(product_id: int, db: Session = Depends(get_db), admin=Depends(auth.admin_yoxla)):
    product = db.query(models.Product).filter(models.Product.id == product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Məhsul tapılmadı")
    db.delete(product)
    db.commit()
    return {"message": "Məhsul silindi"}