from google import genai

client = genai.Client(api_key="AIzaSyCReK0bc-tXLIDO10VVkFOT-RvtfrI_TCU")

response = client.models.generate_content(
    model="gemini-2.0-flash", contents="whats is meaning of  wolf in persian (fa)"
)
print(response.text)