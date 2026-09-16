import os
from datetime import datetime, timedelta, timezone
from fastapi import FastAPI, HTTPException, Response
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from jose import jwt  # 🏆 Standard stable jose engine import
from argon2 import PasswordHasher
from argon2.exceptions import VerifyMismatchError
from database import get_connection
from ai_service import get_ai_response

# ==============================
# FastAPI App Setup
# ==============================
app = FastAPI(title="Jemrox Auth API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

SECRET_KEY = os.getenv("JWT_SECRET_KEY") or "jemrox_super_secret_key_change_this"
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24

ph = PasswordHasher()

class RegisterRequest(BaseModel):
    username: str
    email: str
    password: str

class LoginRequest(BaseModel):
    email: str
    password: str

class ChatRequest(BaseModel):
    content: str
    chat_id: str
    mode: str
    user_id: int

# ==============================
# Hashing Helpers (Pure Argon2)
# ==============================
def hash_password(password: str) -> str:
    return ph.hash(password)

def verify_password(plain_password: str, hashed_password: str) -> bool:
    try:
        return ph.verify(hashed_password, plain_password)
    except VerifyMismatchError:
        return False
    except Exception:
        return False

def create_token(data: dict):
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire}) # jose architecture formats timezone fields automatically
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)

# ==============================
# Endpoints
# ==============================
@app.post("/auth/register")
async def register(data: RegisterRequest, response: Response):
    response.headers["Access-Control-Allow-Origin"] = "*"
    conn = get_connection()
    cursor = conn.cursor()
    try:
        cursor.execute("SELECT id FROM users WHERE email = %s;", (data.email,))
        if cursor.fetchone():
            raise HTTPException(status_code=400, detail="User already registered")
        
        hashed = hash_password(data.password)
        cursor.execute(
            "INSERT INTO users (username, email, password) VALUES (%s, %s, %s);",
            (data.username, data.email, hashed)
        )
        conn.commit()
        return {"status": "success", "message": "User registered successfully"}
    except HTTPException as http_err:
        raise http_err
    except Exception as e:
        if conn: conn.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        if cursor: cursor.close()
        if conn: conn.close()

@app.post("/auth/login")
async def login(data: LoginRequest, response: Response):
    response.headers["Access-Control-Allow-Origin"] = "*"
    conn = get_connection()
    cursor = conn.cursor()
    try:
        cursor.execute("SELECT * FROM users WHERE email = %s;", (data.email,))
        user = cursor.fetchone()
        if not user or not verify_password(data.password, user["password"]):
            raise HTTPException(status_code=400, detail="Invalid credentials")
        
        token = create_token({"user_id": user["id"], "email": user["email"]})
        return {
            "access_token": token,
            "token_type": "bearer",
            "user_id": user["id"],
            "username": user["username"],
            "email": user["email"]
        }
    except HTTPException as http_err:
        raise http_err
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        if cursor: cursor.close()
        if conn: conn.close()

@app.post("/chat/send")
async def save_and_get_ai_chat(data: ChatRequest, response: Response):
    response.headers["Access-Control-Allow-Origin"] = "*"
    conn = get_connection()
    cursor = conn.cursor()
    try:
        cursor.execute(
            "SELECT content, mode FROM messages WHERE chat_id = %s ORDER BY id DESC LIMIT 5;", 
            (data.chat_id,)
        )
        rows = cursor.fetchall()
        history = []
        for r in reversed(rows):
            role = "assistant" if r["mode"] == "ai" else "user"
            history.append({"role": role, "content": r["content"]})

        cursor.execute(
            "INSERT INTO messages (user_id, chat_id, content, mode) VALUES (%s, %s, %s, %s);",
            (data.user_id, data.chat_id, data.content, data.mode)
        )
        conn.commit()

        try:
            ai_reply = get_ai_response(data.content, mode=data.mode, history=history)
        except Exception as ai_err:
            ai_reply = "AI Service busy right now."

        cursor.execute(
            "INSERT INTO messages (user_id, chat_id, content, mode) VALUES (%s, %s, %s, %s);",
            (data.user_id, data.chat_id, ai_reply, "ai")
        )
        conn.commit()

        return {"status": "success", "ai_response": ai_reply, "user_message": data.content}
    except Exception as e:
        if conn: conn.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        if cursor: cursor.close()
        if conn: conn.close()

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
