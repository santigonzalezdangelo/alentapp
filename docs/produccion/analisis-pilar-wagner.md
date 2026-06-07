# Fase 1 - Analizar y proponer

## 1.1 Análisis de la infraestructura Docker actual

Se analizaron los siguientes archivos del proyecto:
- `docker-compose.yml`
- `packages/api/Dockerfile`
- `packages/web/Dockerfile`

El objetivo fue identificar problemas o vulnerabilidades respecto a buenas prácticas de producción, considerando seguridad, tamaño de imagen, manejo de recursos, configuración del entorno y separación entre desarrollo y producción.

| # | Problema | ¿Dónde ocurre? | Impacto | Solución propuesta |
|---|----------|----------------|---------|-------------------|
| 1 | **Credenciales hardcodeadas en texto plano** | `docker-compose.yml` — variables `POSTGRES_USER`, `POSTGRES_PASSWORD` y `DATABASE_URL` definidas directamente en el archivo | Alto. Las credenciales quedan expuestas en el repositorio. Cualquier persona con acceso al código puede comprometer la base de datos. | Mover las credenciales a un archivo `.env` excluido del repositorio vía `.gitignore` y referenciarlas desde `docker-compose.yml` con `${VARIABLE}`. |
| 2 | **Puerto de base de datos expuesto al host** | `docker-compose.yml` — servicio `db`, directiva `ports: - '5432:5432'` | Alto. PostgreSQL queda accesible desde el host y potencialmente desde la red externa si el firewall no está configurado correctamente. La base de datos solo debería ser consumida por la API internamente. | Eliminar la sección `ports` del servicio `db`. Los contenedores dentro de la misma red Docker pueden comunicarse entre sí por nombre de servicio sin exponer puertos al host. |
| 3 | **Los contenedores ejecutan procesos como usuario root por defecto** | `packages/api/Dockerfile` y `packages/web/Dockerfile` — ninguno define una directiva `USER` | Alto. Si una vulnerabilidad en la aplicación fuera explotada, el proceso tendría privilegios de root dentro del contenedor, violando el principio de mínimo privilegio. | Agregar un usuario no-root en los Dockerfiles antes del `CMD`. |
| 4 | **Configuración orientada a desarrollo ejecutándose en el contenedor** | `docker-compose.yml` — servicio `api` usa `npx tsx watch` (modo watch) y servicio `web` usa `npm run dev` (servidor de desarrollo de Vite). También se definen `CHOKIDAR_USEPOLLING=true` y `WATCHPACK_POLLING=true` | Alto. Los servidores de desarrollo no están optimizados para producción, no aplican optimizaciones de rendimiento, exponen información innecesaria y consumen más recursos con el polling de archivos. | Separar la configuración de desarrollo y producción. Para producción, compilar TypeScript y ejecutar con `node` directamente. Para el frontend, generar el build con `vite build` y servir los archivos estáticos con Nginx. |
| 5 | **Uso de `npm install` en lugar de `npm ci` en los Dockerfiles** | `packages/api/Dockerfile` — `packages/web/Dockerfile` | Medio. `npm install` puede instalar versiones de dependencias distintas a las definidas en el `package-lock.json`, generando builds no reproducibles. En producción esto puede derivar en comportamientos inesperados entre entornos. | Reemplazar `RUN npm install` por `RUN npm ci` para garantizar instalaciones reproducibles basadas exactamente en el lockfile. En la imagen final de producción, usar `npm ci --omit=dev` para excluir dependencias de desarrollo y reducir el tamaño de la imagen. |

### Conclusión del análisis Docker

El análisis reveló que la configuración actual fue diseñada exclusivamente para desarrollo local y no cumple con los estándares mínimos de seguridad y optimización necesarios para un entorno productivo. Los problemas más críticos son la exposición de credenciales en el código fuente, la ejecución de procesos como root y el uso de servidores de desarrollo dentro de los contenedores.

Resolver estos puntos implicaría no solo mejorar la seguridad del sistema sino también reducir significativamente el tamaño de las imágenes y el consumo de recursos, acercando la infraestructura a lo que se esperaría en un despliegue real.

---

## 1.2 Investigación sobre OpenTelemetry

### ¿Qué es OpenTelemetry y cómo se diferencia de Prometheus?

OpenTelemetry es un framework de observabilidad de código abierto que proporciona herramientas, APIs y SDKs para generar, recopilar y exportar datos de telemetría desde aplicaciones. Estos datos incluyen métricas, logs y trazas, y pueden enviarse a distintas herramientas de análisis y almacenamiento.

Prometheus, en cambio, es un sistema de monitoreo y almacenamiento de métricas. Su función principal es recolectar métricas, almacenarlas como series temporales y permitir consultarlas mediante su lenguaje de consulta PromQL.

