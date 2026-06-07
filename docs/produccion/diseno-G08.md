# Fase 2 - Diseño de la Solución de Producción

## Grupo 08

- Integrantes: Melissa Braunstein - Santiago Gonzalez D’Angelo - Maria Pia Porzio - Leandro Andres Noval - Pilar Wagner.
- Repositorio: https://github.com/santigonzalezdangelo/alentapp
- Fecha: 07/06/2026

---

##  Dockerfile Productivo API

### Objetivo

Diseñar un Dockerfile orientado a producción que reduzca el tamaño de la imagen, mejore la seguridad y elimine dependencias innecesarias para runtime.

### Estrategia propuesta

Se utilizará un enfoque **multi-stage build** para separar las tareas de instalación, compilación y ejecución.

| Etapa | Nombre | Base | Propósito |
|---------|---------|---------|----------------|
| Stage 1 | deps | node:22-alpine | Instalar dependencias del proyecto utilizando `npm ci`. |
| Stage 2 | build | node:22-alpine | Generar Prisma Client y compilar el código TypeScript. |
| Stage 3 | runtime | node:22-alpine | Ejecutar la API utilizando únicamente los artefactos necesarios para producción. |


### Mejoras esperadas

| Aspecto | Situación actual | Situación propuesta |
|----------|----------------|--------------------|
| Dependencias | `npm install` | `npm ci` |
| Ejecución | `tsx watch` | Node.js sobre artefactos compilados |
| Construcción | Una sola etapa | Multi-stage build |
| Seguridad | Sin medidas de seguridad claras | Usuario no-root y healthcheck |
| Tamaño de imagen | Incluye herramientas de desarrollo | Solo runtime productivo |

### Requisitos no funcionales

| Requisito | Estrategia propuesta |
|----------|----------------------|
| Usuario no-root | Ejecutar la imagen final utilizando el usuario `node` o un usuario específico de aplicación para evitar privilegios elevados. |
| Healthcheck | Incorporar un healthcheck contra `localhost:3000` para verificar la disponibilidad de la API. |
| .dockerignore | Excluir directorios y archivos innecesarios como `node_modules`, `.git`, `dist`, archivos temporales y logs para reducir el contexto de build. |
| Tamaño de imagen | Utilizar multi-stage build y copiar únicamente los artefactos necesarios al runtime. |
| Tiempo de startup | Ejecutar la aplicación mediante artefactos compilados en lugar de utilizar `tsx watch`. |
| Reproducibilidad | Utilizar `npm ci` para garantizar instalaciones consistentes. |
| Compatibilidad | Mantener soporte para Prisma y el paquete `@alentapp/shared`. |


### Consideraciones

- Mantener compatibilidad con Prisma.
- Mantener compatibilidad con el paquete `shared`.
- Eliminar dependencias exclusivas de desarrollo del runtime.
- Generar una imagen autocontenida sin depender de volúmenes del host.


#  Dockerfile Productivo del Frontend

## Objetivo

Reducir el tamaño de la imagen, eliminar Node.js del runtime y mejorar la performance de entrega de assets.


## Estrategia de Build

Se utiliza un multi-stage build en tres etapas. Las dos primeras etapas usan Node.js para instalar dependencias y compilar el proyecto con Vite. La tercera etapa usa nginx para servir el resultado, sin incluir Node.js ni las herramientas de build en la imagen final.


##  Diseño Multi-Stage

| Etapa | Nombre | Imagen Base | Responsabilidad |
|---------|---------|------------|----------------|
|1 |deps |node:22-alpine | Instalar dependencias del monorepo con npm ci.|
|2 | build | node:22-alpine| Ejecuta vite build para generar archivos estaticos optimizados en dist/ |
|3 | runtime |nginx:stable-alpine | Copiar el  directorio /dist desde la etapa build. Servir con nginx. No incluye Node.js |
—

### Requisitos no funcionales

