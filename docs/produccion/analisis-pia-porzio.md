# Fase 1 - Análisis de infraestructura Docker y observabilidad

## 1.1 Análisis de infraestructura Docker actual

Se analizaron los siguientes archivos del proyecto:

- `docker-compose.yml`
- `packages/api/Dockerfile`
- `packages/web/Dockerfile`

El objetivo fue identificar problemas o vulnerabilidades respecto a buenas prácticas de producción, considerando seguridad, tamaño de imagen, manejo de recursos, configuración del entorno y separación entre desarrollo y producción.

| # | Problema | ¿Dónde ocurre? | Impacto | Solución propuesta |
|---|----------|----------------|---------|--------------------|
| 1 | Credenciales y datos sensibles definidos directamente en la configuración. | `docker-compose.yml` — variables como `POSTGRES_USER`, `POSTGRES_PASSWORD`, `POSTGRES_DB` y `DATABASE_URL`. | Alto. Las credenciales quedan visibles en el código fuente y cualquier persona con acceso al repositorio podría conocer datos de conexión a la base de datos. | Mover las credenciales a un archivo `.env` excluido del repositorio y referenciarlas desde `docker-compose.yml` mediante variables de entorno. |
| 2 | Exposición innecesaria del puerto de PostgreSQL al host. | `docker-compose.yml` — servicio `db`, directiva `ports`. | Alto. La base de datos queda accesible desde el host, aumentando la superficie de ataque. En un entorno productivo, la base no debería exponerse si solo necesita ser consumida por servicios internos. | Eliminar la exposición del puerto de PostgreSQL en producción. Los contenedores pueden comunicarse entre sí usando el nombre del servicio dentro de la red Docker. |
| 3 | Configuración orientada a desarrollo dentro del entorno Docker. | `docker-compose.yml` — servicio `api` ejecutando modo watch y servicio `web` ejecutando servidor de desarrollo. También se refleja en la forma en que las imágenes quedan preparadas para ejecutar comandos orientados a desarrollo. | Alto. Los servidores de desarrollo no están optimizados para producción, consumen más recursos y pueden exponer información innecesaria. Además, no representan una configuración productiva real. | Separar configuración de desarrollo y producción. Para producción, compilar la API y ejecutar el resultado con `node`. En el frontend, generar el build y servir archivos estáticos con un servidor apropiado. |
| 4 | Los contenedores ejecutan procesos como usuario root por defecto. | `packages/api/Dockerfile` y `packages/web/Dockerfile`, ya que no se define un usuario no-root. | Alto. Si una aplicación dentro del contenedor fuera comprometida, el proceso tendría privilegios elevados dentro del contenedor. Esto va contra el principio de mínimo privilegio. | Definir un usuario no-root en los Dockerfiles, por ejemplo usando `USER node` o creando un usuario específico para ejecutar la aplicación. |
| 5 | Falta de controles de disponibilidad y recursos en servicios principales. | `docker-compose.yml` — los servicios `api` y `web` no cuentan con healthcheck. Tampoco se definen límites explícitos de CPU o memoria. | Medio. Sin healthchecks, Docker no puede detectar correctamente si un servicio está disponible o fallando. Sin límites de recursos, un servicio podría consumir demasiada CPU o memoria y afectar al resto del entorno. | Agregar healthchecks para `api` y `web`, por ejemplo verificando endpoints HTTP. También definir límites de recursos como `mem_limit` y `cpus` según las necesidades del entorno. |

### Conclusión del análisis Docker

La configuración actual está orientada principalmente a un entorno de desarrollo local. Esto se evidencia en el uso de comandos de desarrollo, credenciales visibles, exposición de puertos internos, falta de usuarios no-root y ausencia de controles de disponibilidad y recursos.

Para acercar la infraestructura a buenas prácticas de producción, sería necesario separar los entornos de desarrollo y producción, proteger credenciales, reducir la exposición de servicios internos, ejecutar procesos con usuarios de menor privilegio y agregar mecanismos básicos de monitoreo y control de recursos.

---

## 1.2 Investigación sobre OpenTelemetry

### ¿Qué es OpenTelemetry y cómo se diferencia de Prometheus?

OpenTelemetry es un framework de observabilidad de código abierto que permite instrumentar aplicaciones para generar, recopilar y exportar datos de telemetría. Estos datos pueden incluir métricas, logs y trazas.

Su objetivo principal es estandarizar la forma en que una aplicación produce información de observabilidad, independientemente del lenguaje, infraestructura o herramienta de monitoreo utilizada.

Prometheus, en cambio, es un sistema de monitoreo y almacenamiento de métricas. Su función principal es recolectar métricas, almacenarlas como series temporales y permitir consultas sobre ellas.

