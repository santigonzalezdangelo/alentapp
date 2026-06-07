# Fase 1 - Análisis y Propuesta de Arquitectura

## 1.1 Análisis de la infraestructura Docker actual

Se revisaron: `docker-compose.yml`, `packages/api/Dockerfile` y `packages/web/Dockerfile`

| # | Problema Detectado | Ubicación | Impacto (Riesgo) | Solución Propuesta |
|---|--------------------|-----------|------------------|--------------------|
| **1** | **Credenciales hardcodeadas en texto plano** | `docker-compose.yml` (variables `POSTGRES_USER`, `POSTGRES_PASSWORD`, `DATABASE_URL` en servicios `db` y `api`) | **Crítico.** Credenciales visibles en el repositorio. Cualquiera con acceso al código puede conectarse a la base de datos. | Extraer las credenciales a un archivo `.env` local, añadirlo al `.gitignore` e inyectar las variables en el `docker-compose.yml` mediante la directiva `env_file` o interpolación. |
| **2** | **Exposición innecesaria del puerto de la Base de Datos** | `docker-compose.yml` (directiva `ports: - '5432:5432'` en el servicio `db`) | **Alto.** La base de datos queda accesible desde el host y potencialmente desde la red externa. | Eliminar `ports` en producción. Los servicios se comunican por la red interna de Docker usando el nombre del servicio. |
| **3** | **Ejecución de procesos como usuario `root`** | `packages/web/Dockerfile` y `packages/api/Dockerfile` | **Alto.** Por defecto, los contenedores ejecutan sus procesos como `root`. Si un atacante explota una vulnerabilidad en la aplicación Node.js, obtendría privilegios máximos dentro del contenedor, facilitando ataques de escape hacia el host. | Aplicar el *Principio de Menor Privilegio*. Modificar los Dockerfiles para utilizar el usuario sin privilegios que provee la imagen oficial (`USER node`) justo antes de la instrucción `CMD` o `ENTRYPOINT`. |
| **4** | **Configuración orientada solo a desarrollo, sin preparación para producción** | `docker-compose.yml` — `api` ejecuta `npx tsx watch`, `web` ejecuta `npm run dev --host 0.0.0.0`, ambas con `CHOKIDAR_USEPOLLING`/`WATCHPACK_POLLING`. Además, `api` y `web` carecen de `healthcheck` y de límites de recursos (`mem_limit`, `cpus`). | **Alto.** Los servidores de desarrollo no aplican minificación, exponen sourcemaps y el polling consume CPU innecesaria. Sin healthchecks, Docker no detecta servicios degradados y `depends_on` pierde efectividad. Sin límites de recursos, un pico de carga o memory leak puede consumir toda la RAM/CPU del host. | Compilar TypeScript y ejecutar con `node`; para el frontend, `vite build` servido con Nginx. Agregar `healthcheck` con endpoint HTTP en `api` y `web`. Definir `mem_limit` y `cpus` según las necesidades del entorno. Separar configuraciones con `docker-compose` diferenciados dev/prod. |
| **5** | **Uso de `npm install` en lugar de `npm ci` en los Dockerfiles** | `packages/api/Dockerfile:12` y `packages/web/Dockerfile:8` | **Medio.** `npm install` puede instalar versiones distintas a las del lockfile, resultando en builds no reproducibles. | Reemplazar `RUN npm install` por `RUN npm ci` para garantizar instalaciones determinísticas basadas exactamente en el lockfile. En la imagen final de producción, usar `npm ci --omit=dev` para excluir dependencias de desarrollo y reducir el tamaño de la imagen. |

---

## 1.2 Investigación sobre OpenTelemetry

### ¿Qué es OpenTelemetry y cómo se diferencia de Prometheus?

OpenTelemetry es un framework open source para generar, recopilar y exportar telemetría (métricas, logs y trazas) de forma estandarizada e independiente del proveedor.

Prometheus, en cambio, es un sistema de monitoreo y almacenamiento de métricas. Su función principal es recolectar métricas, almacenarlas como series temporales y permitir consultarlas mediante su lenguaje de consulta (PromQL).

OpenTelemetry **instrumenta** y genera telemetría; Prometheus **recolecta, almacena y consulta** métricas. OTel cubre métricas, logs y trazas; Prometheus solo métricas. OTel no almacena ni visualiza: delega eso en backends.

---

### ¿Cuáles son los "3 pilares" de la observabilidad? ¿Cuál aborda OpenTelemetry?

Los tres pilares de la observabilidad son:

- **Métricas:** valores numéricos en el tiempo (requests, errores, CPU, latencia).
- **Logs:** registros de eventos con timestamp y metadata.
- **Trazas:** recorrido de una solicitud a través de los componentes del sistema, compuesto por spans.

OpenTelemetry aborda los tres pilares con APIs y SDKs unificados.

---

### Expliquen el concepto de métricas RED (Rate, Errors, Duration). ¿Para qué sirve cada una?

Las métricas RED fueron propuestas por Tom Wilkie como un método de monitoreo orientado a servicios, en contraposición al método USE (Utilization, Saturation, Errors) que estaba pensado para hardware e infraestructura. RED es un acrónimo de:

- **Rate (Tasa):** mide la cantidad de solicitudes que procesa un servicio en un período de tiempo, normalmente expresada en requests por segundo (RPS). Sirve para conocer el nivel de actividad o carga del servicio, detectar picos de tráfico o caídas repentinas en la actividad, y correlacionar problemas de rendimiento con aumentos de carga.

- **Errors (Errores):** mide la cantidad o porcentaje de solicitudes que finalizan con error, generalmente respuestas HTTP 4xx (errores de cliente) o 5xx (errores de servidor). Sirve para detectar fallos en la aplicación, identificar endpoints con fallas frecuentes y evaluar la confiabilidad del servicio desde la perspectiva del usuario.

- **Duration (Duración):** mide el tiempo que tarda el servicio en procesar y responder una solicitud, también conocido como latencia. Sirve para evaluar el rendimiento percibido por los usuarios finales, detectar endpoints lentos e identificar cuellos de botella en la aplicación o infraestructura.

Estas tres métricas, aplicadas a cada endpoint de la API, proporcionan una visión rápida y efectiva de la salud del servicio: si la tasa es estable, los errores son bajos y la duración es aceptable, el servicio está funcionando correctamente.

---

### ¿Qué es el OTLP (OpenTelemetry Protocol)? ¿Qué ventaja tiene frente a exportar directamente a Prometheus?

OTLP (OpenTelemetry Protocol) es el protocolo estándar definido por OpenTelemetry para transportar datos de telemetría entre aplicaciones instrumentadas, collectors y herramientas de observabilidad. Utiliza gRPC y HTTP como transporte para transmitir métricas, logs y trazas en un formato unificado.

La principal ventaja frente a exportar directamente a Prometheus es el **desacoplamiento y la unificación de señales**:

1. **Desacoplamiento del backend:** al usar OTLP, la aplicación envía sus datos a un OpenTelemetry Collector, que luego los distribuye a las herramientas de almacenamiento y análisis. Si en el futuro se decide reemplazar Prometheus por otra base de datos de series temporales, no es necesario modificar el código de la aplicación.

2. **Unificación de señales:** mientras que Prometheus está diseñado exclusivamente para métricas, OTLP permite transportar los tres tipos de señales de observabilidad (métricas, logs y trazas) a través de un único protocolo y modelo de datos, simplificando la arquitectura de instrumentación.

3. **Auto-instrumentación:** OpenTelemetry cuenta con SDKs para Node.js que permiten auto-instrumentar librerías estándar (como Express, HTTP o Prisma) sin necesidad de modificar manualmente el código de la lógica de negocio, reduciendo el esfuerzo de instrumentación.

---

### ¿Cómo se relaciona OpenTelemetry con Grafana?

OpenTelemetry se encarga de generar y exportar la telemetría; Grafana de visualizarla. OTel instrumenta la aplicación y envía métricas, logs y trazas vía OTLP a un Collector, que las distribuye a backends como Prometheus. Grafana se conecta a esos backends para construir dashboards y configurar alertas.

Ambas herramientas promueven el uso de estándares abiertos e independientes de los proveedores, lo que facilita su integración. En una arquitectura típica, OpenTelemetry genera las métricas RED de la API, el Collector las envía a Prometheus, y Grafana las visualiza mediante dashboards de monitoreo.

---

## 1.3 Bibliografía
* Apuntes de al cátedra: "IngSoft_Clase-01_Infraestructura, Operaciones y Arquitectura". UTN FRLP (2026).
Grafana Labs. (s. f.). OpenTelemetry and Grafana. https://grafana.com/oss/opentelemetry/
Grafana Labs. (s. f.). The RED method: How to instrument your services. https://grafana.com/blog/the-red-method-how-to-instrument-your-services/
OpenTelemetry. (s. f.). OpenTelemetry documentation. https://opentelemetry.io/docs/