| Requisito | Estrategia propuesta |
|----------|----------------------|
| Usuario no-root | La imagen `nginx:stable-alpine` ejecuta por defecto como usuario `nginx`, sin privilegios elevados. |
| Healthcheck | Healthcheck HTTP contra `localhost:80` para verificar que nginx está respondiendo. |
| Compresión gzip | Activar compresión `gzip` en nginx para reducir el tamaño de las respuestas. |
| Cache de assets | Configurar `Cache-Control` con TTL diferenciado: assets con hash (inmutables, 1 año), HTML (validación con ETag). |
| Security headers | Incluir headers HTTP de seguridad (`X-Content-Type-Options`, `X-Frame-Options`, `Content-Security-Policy`, etc.). |
| Tamaño de imagen | Utilizar multi-stage build: Node.js solo en etapas de build, `nginx:stable-alpine` en runtime. Imagen final estimada ≤ 50 MB. |
| Reproducibilidad | Utilizar `npm ci` para garantizar instalaciones determinísticas basadas en el lockfile. |
| Routing SPA | Configurar `try_files` en nginx para que react-router maneje las rutas del lado del cliente. |

---

# Docker Compose Productivo

##  Objetivo

Definir una configuración de despliegue orientada a producción que permita ejecutar la aplicación de forma segura, reproducible y desacoplada del entorno de desarrollo. 

##  Servicios

| Servicio | Imagen | Función |
|-----------|---------|----------|
| api | alentapp-api:prod | Ejecutar la API Fastify compilada en producción. |
| web | alentapp-web:prod | Servir el frontend React compilado mediante Nginx. |
| db | postgres:16-alpine | Almacenar la información persistente de la aplicación. |
| migrate | alentapp-api:prod (target migrate) | Aplicar migraciones Prisma antes de levantar la API. Servicio one-shot (`restart: no`). |
| prometheus | prom/prometheus:latest  | Recolección de métricas. |
| grafana | grafana/grafana:latest  | Visualización de métricas y dashboards. | 
---

##  Redes

### Diseño

Se utilizará una red Docker personalizada llamada `alentnet`. 

### Justificación

Todos los servicios necesitan comunicarse entre sí mediante nombres de servicio:

- api → db
- migrate → db 
- prometheus → api
- grafana → prometheus 
- web → api

La red personalizada permite la comunicación interna entre contenedores mediante nombres de servicio y evita el uso de la red bridge por defecto de Docker.

---

## Volúmenes

| Volumen | Propósito |
|----------|-----------|
| pgdata | Persistencia de datos PostgreSQL. | 
| prometheus_data | Persistencia de métricas recolectadas por Prometheus. |
| grafana_data | Persistencia de dashboards y configuración de Grafana. |
 
---

##  Variables de Entorno

| Variable | Uso |
|-----------|-----|
| DATABASE_URL | Cadena de conexión utilizada por Prisma. |
| POSTGRES_USER | Usuario de PostgreSQL. |
| POSTGRES_PASSWORD | Contraseña de PostgreSQL. |
| POSTGRES_DB | Base de datos utilizada por la aplicación. |
| GF_ADMIN_USER | Usuario administrador de Grafana. |
| GF_ADMIN_PASSWORD | Contraseña del administrador de Grafana. |
| API_PORT | Puerto expuesto al host por la API (default: 3000). |
| WEB_PORT | Puerto expuesto al host por el frontend (default: 80). |
| PROMETHEUS_PORT | Puerto expuesto al host por Prometheus (default: 9090). |
| GRAFANA_PORT | Puerto expuesto al host por Grafana (default: 3001). |

Las variables de entorno serán gestionadas mediante un archivo `.env`. Las credenciales sensibles no quedarán hardcodeadas en el código fuente.

---

##  Healthchecks

| Servicio | Endpoint |
|-----------|----------|
| db | `pg_isready -U ${POSTGRES_USER} -d ${POSTGRES_DB}` |
| api | `http://localhost:3000/health` |
| web | `http://127.0.0.1:8080` |

---

##  Medidas de Seguridad

| Medida | Aplicación |
|----------|-----------|
| read_only | Filesystem de solo lectura en web.  |
| cap_drop | Eliminación de capabilities innecesarias mediante `cap_drop: [ALL]`. | 
| no-new-privileges | Impide que procesos dentro del contenedor obtengan más privilegios.   |
| límites de recursos | CPU y memoria definidos por servicio.  |
| logging rotation | Configuración de rotación de logs para evitar crecimiento ilimitado de archivos. Driver json-file con max-size 10m y max-file 3. |
| tmpfs | Directorios temporales montados en memoria (`/tmp` en api, `/var/cache/nginx`, `/var/run` y `/tmp` en web) para compatibilidad con filesystem read-only sin escribir en disco. |

