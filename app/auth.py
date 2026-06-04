from passlib.context import CryptContext
from jose import JWTError, jwt
from datetime import datetime, timedelta
from fastapi import Depends, HTTPException
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials

SECRET_KEY = "19921999"
ALGORITHM = "HS256"
TOKEN_MUDDET = 30

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto", bcrypt__rounds=12)
security = HTTPBearer()

def shifre_hashle(shifre: str):
    return pwd_context.hash(shifre)

def shifre_yoxla(shifre: str, hashli_shifre: str):
    return pwd_context.verify(shifre, hashli_shifre)

def token_yarat(data: dict):
    melumat = data.copy()
    vaxt = datetime.utcnow() + timedelta(minutes=TOKEN_MUDDET)
    melumat["exp"] = vaxt
    return jwt.encode(melumat, SECRET_KEY, algorithm=ALGORITHM)

def token_oxu(token: str):
    try:
        return jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
    except JWTError:
        return None

def aktiv_istifadeci(credentials: HTTPAuthorizationCredentials = Depends(security)):
    token = credentials.credentials
    melumat = token_oxu(token)
    if melumat is None:
        raise HTTPException(status_code=401, detail="Token yanlışdır və ya vaxtı keçib")
    return melumat

def admin_yoxla(credentials: HTTPAuthorizationCredentials = Depends(security)):
    token = credentials.credentials
    melumat = token_oxu(token)
    if melumat is None:
        raise HTTPException(status_code=401, detail="Token yanlışdır")
    if melumat.get("role") not in ["admin", "superadmin"]:
        raise HTTPException(status_code=403, detail="Yalnız admin edə bilər")
    return melumat