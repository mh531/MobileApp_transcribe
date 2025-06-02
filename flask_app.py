import os
import logging

from flask import Flask, request, jsonify
from flask_cors import CORS
import google.generativeai as genai
from google.generativeai.types import BlockedPromptException

# Configure logging for production
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

app = Flask(__name__)
CORS(app) # Enable CORS for all origins. For stronger security, restrict to specific origins in production.

# --- API Key Configuration ---
# Get API key from environment variables for security.
GOOGLE_API_KEY = os.environ.get('GOOGLE_API_KEY')

if GOOGLE_API_KEY:
    try:
        genai.configure(api_key=GOOGLE_API_KEY)
        logger.info("Gemini API key successfully configured from environment variable.")
    except Exception as e:
        logger.error(f"Failed to configure Gemini client with API key: {e}", exc_info=True)
        GOOGLE_API_KEY = None
else:
    logger.critical("GOOGLE_API_KEY environment variable is not set. API calls will fail.")

# --- Language Mappings ---
LANGUAGE_NAMES = {
    "en": "English",
    "fa": "Persian (Farsi)",
    "ar": "Arabic",
    "tr": "Turkish",
    "de": "German"
}

# --- Health Check Endpoint ---
@app.route('/api/health', methods=['GET'])
def health_check():
    return jsonify({"status": "ok", "message": "API is running"}), 200

# --- Transcription Endpoint ---
@app.route('/api/transcribe', methods=['POST'])
def transcribe_audio():
    if not GOOGLE_API_KEY:
        logger.error("Gemini API key not configured for transcription.")
        return jsonify({"success": False, "message": "Server error: Gemini API key not configured."}), 500

    if 'audioFile' not in request.files:
        logger.warning("No 'audioFile' part in the request.")
        return jsonify({"success": False, "message": "No audio file provided."}), 400

    file = request.files['audioFile']

    if file.filename == '':
        logger.warning("Received request with no selected audio file.")
        return jsonify({"success": False, "message": "No selected audio file."}), 400

    language_code = request.form.get('language', 'en')
    user_context_explanation = request.form.get('context', '').strip()

    audio_bytes = file.read()
    file_content_type = file.content_type
    filename_to_log = file.filename
    
    logger.info(f"Transcription Request: File='{filename_to_log}', MIME='{file_content_type}', Size={len(audio_bytes) / 1024:.2f} KB, Lang='{language_code}', Context='{user_context_explanation or 'None'}'")

    try:
        model = genai.GenerativeModel(model_name="gemini-1.5-flash-latest")

        audio_file_part = {
            "mime_type": file_content_type,
            "data": audio_bytes
        }
        language_name = LANGUAGE_NAMES.get(language_code, language_code)

        prompt_parts = [
            f"Please transcribe the following audio accurately. The primary language spoken in the audio is {language_name}.",
        ]
        if user_context_explanation:
            prompt_parts.append(f"Additional context about the audio: {user_context_explanation}")
        prompt_parts.append("Provide only the transcribed text as the output.")
        prompt_parts.append(audio_file_part)

        response = model.generate_content(prompt_parts)

        if response.candidates and response.candidates[0].content.parts:
            transcribed_text = response.text.strip()
            logger.info(f"Transcription successful for '{filename_to_log}'.")
            return jsonify({
                "success": True,
                "transcription": transcribed_text,
                "received_filename": filename_to_log,
                "language_used_in_prompt": language_name
            }), 200
        else:
            block_reason_msg = "No content or unknown reason."
            if response.prompt_feedback and response.prompt_feedback.block_reason:
                block_reason_msg = response.prompt_feedback.block_reason_message or str(response.prompt_feedback.block_reason)
            logger.warning(f"Gemini API returned no usable content for '{filename_to_log}'. Blocked reason: {block_reason_msg}")
            error_message = f"Transcription failed: API returned no content. Reason: {block_reason_msg}"
            return jsonify({"success": False, "message": error_message}), 500

    except BlockedPromptException as e:
        logger.error(f"Transcription request blocked by API for '{filename_to_log}': {e}", exc_info=True)
        return jsonify({"success": False, "message": f"Transcription request blocked by API: {e.response.prompt_feedback.block_reason_message or str(e)}"}), 400
    except Exception as e:
        logger.error(f"Unexpected error during transcription for '{filename_to_log}': {e}", exc_info=True)
        error_message_to_client = "An unexpected server error occurred."
        if "PermissionDenied" in str(e) or "403" in str(e):
            error_message_to_client = "Permission denied by API (403). Check Gemini API key permissions/enablement/billing."
        elif "quota" in str(e).lower():
            error_message_to_client = "API quota exceeded. Please check your Gemini API usage limits."
        
        return jsonify({"success": False, "message": error_message_to_client}), 500

# The if __name__ == '__main__': block is only for local development/testing.
# PythonAnywhere's WSGI server will run the `application` object directly.