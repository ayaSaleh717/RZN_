# main.py
import os
from fastapi import FastAPI, Request, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import httpx
from dotenv import load_dotenv

# تحميل متغيرات البيئة من ملف .env (اختياري أثناء التطوير)
load_dotenv()

OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")
if not OPENAI_API_KEY:
    # لا نرمي استثناء فوراً حتى يكون قابل للتشغيل محلياً، لكن سنعيد خطأ في الوقت الحقيقي عند الطلب
    pass

app = FastAPI(title="RZN Proxy to OpenAI (Secure Backend)")

# اسمح لطلبات من الويب (عدل origins حسب ما تحتاج)
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:8000",
        "http://127.0.0.1:5500",
        "http://localhost:5500",
        "http://127.0.0.1:8000",
        # أضف أصل موقعك هنا عند النشر، مثال: "https://yourdomain.com"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class ChatRequest(BaseModel):
    message: str
    # يمكنك إضافة حقول أخرى إن أردت، مثل: model, temperature, systemPrompt, lang...
    # model: str = "gpt-3.5-turbo"

@app.post("/chat")
async def chat_endpoint(payload: ChatRequest):
    """
    Endpoint بسيط يقوم بتمرير رسالة المستخدم إلى OpenAI (Chat Completions),
    ثم يعيد نص الرد فقط. المفتاح يتم قراءته من متغير البيئة OPENAI_API_KEY.
    """
    if not OPENAI_API_KEY:
        raise HTTPException(status_code=500, detail="OpenAI API key not configured on server.")

    # بناء جسم الطلب لـ OpenAI
    body = {
        "model": "gpt-3.5-turbo",
        "messages": [
            {
                "role": "system",
                "content": (
                    "أنت رِزْن، مساعد ذكي متخصص في التغذية الصحية واللياقة البدنية. "
                    "تحدث بالعربية بلهجة ودودة ومحفزة، استخدم رموزاً تعبيرية مناسبة، وكن مفيداً ودقيقاً."
                )
            },
            {"role": "user", "content": payload.message}
        ],
        "max_tokens": 800,
        "temperature": 0.7
    }

    headers = {
        "Authorization": f"Bearer {OPENAI_API_KEY}",
        "Content-Type": "application/json",
        # تمكين مفاتيح المشاريع (sk-proj-...) مع واجهة Chat Completions
        "OpenAI-Beta": "allow-project-api-keys",
    }

    async with httpx.AsyncClient(timeout=30.0) as client:
        try:
            resp = await client.post("https://api.openai.com/v1/chat/completions", json=body, headers=headers)
        except httpx.RequestError as e:
            raise HTTPException(status_code=502, detail=f"Error contacting OpenAI: {str(e)}")

    if resp.status_code != 200:
        # إرجاع رسالة خطأ مفيدة للفرونتند
        raise HTTPException(status_code=resp.status_code, detail=f"OpenAI error: {resp.text}")

    data = resp.json()
    try:
        assistant_message = data["choices"][0]["message"]["content"]
    except Exception:
        raise HTTPException(status_code=502, detail="Unexpected OpenAI response format.")

    return {"reply": assistant_message}
    