---

# Diseño de Observabilidad

##  Objetivo

El objetivo de esta parte del diseño es definir cómo se van a capturar, recolectar y visualizar métricas RED asociadas a los controllers de la API.

Las métricas RED permiten observar el comportamiento de la API desde la perspectiva de las requests HTTP:

- Cantidad de requests recibidas.
- Cantidad de requests que finalizan con error.
- Duración de las requests.

La solución propuesta busca que estas métricas se registren de forma centralizada, para evitar repetir lógica en cada controller y lograr una medición consistente en todos los endpoints.

--- 

##  Arquitectura de Observabilidad

```text
API / Controllers
│
▼
Capa centralizada de métricas RED
│
▼
Métricas expuestas para Prometheus
│
▼
Prometheus
│
▼
Grafana 
```
La observabilidad se plantea como una capa transversal a la API.
Los controllers seguirán encargándose de resolver la lógica funcional de cada endpoint. La medición de métricas RED se realizará desde una capa centralizada, ubicada a nivel de request, para registrar automáticamente el comportamiento de los endpoints sin tener que copiar lógica en cada controller.Esta estrategia permite que los controllers actuales y futuros queden cubiertos de forma uniforme.

---

## OpenTelemetry

### Rol

 OpenTelemetry actúa como la capa de instrumentación de la API. Su responsabilidad es inicializar el SDK de métricas, crear los instrumentos (counters, histogramas, gauges) y exponer los datos en formato compatible con Prometheus a través del `PrometheusExporter`. 

### Estrategia de exportación

Para la parte de Prometheus y Grafana, se espera contar con un endpoint de métricas accesible desde la red Docker, que Prometheus pueda consultar periódicamente. 

---

## Métricas RED

| Métrica | Tipo | Objetivo |
|----------|------|----------|
| Rate | Counter | Medir la cantidad de requests procesadas por la API. |
| Errors | Counter | Medir la cantidad de requests que finalizan con error. |
| Duration | Histogram | Medir el tiempo de respuesta de las requests. | 

### Métricas propuestas 

| Métrica | Descripción | Labels sugeridas |
|----------|-------------|------------------|
| `http.requests.total` | Cantidad total de requests procesadas por la API. | `method`, `route`, `status` |
| `http.requests.errors` | Cantidad total de requests que finalizaron con error. | `method`, `route`, `status` |
| `http.request.duration` | Duración de las requests HTTP. | `method`, `route`, `status` |
| `http.requests.active` | Cantidad de requests concurrentes en ejecución. | `method`, `route` |
| `process.memory.usage` | Uso de memoria del proceso de la API. | - | 

---

### Criterio de error

Se considerará error toda request cuyo código de estado HTTP sea mayor o igual a `400`. Esto permite contemplar tanto errores de cliente como errores internos del servidor.

### Normalización de rutas

Para evitar alta cardinalidad en Prometheus, las rutas deberán registrarse de forma normalizada.

Por ejemplo, se debe registrar una ruta como:

`/api/v1/sports/:id`

en lugar de registrar rutas con valores dinámicos como:

`/api/v1/sports/123`

De esta forma, se evita generar una serie temporal distinta por cada ID. 

## Prometheus

### Rol

Prometheus será el componente encargado de recolectar y almacenar las métricas expuestas por la API.

Su función será consultar periódicamente el endpoint de métricas y guardar esa información como series temporales, para luego permitir consultas desde Grafana. 

### Estrategia de recolección

Prometheus deberá configurarse para recolectar las métricas de la API desde el endpoint expuesto por la configuración de observabilidad.

La recolección deberá hacerse dentro de la red Docker, usando el nombre del servicio correspondiente. De esta forma, no será necesario exponer públicamente el endpoint de métricas si solo Prometheus necesita acceder a él. 

### Targets

| Servicio | Endpoint |
|-----------|----------|
| API | `http://api:9464/metrics` |
| Prometheus | `http://prometheus:9090/metrics` | 

