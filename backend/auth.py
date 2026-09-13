# auth.py
from ai_service import get_ai_response 
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from passlib.context import CryptContext
from jose import jwt
from datetime import datetime, timedelta
from database import get_connection

 # make sure database.py exists
# ==============================
# FastAPI App
# ==============================
app = FastAPI(title="Jemrox Auth API")

# CORS (allow all origins for now)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Ye sab ko allow kar dega (Testing ke liye best hai)
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ==============================
# Security Config
# ==============================
SECRET_KEY = "jemrox_super_secret_key_change_this"
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60

# Use Argon2 (works better on Windows than bcrypt)
pwd_context = CryptContext(schemes=["argon2"], deprecated="auto")

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
    expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)

# ==============================
# Register Endpoint
# ==============================
@app.post("/auth/register")
async def register(data: RegisterRequest):
    conn = get_connection()
    cursor = conn.cursor()

    cursor.execute("SELECT id FROM users WHERE email = ?", (data.email,))
    if cursor.fetchone():
        conn.close()
        raise HTTPException(status_code=400, detail="User already exists")

    hashed = hash_password(data.password)
    cursor.execute(
        "INSERT INTO users(username, email, password) VALUES (?, ?, ?)",
        (data.username, data.email, hashed)
    )
    conn.commit()
    conn.close()
    return {"message": "User registered successfully"}

# ==============================
# Login Endpoint
# ==============================
@app.post("/auth/login")
async def login(data: LoginRequest):
    conn = get_connection()
    cursor = conn.cursor()

    cursor.execute("SELECT * FROM users WHERE email = ?", (data.email,))
    user = cursor.fetchone()
    if not user or not verify_password(data.password, user["password"]):
        conn.close()
        raise HTTPException(status_code=400, detail="Invalid credentials")

    token = create_token({
        "user_id": user["id"],
        "email": user["email"]
    })

    conn.close()
    return {
        "access_token": token,
        "token_type": "bearer",
        "user_id": user["id"],
        "username": user["username"],
        "email": user["email"]
    }

# backend/auth.py mein /chat/send ko isse replace karo
@app.post("/chat/send")
async def save_and_get_ai_chat(data: ChatRequest):
    print(f"\n--- [DEBUG] NEW REQUEST ---")
    print(f"Mode Received: {data.mode}")
    print(f"User Message: {data.content}")
    conn = get_connection()
    # Ye line zaroori hai taaki database se data r["column"] ki tarah mile
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()
    
    try:
        # --- CHANGE 1: Purani History uthana ---
        # Hum pichle 5 messages le rahe hain taaki AI ko sab yaad rahe
        cursor.execute(
            "SELECT content, mode FROM messages WHERE chat_id = ? ORDER BY id DESC LIMIT 5", 
            (data.chat_id,)
        )
        rows = cursor.fetchall()
        
        # History ko AI ke samajhne layak format (list) mein badlo
        history = []
        for r in reversed(rows):
            # Agar mode 'ai' hai toh role 'assistant', warna 'user'
            role = "assistant" if r["mode"] == "ai" else "user"
            history.append({"role": role, "content": r["content"]})

        # --- CHANGE 2: User ka current message save karo ---
        cursor.execute(
            "INSERT INTO messages (user_id, chat_id, content, mode) VALUES (?, ?, ?, ?)",
            (data.user_id, data.chat_id, data.content, data.mode)
        )
        conn.commit()

        # --- CHANGE 3: AI ko History ke saath call karo ---
        try:
            # Ab hum user input ke saath pichli baatein (history) bhi bhej rahe hain
            ai_reply = get_ai_response(data.content, mode=data.mode, history=history)
        except Exception as ai_err:
            print(f"AI Service Error: {ai_err}")
            ai_reply = "AI Service busy hai, please check Groq Key."

        # --- CHANGE 4: AI ka reply database mein save karo ---
        cursor.execute(
            "INSERT INTO messages (user_id, chat_id, content, mode) VALUES (?, ?, ?, ?)",
            (0, data.chat_id, ai_reply, "ai")
        )
        conn.commit()

        return {
            "status": "success", 
            "ai_response": ai_reply 
        }

    except Exception as e:
        print(f"Database Error: {e}")
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        conn.close()

# ==============================
# Run directly
# ==============================
if __name__ == "__main__":
    import uvicorn
    uvicorn.run("auth:app", host="127.0.0.1", port=8000, reload=True)