La diferencia principal es que OpenTelemetry se enfoca en la instrumentación y generación de telemetría, mientras que Prometheus se enfoca en recolectar, almacenar y consultar métricas. OpenTelemetry puede trabajar con métricas, logs y trazas; Prometheus se centra principalmente en métricas.

---

### ¿Cuáles son los tres pilares de la observabilidad? ¿Cuál aborda OpenTelemetry?

Los tres pilares de la observabilidad son:

- **Métricas:** valores numéricos registrados a lo largo del tiempo. Sirven para medir aspectos como cantidad de solicitudes, errores, uso de CPU, memoria o duración de operaciones.
- **Logs:** registros de eventos ocurridos durante la ejecución de una aplicación. Permiten analizar errores, comportamientos inesperados o eventos importantes.
- **Trazas:** representan el recorrido de una solicitud a través de distintos componentes del sistema. Permiten entender qué ocurrió durante una operación y en qué parte se produjo una demora o error.

OpenTelemetry aborda los tres pilares, ya que permite instrumentar aplicaciones para generar métricas, logs y trazas. Luego, esa información puede enviarse a herramientas externas para su almacenamiento, análisis o visualización.

---

### ¿Qué son las métricas RED? ¿Para qué sirve cada una?

Las métricas RED son una forma de monitorear servicios desde la perspectiva de las solicitudes que reciben. RED significa:

- **Rate**
- **Errors**
- **Duration**

Estas métricas permiten evaluar rápidamente el comportamiento, rendimiento y confiabilidad de un servicio.

#### Rate

Rate mide la cantidad de solicitudes que procesa un servicio en un período de tiempo.

Sirve para conocer el nivel de tráfico que recibe la aplicación, detectar picos de uso o caídas repentinas en la actividad.

#### Errors

Errors mide la cantidad o proporción de solicitudes que finalizan con error.

Sirve para detectar problemas de funcionamiento, endpoints con fallas frecuentes o aumentos en respuestas HTTP de error.

#### Duration

Duration mide el tiempo que tarda el servicio en responder una solicitud.

Sirve para evaluar la latencia percibida por los usuarios, detectar endpoints lentos e identificar posibles cuellos de botella.

En el contexto de una API, estas métricas pueden aplicarse a los endpoints para observar cuántas requests recibe cada uno, cuántas fallan y cuánto tardan en responder.

---

### ¿Qué es OTLP? ¿Qué ventaja tiene frente a exportar directamente a Prometheus?

OTLP significa OpenTelemetry Protocol. Es el protocolo estándar definido por OpenTelemetry para transportar datos de telemetría entre aplicaciones instrumentadas, collectors y herramientas de observabilidad.

Una aplicación puede enviar sus métricas, logs y trazas mediante OTLP hacia un OpenTelemetry Collector. Luego, ese collector puede procesar y reenviar la información a distintas herramientas, como Prometheus, Grafana, Jaeger o Tempo.

La ventaja frente a exportar directamente a Prometheus es que OTLP desacopla la aplicación de una herramienta específica. En lugar de instrumentar el sistema pensando únicamente en Prometheus, se utiliza un protocolo estándar capaz de transportar distintos tipos de señales de observabilidad.

Además, Prometheus se centra principalmente en métricas, mientras que OTLP permite trabajar también con logs y trazas.

---

### ¿Cómo se relaciona OpenTelemetry con Grafana?

OpenTelemetry y Grafana cumplen roles complementarios dentro de una arquitectura de observabilidad.

OpenTelemetry se encarga de instrumentar la aplicación y generar datos de telemetría. Grafana se encarga de visualizar y analizar esa información mediante dashboards, gráficos y paneles.

Una arquitectura posible sería:

1. La aplicación genera telemetría mediante OpenTelemetry.
2. Las métricas son recolectadas o almacenadas por una herramienta compatible.
3. Grafana consulta esa fuente de datos.
4. Grafana muestra dashboards con información sobre tráfico, errores, duración de requests u otras señales relevantes.

De esta manera, OpenTelemetry permite obtener la información de observabilidad y Grafana permite analizarla visualmente para detectar problemas de rendimiento, errores o comportamientos anómalos.

---

## Bibliografía

- OpenTelemetry Documentation: https://opentelemetry.io/docs/
- Prometheus Documentation: https://prometheus.io/docs/introduction/overview/
- Grafana Documentation: https://grafana.com/docs/grafana/latest/
- RED Method - Tom Wilkie: https://grafana.com/blog/2018/08/02/the-red-method-how-to-instrument-your-services/