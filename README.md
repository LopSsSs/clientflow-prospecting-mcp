# ClientFlow Prospecting MCP

Búsqueda automática de empresas + envío de emails en masa vía Gmail.

## Setup Rápido

```bash
npm install
cp .env.example .env
```

Edita `.env`:
- `BRIGHT_DATA_TOKEN` — tu token de Bright Data
- `GMAIL_USER` — clientflow182@gmail.com
- `GMAIL_PASSWORD` — tu App Password de Gmail (no contraseña normal)

### Obtener Gmail App Password

1. Ve a https://myaccount.google.com/security
2. 2-Step Verification → activar si no está
3. App passwords → selecciona Mail + Windows Computer
4. Copia el password de 16 caracteres a `.env`

## Uso

```bash
npm run dev
```

En Claude:

```
Busca empresas en España, sector tech, 10-100 empleados y envía emails
```

El MCP retornará lista de emails encontrados. Confirma si quieres enviar.

## Flujo

1. **Búsqueda**: Bright Data busca empresas con criterios
2. **Preview**: Muestra emails encontrados
3. **Confirmación**: "Envía a estos emails"
4. **Envío**: Gmail envía la plantilla personalizada

## Deploy (Vercel)

```bash
git init
git add .
git commit -m "Prospecting MCP"
git remote add origin https://github.com/LopSsSs/clientflow-prospecting-mcp
git push -u origin main

vercel
# Agregar env vars en Vercel dashboard
```

Luego configura en Claude Desktop settings.json:

```json
{
  "mcpServers": {
    "clientflow-prospecting": {
      "command": "npx",
      "args": ["-y", "mcp-remote", "https://tu-app.vercel.app/mcp", "--allow-http", "--transport", "http-only"]
    }
  }
}
```

## Seguridad

- Los emails se envían realmente vía Gmail
- Usa credenciales de app (más seguro que contraseña)
- Siempre pide confirmación antes de enviar en masa
- Respetar límites de Gmail: ~500 emails/día
