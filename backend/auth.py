import os
from ai_service import get_ai_response 
from fastapi import FastAPI, HTTPException, Response
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from passlib.context import CryptContext
from jose import jwt
from datetime import datetime, timedelta, timezone
from database import get_connection

# ==============================
# FastAPI App
# ==============================
app = FastAPI(title="Jemrox Auth API")

# Professional Production-level CORS Configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Dynamic urls ko support karne ke liye zaroori hai
    allow_credentials=False, # Vercel serverless rules ke hisab se wildcard "*" ke sath False hona chahiye
    allow_methods=["*"],
    allow_headers=["*"],
)

# ==============================
# Security Config
# ==============================
SECRET_KEY = "jemrox_super_secret_key_change_this"
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24

# Use Argon2 for hashing
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# ==============================
# Pydantic Models
# ==============================
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
# Helper Functions
# ==============================
def hash_password(password: str):
    return pwd_context.hash(password)

def verify_password(plain_password, hashed_password):
    return pwd_context.verify(plain_password, hashed_password)

def create_token(data: dict):
    to_encode = data.copy()
    # 🔥 Modern Timezone-Aware Fix (VS Code ka strike-through instant gayab ho jayega)
    expire = datetime.now(timezone.utc) + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": int(expire.timestamp())}) # Serverless universal standard timestamp format
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)

# ==============================
# Register Endpoint (Fixed 500 & CORS Crash)
# ==============================
@app.post("/auth/register")
async def register(data: RegisterRequest, response: Response):
    # Safe manual explicit headers to bypass browser blockages completely
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
        if conn:
            conn.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        if cursor:
            cursor.close()
        if conn:
            conn.close()

# ==============================
# Login Endpoint (Fixed 500 & CORS Crash)
# ==============================
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

        token = create_token({
            "user_id": user["id"],
            "email": user["email"]
        })

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
        if cursor:
            cursor.close()
        if conn:
            conn.close()

# ==============================
# Chat/AI Endpoint
# ==============================
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
            print(f"AI Service Error: {ai_err}")
            ai_reply = "AI Service busy right now."

        cursor.execute(
            "INSERT INTO messages (user_id, chat_id, content, mode) VALUES (%s, %s, %s, %s);",
            (0, data.chat_id, ai_reply, "ai")
        )
        conn.commit()

        return {
            "status": "success", 
            "ai_response": ai_reply 
        }

    except Exception as e:
        if conn:
            conn.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        if cursor:
            cursor.close()
        if conn:
            conn.close()

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("auth:app", host="127.0.0.1", port=8000, reload=True)
