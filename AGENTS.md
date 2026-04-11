# DevAI Rank - Documentación del Proyecto (AGENTS.md)

## Descripción General

**DevAI Rank** es el directorio y comparador definitivo de planes de IA para programadores. Muestra las mejores suscripciones de paga y los mejores planes gratuitos con información detallada sobre modelos actuales y límites.

## Arquitectura de Datos

```
┌─────────────────────────────────────────────────────────────────┐
│                    SCRAPER FOCALIZADO v2                          │
│  → 12 providers específicos (globales + chinos + Gemini)        │
│  → Playwright para renderizar JS                                │
│  → Ollama (LLM) para extraer modelos reales de las páginas     │
│  → Fallback a seed.json si falla                               │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│                    PRISMA + SQLite                               │
│  → Schema simplificado (campos esenciales + models array)        │
│  → seed.json como backup estático                              │
└─────────────────────────────────────────────────────────────────┘
```

## Tecnologías

### Web App (`/web`)
- **Framework:** Next.js 14+ (App Router)
- **Estilos:** Tailwind CSS + Lucide React
- **ORM:** Prisma Client v6
- **Base de Datos:** SQLite (dev) / PostgreSQL (prod)

### Scraper (`/scraper`)
- **Lenguaje:** Python 3.10+
- **Scraping:** Playwright (async) + BeautifulSoup4
- **Extracción:** Ollama Cloud (LLM) para extraer modelos reales
- **Focalizado:** Solo 12 providers específicos

## Providers Incluidos

### Globales (7)
| Provider | URL |
|----------|-----|
| Cursor | https://www.cursor.com/pricing |
| GitHub Copilot | https://github.com/features/copilot/plans |
| Claude | https://www.anthropic.com/claude/pro |
| OpenAI | https://chat.openai.com/api/auth/subscription |
| Windsurf | https://windsurf.ai/pricing |
| OpenCode | https://opencode.ai/go |
| Gemini | https://one.google.com/about/plans |

### Gemini API (Developer)
| Provider | URL |
|----------|-----|
| Gemini API | https://cloud.google.com/vertex-ai/pricing |

### Chinos (5)
| Provider | URL |
|----------|-----|
| DeepSeek | https://platform.deepseek.com/price |
| Qwen (Alibaba) | https://bailian.console.aliyun.com |
| MiniMax | https://platform.minimax.io/subscribe/token-plan |
| GLM (Zhipu) | https://bigmodel.cn/pricing |
| Kimi (Moonshot) | https://kimi.moonshot.cn/pricing |

## Estructura de Archivos

```
web/
├── app/
│   ├── api/sync/route.ts    # API route para sincronizar datos
│   ├── page.tsx             # Página principal con grid + filtros
│   └── globals.css          # Estilos globales
├── components/
│   ├── PlanCard.tsx         # Card con modelos, límites, ofertas
│   ├── FilterBar.tsx        # Filtros: búsqueda, tipo, orden
│   └── PlansGrid.tsx        # Grid responsivo de cards
├── prisma/
│   ├── schema.prisma        # Schema simplificado
│   ├── sync.ts              # Script de sincronización
│   ├── seed.json            # Datos fallback estáticos
│   └── dev.db               # Base de datos SQLite
└── package.json

scraper/
├── focalizado.py            # Scraper con Ollama LLM
├── urls.txt                 # URLs de los 12 providers
└── results.json             # Output del scraper
```

## Schema de Base de Datos

```prisma
model AiPlan {
  id             String   @id @default(cuid())
  toolName       String
  planName       String
  monthlyPrice   Float
  isFree         Boolean  @default(false)
  
  primaryModel   String?
  models         String?  // JSON array: ["claude-4.6-opus", "claude-4.6-sonnet"]
  
  offers         String   @default("")
  restrictions   String?  // Qué NO incluye
  usageLimits    String?
  
  url            String?
  lastUpdated    DateTime @default(now()) @updatedAt
  source         String   @default("scraper")  // "scraper" | "seed"

  @@unique([toolName, planName])
  @@index([toolName])
  @@index([monthlyPrice])
  @@index([isFree])
  @@index([source])
}
```

## Flujo de Datos

### 1. Scraper Focalizado v2 (Daily)

```bash
cd scraper
python focalizado.py
```

El scraper:
1. Lee `urls.txt` (12 URLs específicas)
2. Usa Playwright para renderizar páginas JS
3. Envía HTML a Ollama (LLM) para extraer modelos REALES
4. Extrae: plan name, precio, modelos actuales, límites
5. Maneja errores por URL individualmente
6. Si Ollama falla → usa regex fallback
7. Si falla completamente → usa seed.json
8. Output: `results.json`

