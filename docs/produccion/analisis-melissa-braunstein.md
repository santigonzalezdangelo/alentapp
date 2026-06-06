# Fase 1

## 1.1 Análisis de Vulnerabilidades y Buenas Prácticas — Docker Compose + Dockerfiles

Se analizaron los siguientes archivos:
- `docker-compose.yml`
- `packages/web/Dockerfile`
- `packages/api/Dockerfile`

---


| # | Problema | ¿Dónde ocurre? | Impacto | Solución Propuesta |
|---|----------|----------------|---------|-------------------|
| 1 | **Credenciales hardcodeadas en texto plano** | `docker-compose.yml` — variables de entorno `POSTGRES_USER`, `POSTGRES_PASSWORD`, `DATABASE_URL` del servicio `db` y `api` | **Crítico.** Las contraseñas quedan expuestas en el repositorio de código. Cualquier persona con acceso al repo (o al historial de git) puede comprometer la base de datos. En producción, una filtración de credenciales puede derivar en pérdida total de datos. | Usar un archivo `.env` excluido del repositorio vía `.gitignore`. |
| 2 | **Puerto de base de datos expuesto al host** | `docker-compose.yml` — servicio `db`, directiva `ports: - '5432:5432'` | **Alto.** Publicar el puerto 5432 en el host hace que PostgreSQL sea accesible desde cualquier interfaz de red de la máquina anfitriona (y potencialmente desde Internet si el firewall no está bien configurado). | Eliminar la sección `ports` del servicio `db`. Los contenedores dentro de la misma red Docker pueden comunicarse entre sí por nombre de servicio sin exponer puertos al host. Solo exponer el puerto si se necesita acceso externo de forma explícita y controlada. |
| 3 | **Montaje del código fuente completo en producción** | `docker-compose.yml` — servicios `api` y `web`, directiva `volumes: - .:/app` | **Alto.** Montar el directorio raíz del proyecto dentro del contenedor anula el propósito de la imagen Docker: cualquier cambio accidental en el host modifica el entorno del contenedor. Además, expone archivos sensibles (`.env`, claves SSH, configuraciones locales) dentro del contenedor. Este patrón es exclusivo de desarrollo. | En producción, eliminar todos los bind mounts de código fuente. El código debe estar **copiado dentro de la imagen** durante el build (`COPY . .`). Usar volúmenes nombrados únicamente para datos que deben persistir (como `pgdata`). |
| 4 | **Imagen sin usuario no-root (ejecución como root)** | `packages/web/Dockerfile` y `packages/api/Dockerfile` — ambos carecen de directiva `USER` | **Alto.** Por defecto, los procesos dentro de un contenedor corren como `root` (UID 0). Si un atacante explota una vulnerabilidad en la aplicación y logra escapar del contenedor, obtiene privilegios de root en el host. Esto viola el principio de mínimo privilegio. | Agregar un usuario no-root en el Dockerfile antes del `CMD`. Ejemplo: ```dockerfile RUN addgroup -S appgroup && adduser -S appuser -G appgroup USER appuser ``` La imagen base `node:20-alpine` ya soporta este patrón fácilmente. |
| 5 | **Herramientas y modo de desarrollo usados en producción** | `docker-compose.yml` — servicio `api` ejecuta `npx tsx watch` (modo watch); servicio `web` ejecuta `npm run dev --host 0.0.0.0` (servidor de desarrollo de Vite); variables `CHOKIDAR_USEPOLLING=true` y `WATCHPACK_POLLING=true` en ambos servicios | **Alto.** Los servidores de desarrollo (Vite dev server, tsx watch) no están optimizados para producción: no aplican minificación, exponen sourcemaps, no tienen límites de concurrencia robustos y consumen más recursos. Ejecutar `--host 0.0.0.0` en Vite expone el servidor de desarrollo a todas las interfaces de red. Además, el polling de archivos consume CPU innecesariamente. | Para producción, construir artefactos optimizados y servirlos con un servidor apropiado. Para `web`: ejecutar `npm run build` y servir el output estático con **Nginx**. Para `api`: compilar TypeScript y ejecutar el resultado con `node` directamente, sin watchers. Usar builds multi-stage en los Dockerfiles para separar el entorno de build del de producción. |

---

## 1.2 Investigacion de OpenTelemetry

