import os
import google.generativeai as genai

# --- 1. تنظیم API Key ---
# **بسیار مهم:** API Key واقعی خودت رو اینجا جایگزین کن.
# بهترین روش برای Production، استفاده از متغیرهای محیطی است،
# اما برای تست سریع اینجا مستقیم می‌گذاریم.
# !!! هشدار: هرگز این کد را با API Key واقعی در GitHub یا محیط عمومی قرار ندهید !!!
API_KEY = "AIzaSyCReK0bc-tXLIDO10VVkFOT-RvtfrI_TCU" # <--- اینجا کلید API خودت رو بگذار

if not API_KEY or API_KEY == "YOUR_ACTUAL_GEMINI_API_KEY_HERE":
    print("خطا: لطفا API_KEY خود را در کد وارد کنید.")
    exit()

try:
    genai.configure(api_key=API_KEY)
    print("API Key Gemini با موفقیت تنظیم شد.")
except Exception as e:
    print(f"خطا در تنظیم API Key: {e}")
    exit()

# --- 2. تنظیمات فایل صوتی و زبان ---
# اسم فایل صوتی خودت رو اینجا بنویس
AUDIO_FILE_PATH = "processed_output.wav" # <--- نام فایل صوتی خودت (مثلاً test.mp3)
# MIME type فایل صوتی
# برای .wav: "audio/wav"
# برای .mp3: "audio/mpeg"
# برای .webm: "audio/webm"
AUDIO_MIME_TYPE = "audio/wav" # <--- نوع فایل صوتی خودت

TARGET_LANGUAGE = "fa" # fa برای فارسی، en برای انگلیسی

# --- 3. خواندن فایل صوتی ---
if not os.path.exists(AUDIO_FILE_PATH):
    print(f"خطا: فایل صوتی '{AUDIO_FILE_PATH}' پیدا نشد. لطفا مطمئن شوید فایل در کنار این کد قرار دارد.")
    exit()

try:
    with open(AUDIO_FILE_PATH, 'rb') as audio_file:
        audio_bytes = audio_file.read()
    print(f"فایل صوتی '{AUDIO_FILE_PATH}' با موفقیت خوانده شد. حجم: {len(audio_bytes) / 1024:.2f} KB")
except Exception as e:
    print(f"خطا در خواندن فایل صوتی: {e}")
    exit()

# --- 4. آماده‌سازی پرامپت برای Gemini ---
audio_part = {
    "mime_type": AUDIO_MIME_TYPE,
    "data": audio_bytes
}

prompt_parts = [
    f"لطفا این فایل صوتی را به دقت رونویسی (transcribe) کن. زبان اصلی صحبت شده در صوت {TARGET_LANGUAGE} است.",
    "فقط متن رونویسی شده را به عنوان خروجی ارائه بده.",
    audio_part
]

# --- 5. ارسال درخواست به Gemini API ---
try:
    model = genai.GenerativeModel(model_name="gemini-1.5-flash-latest")
    print("در حال ارسال درخواست به Gemini API...")
    response = model.generate_content(prompt_parts)

    # --- 6. نمایش نتیجه ---
    if response.candidates and response.candidates[0].content.parts:
        transcribed_text = response.text.strip()
        print("\n--- رونویسی با موفقیت انجام شد: ---")
        print(transcribed_text)
    else:
        block_reason_msg = "نامشخص"
        if response.prompt_feedback and response.prompt_feedback.block_reason:
            block_reason_msg = response.prompt_feedback.block_reason_message or str(response.prompt_feedback.block_reason)
        print(f"\n--- خطا در رونویسی: Gemini API محتوایی برنگرداند. دلیل: {block_reason_msg} ---")

except genai.types.BlockedPromptException as e:
    print(f"\n--- خطا: درخواست رونویسی توسط API مسدود شد. دلیل: {e.response.prompt_feedback.block_reason_message or str(e)} ---")
except Exception as e:
    print(f"\n--- خطای ناشناخته در زمان تماس با API: {e} ---")
    print("لطفا مطمئن شوید API Key صحیح و فعال است و API 'Generative Language API' در Google Cloud فعال است.")
    print("اگر 403 دریافت کردید، احتمالا مشکل مجوز یا فعال نبودن API است.")