import os
from groq import Groq
from dotenv import load_dotenv

# =====================================================================
# 🌐 ENVIRONMENT CONFIGURATION & CLIENT INITIALIZATION
# =====================================================================
# Load values from the local .env configuration file into system memory.
# In production (Vercel), these parameters are securely injected via dashboard secrets.
load_dotenv(dotenv_path=os.path.join(os.path.dirname(__file__), ".env"))

# Fetch the Groq API key from environment secrets
GROQ_API_KEY = os.getenv("GROQ_API_KEY")

# Create a secure connection instance of the Groq client tool
client = Groq(api_key=GROQ_API_KEY)

# =====================================================================
# 🤖 AI GENERATION SERVICE (WITH CONTEXTUAL MEMORY)
# =====================================================================
def get_ai_response(user_input: str, mode: str = "tech", history: list = None) -> str:
    """
    Sends the user's prompt along with conversation history to the Groq AI Engine.
    Handles dynamic roles ("build" or "tech") and enforces strictly formatted output logic.
    """
    # Fix for dynamic mutable arguments (Prevents chat mix-up bugs in memory)
    if history is None:
        history = []

    # ⚙️ SYSTEM PROMPT SETTINGS: Framework & Layout Control Rules
    if mode in ["build", "build_website"]:
        system_prompt = (
            "You are a Pro Website Builder. Return ONLY a JSON object with keys: "
            "'html', 'css', and 'js'. Use Tailwind CSS. "
            "IMPORTANT: Do NOT say 'Hello', do NOT explain anything. ONLY raw JSON code."
        )
    else:
        system_prompt = (
            "You are Jemrox AI, a pro tech assistant. \n"
            "1. ALWAYS respond in English by default. Use Hindi/Hinglish ONLY if the user asks in it. \n"
            "2. Formatting Rule: NEVER use '###' or '#' for headings. Instead, use bold numbers like **1.**, **2.**, **3.** for main sections. \n"
            "3. CODE BLOCKS: You MUST provide code inside triple backticks with the language name (e.g., ```python). \n"
            "   Keep code clean, indented, and use comments to explain the logic. \n"
            "4. USER EXPERIENCE: Keep your answers spaced out with double line breaks. Be concise but helpful. \n"
            "5. DISCLAIMER: At the end of every long or medical/technical answer, add a small italicized line: \n"
            "   '_JEMROX AI can make mistakes. Please verify important info._' \n"
            "6. PERSONALITY: You are developed by Muskan. Be polite and professional.\n"
            "7. BRANDING: Your name is JEMROX AI. You are a next-gen AI developed by Muskan."
        )

    # 📦 PAYLOAD COMPILATION: Stitching Context Flow (System -> History -> Active Input)
    messages = [{"role": "system", "content": system_prompt}]
    
    # Safely merge database message history streams if existing
    messages.extend(history)
    
    # Append the newest raw chat string entry from the user
    messages.append({"role": "user", "content": user_input})

    try:
        # Requesting a chat completion from the chosen AI engine model structure
        completion = client.chat.completions.create(
            model="llama-3.3-70b-specdec",  # Stable production model
            messages=messages,
            temperature=0.6,               # Balances creativity and factual consistency
        )
        
        # Return the clean text message response payload to the main router
        return completion.choices[0].message.content 
        
    except Exception as e:
        # Catch and surface clean stack track errors for debugging maps
        return f"AI Error: {str(e)}"