### 2. Sincronización a BD

```bash
# Via CLI
npx tsx prisma/sync.ts

# Via API
GET /api/sync
```

El sync:
1. Intenta leer `scraper/results.json`
2. Si no existe o falla → usa `seed.json` como fallback
3. Upsert planes (crea o actualiza)
4. Borra planes huérfanos (que ya no existen en source)
5. Actualiza `lastUpdated`

### 3. Fallback Resiliente

```
Ollama LLM → falla → Regex fallback → falla → seed.json
```

## UI: Grid + Filtros

### Features
- **Búsqueda:** Por nombre, modelo, features, restricciones
- **Filtros:**
  - Tipo: All / Free / Paid
  - Rango de precio: Slider
- **Ordenamiento:** Score / Precio / Nombre
- **Filtro por Provider:** Eliminado (demasiado ruido)

### Card Estandarizada
```
┌──────────────────────────────────────┐
│ [Top Pick]  CURSOR                   │
│             Pro ($20/mo)             │
│                                      │
│ Models:                              │
│ claude-4.6-opus, claude-4.6-sonnet  │
│                                      │
│ Includes:                            │
│ ✓ Unlimited slow requests            │
│ ✓ Agent mode                         │
│ ✓ Context 200k                      │
│                                      │
│ Limits:                              │
│ ✗ 500 fast requests/day              │
│ ✗ No team features                   │
│                                      │
│ [85 pts]              Visit →        │
└──────────────────────────────────────┘
```

## Value Score

El score se calcula en tiempo real (sin benchmarks falsos):

```typescript
function calculateScore(plan) {
  let score = 50;

  // Free = bonus
  if (plan.isFree) score += 25;
  else score -= plan.monthlyPrice * 1.5;

  // Premium keywords en offers
  if (contains(['claude', 'gpt', 'gemini', 'unlimited', 'o1', 'o3'])) score += 10;

  // Sin restricciones = bonus
  if (!plan.restrictions) score += 5;

  // Modelo premium en primaryModel
  if (primaryModel contains premium) score += 5;

  return clamp(0, 100, score);
}
```

## Comandos

```bash
# Desarrollo
npm run dev

# Build
npm run build

# Sincronizar datos (scraper → BD)
npx tsx prisma/sync.ts

# Studio de Prisma
npm run db:studio

# Regenerar cliente Prisma
npx prisma generate
```

## Variables de Entorno

```bash
# Ollama (para el scraper)
OLLAMA_HOST=https://qwen2.5-coder-32b-wo/gateway
OLLAMA_API_KEY=tu_api_key
OLLAMA_MODEL=qwen2.5-coder:32b
```

## Cron Job (1x al día)

```bash
# Configurar cron para ejecutar diariamente a las 3 AM UTC
0 3 * * * cd /path/to/scraper && python focalizado.py && cd ../web && npx tsx prisma/sync.ts >> /var/log/devai-rank-sync.log 2>&1
```

### Manejo de Errores

| Error | Respuesta |
|-------|-----------|
| 1 URL falla | Continuar con otras 11 |
| Ollama falla | Usar regex fallback |
| Scraper falla completo | Usar seed.json |
| 1 plan no parsea | Saltar ese plan |
| BD connection falla | Retry 3x, luego fallback |

## Despliegue en Coolify

### Web App
```bash
# Enlazar repo a Coolify
# Variables de entorno:
DATABASE_URL=postgresql://...
OLLAMA_HOST=...
OLLAMA_API_KEY=...
```

### Scraper (Cron)
```bash
# Agregar cron job en el mismo servidor o worker separado
```

## Archivos Eliminados

- `scraper/scraper.py` - Reemplazado por focalizado.py
- `scraper/agenticDiscovery.ts` - Ya no se usa Tavily/AA
- Campos innecesarios: benchmarkScore, tokensPerSec

## Principios

1. **Poco pero bien** - ~25 planes (12 providers × ~2 planes), no 340 de baja calidad
2. **Modelos actuales** - El scraper extrae los modelos REALES de las páginas (Claude 4.6, GPT-5.4, etc.)
3. **Resiliencia** - Fallback a seed si scraper falla
4. **Info valiosa** - Modelos actuales, límites reales, qué incluye y qué NO incluye
5. **No benchmarks falsos** - Score calculado solo con datos reales
