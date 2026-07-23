import google.generativeai as genai
import os

# Load API key
genai.configure(api_key=os.getenv("GOOGLE_API_KEY"))

# List all available models
models = genai.list_models()

print("\nAvailable Gemini Models:\n")
for model in models:
    print(f"Name: {model.name}")
    print(f"  Supported methods: {model.supported_generation_methods}")
    print("-" * 50)