### ¿Qué es OpenTelemetry y cómo se diferencia de Prometheus?
OpenTelemetry es un framework y toolkit diseñado para faciltar en la geracion, expostacion y recoleccion de telemetry data en trazas, metrics y logs. Su principal objetivo es facilitar el uso de aplicaciones y sistemas, sin importar el lenguaje de porgramacion, infrastrucutra o el entorno de ejecucion que se este usando. Los datos de telemetria del frontend y backend son dejados intencionalmente a otras herramientas, ya que OTel no se encarga de ellos. Una de estas herramientas puede ser Prometheus, que colecciona y guarda sus metricas como series data.
OTel es un estandar unificado y un framework, cuya principal funcion es ser un instrumento de medicion que no guarda datos, solo los genera, procesa y los envia. Prometheus es un sistema de monitoreo y alertas, almacena sus propios datos y utiliza un modelo basado en pull. Sus enfoques son distintos: mientras que OTel se dedica al diagnostico profundo para encontrar el orige del fallo del software, Prometheus monitorea y alerta sobre el estado de la infraestructura. 


### ¿Cuáles son los "3 pilares" de la observabilidad? ¿Cuál aborda OpenTelemetry?

La observabilidad es la capacidad de entender el estado interno de un sistema a partir de sus señales externas (telemetría). Para que un sistema sea observable debe ser instrumentado, es decir, debe emitir trazas, metricas o logs (los 3 pilares), los cuales seran mandados a un observability backend para procesarlos. OTel aborda los aborda a todos, de esta manera podemos saber no solo que esta mal con el sistema, sino tambien por qué. 

### Expliquen el concepto de métricas RED (Rate, Errors, Duration). ¿Para qué sirve cada una?

Tom Wilkie y su equipo crearon el RED Method luego de darse cuenta de que el metodo popular del momento (USE Method), aplicaba oara hardware, redes y dicos pero no para servicios. Con la popularizacion de los microservicios, era necesario una nueva filosofia de monitoreo. Asi que, para cada recurso, se monitorea:

* **Rate:** Mide la cantidad de solicitudes que procesa un servicio en un período de tiempo, normalmente expresada en requests por segundo (RPS). Sirve para Conocer el nivel de tráfico que recibe la aplicación, detectar picos o caídas de uso y relacionar problemas de rendimiento con aumentos de carga.

* **Errors:** Mide la cantidad o porcentaje de solicitudes que terminan con error, generalmente respuestas HTTP 4xx o 5xx. Detecta fallos en la aplicación, identificar problemas de validación (4xx) o errores internos (5xx) y medir la confiabilidad del servicio.

* **Duration:** Mide el tiempo que tarda una solicitud en ser procesada, también conocido como latencia. Evalua el rendimiento percibido por los usuarios, detectar endpoints lentos e identificar cuellos de botella en la aplicación o infraestructura.


### ¿Qué es el OTLP (OpenTelemetry Protocol)? ¿Qué ventaja tiene frente a exportar directamente Prometheus?

El OpenTelemetry Protocol es el protocolo estándar definido por OpenTelemetry para transportar datos de observabilidad desde las aplicaciones hacia colectores o plataformas de monitoreo. Normalmente, una aplicación instrumentada con OpenTelemetry envía los datos mediante OTLP a un OpenTelemetry Collector, que luego los distribuye a herramientas como Prometheus, Grafana, Jaeger o Tempo. Esto es una ventaja con respecto a exportar directamente de Prometheus, ya con un mismo protocolo y modelo de datos se pueden enviar Métricas, Trazas y Logs.

### ¿Cómo se relaciona OpenTelemetry con Grafana?

OpenTelemetry ofrece herramientas open source independientes del proovedor, SDKs y estandares para observabilidad de aplicaciones. Grafana busca fomentar la interoperabilidad y la liberad de eleccion con su plataforma de observabilidad, lo que encaja a la perfeccion con OTel. La brecha que existe entre operaciones y desarrollo de aplicaciones es cerrada por esta integracion de telemetria de aplicacion y telemetria de infraestructura y plataforma, unificando en un unico backend de monitorizacion de codigo abierto. 

## Bibliografia

Grafana Labs. (s. f.). OpenTelemetry and Grafana. https://grafana.com/oss/opentelemetry/
Grafana Labs. (s. f.). The RED method: How to instrument your services. https://grafana.com/blog/the-red-method-how-to-instrument-your-services/
OpenTelemetry. (s. f.). OpenTelemetry documentation. https://opentelemetry.io/docs/