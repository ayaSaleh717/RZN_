from flask import Flask, request, jsonify
import os
import requests
from dotenv import load_dotenv

# تحميل متغيرات البيئة من .env
load_dotenv()

app = Flask(__name__)

OPENAI_KEY = os.getenv("OPENAI_API_KEY")
if not OPENAI_KEY:
    raise SystemExit("❌ ضع مفتاحك في ملف .env تحت OPENAI_API_KEY")

@app.route("/chat", methods=["POST"])
def chat():
    data = request.json or {}
    message = data.get("message")

    if not message:
        return jsonify({"error": "⚠️ لم يتم إرسال رسالة"}), 400
    try:
        resp = requests.post(
            "https://api.openai.com/v1/chat/completions",
            headers={
                "Authorization": f"Bearer {OPENAI_KEY}",
                "Content-Type": "application/json",
                # تمكين مفاتيح المشاريع من العمل مع الواجهات
                "OpenAI-Beta": "allow-project-api-keys",
            },
            json={
                "model": "gpt-4o-mini",  # يمكنك تغييره حسب اشتراكك
                "messages": [{"role": "user", "content": message}],
                "max_tokens": 800
            },
            timeout=30
        )

        resp_json = resp.json()
        reply = resp_json.get("choices", [{}])[0].get("message", {}).get("content", "")

        return jsonify({"reply": reply or resp_json})

    except Exception as e:
        return jsonify({"error": str(e)}), 500

if __name__ == "__main__":
    # شغّل السيرفر على نفس المنفذ اللي في final.html
    app.run(host="0.0.0.0", port=8001, debug=True)














# from flask import Flask, request, jsonify
# import os
# import random
# from dotenv import load_dotenv

# load_dotenv()

# app = Flask(__name__)

# # ردود مسبقة للتجربة
# RESPONSES = [
#     "مرحباً! أنا رِزْن، مساعدك الخاص في التغذية واللياقة. 💪",
#     "لخسارة الوزن، أنصحك بالمشي السريع 30 دقيقة يومياً 🚶‍♀️",
#     "اشرب 8 أكواب ماء يومياً لتحسين التمثيل الغذائي 💧",
#     "تناول الخضروات والفواكه الطازجة لتحسين صحتك 🥗",
#     "النوم الكافي أساسي لخسارة الوزن، احرص على 7-8 ساعات 🛌"
# ]

# @app.route("/chat", methods=["POST"])
# def chat():
#     data = request.json or {}
#     message = data.get("message", "")

#     if not message:
#         return jsonify({"error": "⚠️ لم يتم إرسال رسالة"}), 400

#     # اختيار رد عشوائي من القائمة
#     reply = random.choice(RESPONSES)
    
#     return jsonify({
#         "reply": f"{reply}\n\n(هذا رد تجريبي - تحتاج لإضافة OpenAI API key للردود الذكية)",
#         "original_message": message
#     })

# if __name__ == "__main__":
#     app.run(host="0.0.0.0", port=8001, debug=True)