import httpx
from dotenv import load_dotenv
import os

load_dotenv()

token     = os.getenv('WHATSAPP_TOKEN')
phone_id  = os.getenv('WHATSAPP_PHONE_ID')
recipient = os.getenv('WHATSAPP_RECIPIENT')

print('Token:    ', token[:30] if token else 'NO TOKEN', '...')
print('Phone ID: ', phone_id)
print('Recipient:', recipient)
print()

r = httpx.post(
    f'https://graph.facebook.com/v19.0/{phone_id}/messages',
    json={
        'messaging_product': 'whatsapp',
        'to': recipient,
        'type': 'text',
        'text': {'body': 'test desde agente'}
    },
    headers={
        'Authorization': f'Bearer {token}',
        'Content-Type': 'application/json'
    },
    timeout=15,
)

print('Status:  ', r.status_code)
print('Response:', r.text)