### Consideración de seguridad

El endpoint de métricas no debería exponerse innecesariamente al exterior.

Prometheus puede acceder al endpoint desde la red interna de Docker, por lo que el puerto de métricas debería quedar disponible solo para los servicios internos que lo necesiten. 

### Configuración conceptual

```yaml
global:
  scrape_interval: 15s

scrape_configs:
  - job_name: 'alentapp-api-otel'
    static_configs:
      - targets: ['api:9464']
        labels:
          app: 'alentapp'
          service: 'api'
``` 

## Grafana

### Rol

Grafana será la herramienta encargada de visualizar las métricas recolectadas por Prometheus.

Se diseñará un dashboard RED orientado a monitorear el estado general de la API. 

### Dashboard propuesto

Se propone crear un dashboard genérico para toda la API, en lugar de crear un dashboard distinto por cada entidad.

El dashboard podrá usar filtros por ruta o endpoint, permitiendo analizar el comportamiento de distintos módulos sin duplicar los dashboards.

| Panel | Métrica / Query | Tipo de gráfico | Propósito |
|---------|----------------|----------------|-----------|
| **1. Requests por segundo** | `sum(rate(http_requests_total[1m]))` | Time series | Visualizar el tráfico actual de la API. |
| **2. Requests por endpoint** | `sum by (route) (rate(http_requests_total[1m]))` | Time series | Identificar qué endpoints reciben más tráfico. |
| **3. Tasa de error** | `sum(rate(http_requests_errors[1m])) / sum(rate(http_requests_total[1m])) * 100` | Time series | Medir el porcentaje de requests que finalizan con error. |
| **4. Errores por endpoint** | `sum by (route) (rate(http_requests_errors[1m]))` | Bar chart | Detectar endpoints con mayor cantidad de errores. |
| **5. Latencia p95** | `histogram_quantile(0.95, sum by (le, route) (rate(http_request_duration_bucket[5m])))` | Time series | Analizar la latencia percibida por la mayoría de los usuarios. |
| **6. Latencia p99** | `histogram_quantile(0.99, sum by (le, route) (rate(http_request_duration_bucket[5m])))` | Time series | Detectar casos extremos de lentitud. |
| **7. Requests por status code** | `sum by (status) (rate(http_requests_total[5m]))` | Stacked area | Ver la distribución de respuestas exitosas y fallidas. |
| **8. Endpoints más lentos** | `topk(5, avg by (route) (rate(http_request_duration_sum[5m]) / rate(http_request_duration_count[5m])))` | Bar chart horizontal | Identificar posibles cuellos de botella. |

Las queries finales podrán ajustarse durante la implementación según los nombres exactos con los que OpenTelemetry exporte las métricas a Prometheus. 

---

# Estrategia de Validación

## Validación de Infraestructura

### Objetivo

 Confirmar que el entorno de producción levanta correctamente, los servicios se comunican entre sí y los healthchecks reportan estado `healthy`. 

### Procedimiento

```bash 
docker compose -f 
docker-compose.prod.yml up -d --build docker compose -f 
docker-compose.prod.yml ps

 ``` 
## Validación de Imágenes

### Objetivo

Verificar reducción de tamaño respecto a las imágenes de desarrollo y ausencia de herramientas de build en runtime.


### Procedimiento

# Comparar tamaños
docker images alentapp-api alentapp-api:prod
docker images alentapp-web alentapp-web:prod
 
# Verificar ausencia de herramientas de build
docker run --rm alentapp-api:prod which tsc     # debe fallar
docker run --rm alentapp-api:prod which npm     # debe fallar
docker run --rm alentapp-api:prod which node    # debe funcionar
 
# Verificar read-only filesystem
docker exec alentapp-api touch /test            # debe fallar con Permission denied


### Resultado esperado

API
~1GB
≤ 500MB
Web
~570MB
≤ 50MB



##  Validación de Métricas

| Métrica | Método de verificación |
|----------|----------------------|
| Rate | Generar requests a distintos endpoints y verificar que aumente la métrica de requests totales. |
| Errors | Generar requests inválidas o a recursos inexistentes y verificar que aumente la métrica de errores. |
| Duration | Ejecutar requests y verificar que se registren tiempos de respuesta. |
| Requests activas | Generar requests concurrentes y verificar variación en la métrica de requests activas. |
| Memoria | Consultar las métricas expuestas y verificar la presencia de la métrica de memoria del proceso. | 