La diferencia principal es de rol: OpenTelemetry se encarga de instrumentar la aplicación y generar datos de telemetría de forma estandarizada e independiente del proveedor, mientras que Prometheus se encarga de recolectar, almacenar y consultar métricas. Además, OpenTelemetry abarca los tres pilares de la observabilidad (métricas, logs y trazas), mientras que Prometheus se centra principalmente en métricas.

---

### ¿Cuáles son los tres pilares de la observabilidad? ¿Cuál aborda OpenTelemetry?

Los tres pilares de la observabilidad son:

- **Métricas:** valores numéricos registrados a lo largo del tiempo. Permiten medir aspectos como cantidad de solicitudes, errores, uso de CPU, memoria o duración de operaciones. Actúan como indicadores de disponibilidad y rendimiento del sistema.

- **Logs:** registros de eventos ocurridos durante la ejecución de una aplicación. Pueden ser estructurados o no estructurados y contener metadata. Permiten analizar errores, comportamientos inesperados o eventos importantes en el tiempo.

- **Trazas:** representan el recorrido completo de una solicitud a través de los distintos componentes del sistema. Permiten entender qué ocurrió durante una operación y en qué parte se produjo una demora o error.

OpenTelemetry aborda los tres pilares, proporcionando APIs y SDKs para instrumentar aplicaciones y obtener métricas, logs y trazas. Toda esta información puede luego ser exportada a herramientas externas para su almacenamiento, análisis o visualización.

---

### ¿Qué son las métricas RED? ¿Para qué sirve cada una?

Las métricas RED fueron propuestas por Tom Wilkie como una forma de monitorear servicios desde la perspectiva de las solicitudes que reciben. Surgieron ante la necesidad de un método de monitoreo orientado a servicios, dado que el método USE (Utilization, Saturation, Errors) estaba pensado para hardware e infraestructura. RED significa:

#### Rate
Mide la cantidad de solicitudes que procesa un servicio en un período de tiempo, normalmente expresada en requests por segundo. Sirve para conocer el nivel de actividad del servicio, detectar picos de tráfico o caídas repentinas en la actividad y correlacionar problemas de rendimiento con aumentos de carga.

#### Errors
Mide la cantidad o porcentaje de solicitudes que finalizan con error, generalmente respuestas HTTP 4xx o 5xx. Sirve para detectar fallos en la aplicación, identificar endpoints con fallas frecuentes y evaluar la confiabilidad del servicio.

#### Duration
Mide el tiempo que tarda el servicio en procesar y responder una solicitud, también conocido como latencia. Sirve para evaluar el rendimiento percibido por los usuarios, detectar endpoints lentos e identificar cuellos de botella en la aplicación o infraestructura.

---

### ¿Qué es OTLP? ¿Qué ventaja tiene frente a exportar directamente a Prometheus?

OTLP (OpenTelemetry Protocol) es el protocolo estándar definido por OpenTelemetry para transportar datos de telemetría entre aplicaciones instrumentadas, collectors y herramientas de observabilidad. Utiliza protocolos como gRPC y HTTP para transmitir métricas, logs y trazas.

Una aplicación instrumentada con OpenTelemetry puede enviar sus datos mediante OTLP a un OpenTelemetry Collector, que luego los distribuye a distintas herramientas como Prometheus, Grafana, Jaeger o Tempo.

La principal ventaja frente a exportar directamente a Prometheus es que OTLP desacopla la aplicación de una herramienta específica. Con un único protocolo estándar se pueden transportar los tres tipos de señales de observabilidad (métricas, logs y trazas), mientras que exportar directamente a Prometheus limita la instrumentación a métricas únicamente y acopla la aplicación a esa herramienta en particular.

---

### ¿Cómo se relaciona OpenTelemetry con Grafana?

OpenTelemetry y Grafana son herramientas complementarias en una arquitectura de observabilidad. OpenTelemetry se encarga de instrumentar la aplicación y generar datos de telemetría, mientras que Grafana permite visualizar y analizar esa información mediante dashboards, gráficos y paneles interactivos.

Ambas herramientas promueven el uso de estándares abiertos e independientes de los proveedores, lo que facilita su integración. En una arquitectura típica, OpenTelemetry genera las métricas de la API, Prometheus las recolecta y almacena, y Grafana las visualiza mediante dashboards de monitoreo, permitiendo detectar problemas de rendimiento, errores o comportamientos anómalos en tiempo real.

---

## Bibliografía

- OpenTelemetry Documentation: https://opentelemetry.io/docs/
- Grafana Labs — The RED Method: https://grafana.com/blog/the-red-method-how-to-instrument-your-services/
- Grafana Labs — OpenTelemetry and Grafana: https://grafana.com/oss/opentelemetry/