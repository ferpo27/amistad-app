content = open('.env', 'r', encoding='utf-8').read()
content = content.replace('5438886016 57', '5493888601657')
# Limpiar espacios al final del github token
lines = []
for line in content.splitlines():
    lines.append(line.rstrip())
content = '\n'.join(lines) + '\n'
open('.env', 'w', encoding='utf-8').write(content)
print('OK - .env corregido')
print()
# Verificar
for line in content.splitlines():
    if line.startswith('WHATSAPP_RECIPIENT') or line.startswith('GITHUB_TOKEN'):
        print(line)