---

### Procedimiento

1. Levantar la API con observabilidad habilitada.
2. Consultar el endpoint de métricas.
3. Generar tráfico de prueba sobre distintos endpoints.
4. Generar errores controlados.
5. Verificar que las métricas RED aparezcan y cambien.
6. Verificar en Prometheus que el target de la API esté activo.
7. Verificar en Grafana que los paneles muestren datos reales. 

### Resultado esperado

Las métricas RED deben aparecer en el endpoint de métricas y actualizarse cuando se genera tráfico real sobre la API.

Prometheus debe recolectarlas correctamente y Grafana debe visualizarlas en el dashboard. 

---

## Validación de Dashboards

### Objetivo

Validar que Grafana muestre correctamente las métricas RED recolectadas por Prometheus. 

### Procedimiento

1. Levantar Prometheus y Grafana.
2. Verificar que Prometheus tenga el target de la API en estado `UP`.
3. Configurar Prometheus como datasource en Grafana.
4. Crear o importar el dashboard RED.
5. Generar tráfico de prueba sobre la API.
6. Generar errores controlados.
7. Verificar que los paneles se actualicen.
8. Tomar capturas del dashboard funcionando. 

### Resultado esperado

El dashboard debe mostrar información real sobre:

- Requests por segundo.
- Requests por endpoint.
- Tasa de error.
- Errores por endpoint.
- Latencia de requests.
- Distribución por código de estado.
- Uso de memoria.
- Endpoints más lentos. 
---

# Decisiones de Diseño

## Decisión 1 - Centralizar la medición de métricas RED

### Alternativas consideradas

- Instrumentar manualmente cada método de cada controller.
- Usar una capa centralizada a nivel de request.
- Depender únicamente de métricas automáticas.

### Justificación

Se propone centralizar la medición de métricas RED para evitar duplicar lógica en cada controller.

Esta decisión permite que todos los endpoints sean medidos de manera uniforme y facilita que nuevos controllers queden cubiertos sin agregar código repetido.

Los controllers mantienen su responsabilidad principal, que es resolver la lógica funcional de la aplicación, mientras que la observabilidad queda separada como una preocupación transversal.

--- 

## Decisión 2 - Usar un dashboard RED genérico para la API

### Alternativas consideradas

- Crear un dashboard por cada entidad.
- Crear un dashboard único para toda la API.
- Consultar métricas manualmente desde Prometheus.

### Justificación

Se propone crear un dashboard genérico para toda la API porque evita duplicación y permite monitorear el comportamiento general del sistema desde una única vista.

Si se necesita analizar una entidad específica, se podrán utilizar filtros por ruta o endpoint.

---

## Decisión 3 - Recolectar métricas con Prometheus y visualizarlas en Grafana

### Alternativas consideradas

- Revisar el endpoint de métricas manualmente.
- Consultar métricas sólo desde Prometheus.
- Usar Prometheus como fuente de datos y Grafana como herramienta de visualización.

### Justificación

Prometheus permite recolectar y almacenar métricas como series temporales, mientras que Grafana permite construir paneles visuales para analizar el comportamiento de la API.

Esta combinación facilita detectar errores, aumentos de tráfico, latencias altas y posibles cuellos de botella. 


# Conclusiones

## Beneficios esperados

- **Reducción de tamaño de imágenes** de ~1GB (API) y ~570MB (Web) a ≤500MB y ≤50MB respectivamente, mediante multi-stage builds.
- **Mejora de seguridad** al eliminar herramientas de desarrollo del runtime, correr con usuario no-root, filesystem read-only y capabilities mínimas.
- **Observabilidad real** del sistema en producción: cualquier degradación en la API (aumento de errores, latencia alta, pico de tráfico) será visible en el dashboard RED antes de que los usuarios lo reporten.
- **Separación clara de entornos**: el `docker-compose.prod.yml` no tiene bind mounts de código, no usa watchers y no expone puertos innecesarios.