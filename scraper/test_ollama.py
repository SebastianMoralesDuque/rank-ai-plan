import os
from dotenv import load_dotenv
from ollama import Client

load_dotenv()

OLLAMA_API_KEY = os.environ.get('OLLAMA_API_KEY')
HOST = "https://ollama.com"

print("=" * 50)
print("Validando conexión a Ollama Cloud...")
print("=" * 50)

if not OLLAMA_API_KEY:
    print("❌ OLLAMA_API_KEY no encontrada en .env")
    exit(1)

client = Client(
    host=HOST,
    headers={'Authorization': 'Bearer ' + OLLAMA_API_KEY}
)

print(f"✓ Host: {HOST}")
print(f"✓ API Key: {OLLAMA_API_KEY[:15]}...")

print("\nProbando listado de modelos...")
try:
    models = client.list()
    print(f"✓ Modelos disponibles: {len(models.get('models', []))}")
    for m in models.get('models', []):
        print(f"  - {m.get('name')}")
except Exception as e:
    print(f"❌ Error listando modelos: {e}")
    exit(1)

print("\nProbando modelo gemma4:31b-cloud...")
try:
    response = client.generate(
        model='gemma4:31b-cloud',
        prompt='Say "OK" only'
    )
    print(f"✓ Respuesta: {response['response'].strip()}")
except Exception as e:
    print(f"❌ Error con gemma4:31b-cloud: {e}")
    print("\nIntentando con modelo alternativo...")
    try:
        response = client.generate(
            model='gemma2:27b',
            prompt='Say "OK" only'
        )
        print(f"✓ gemma2:27b respondió: {response['response'].strip()}")
    except Exception as e2:
        print(f"❌ gemma2:27b también falló: {e2}")

print("\n" + "=" * 50)
print("Validación completada")
print("=" * 50)