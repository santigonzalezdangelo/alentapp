---
id: 0001
estado: Propuesto
autor: Santiago Gonzalez D'Angelo
fecha: 2026-06-04
titulo: Análisis de Infraestructura Docker y OpenTelemetry
---

# Fase 1 - Analizar y proponer

## 1. Análisis de la infraestructura Docker actual

| # | Problema | ¿Dónde ocurre? | Impacto | Solución propuesta |
|---|-----------|---------------|----------|-------------------|
| 1 | Credenciales hardcodeadas. | docker-compose.yml:Líneas 6, 7, 8 | Alto | Utilizar variables de entorno .env para definir las credenciales e importarlas al docker-compose.yml. |
| 2 | Ausencia de Healthcheck para api y web. | docker-compose.yml | Medio | Agregar healthcheck para los servicios api y web, verificando endpoints como /health o la disponibilidad HTTP del servicio. |
| 3 | Usuario corre como root por falta de aclaración. | packages/api/Dockerfile, packages/web/Dockerfile | Alto | Definir `USER node` o crear un usuario con permisos personalizados. |
| 4 | No hay limitación de recursos. | docker-compose.yml | Medio | Añadir controles de recursos con `mem_limit:`, `cpus:`. |
| 5 | Instalación de dependencias innecesarias con `RUN npm install`. | packages/api/Dockerfile: 12, packages/web/Dockerfile: 8 | Medio | Utilizar npm ci para instalaciones reproducibles y npm ci --omit=dev en la imagen final para excluir dependencias de desarrollo y reducir el tamaño de la imagen. |

---

## 2. Investigación sobre OpenTelemetry

### 2.1 ¿Qué es OpenTelemetry y cómo se diferencia de Prometheus?

La observabilidad es la capacidad de comprender el estado interno de un sistema a partir de la informacion que genera durante su funcionamiento. Principalmente a traves de metricas, logs y trazas.

OpenTelemetry es un framework de observabilidad de código abierto que ofrece un conjunto de herramientas que permiten generar, recopilar y exportar datos de telemetría. Estos datos incluyen métricas, trazas y logs.

Prometheus por otro lado, es un sistema de monitoreo y almacenamiento de métricas. Su objetivo es recopilar y almacenar métricas. Mientras que OpenTelemetry se encarga de generar y exportar informacion de observabilidad, Prometheus se encarga de recolectar y almacenar. Otra diferencia clave es que Prometheus trabaja principalmente con métricas, mientras que OpenTelemetry permite trabajar tambien con logs y trazas.


### 2.2 ¿Cuáles son los tres pilares de la observabilidad? ¿Cuál aborda OpenTelemetry?

Los tres pilares de la observabilidad son las Métricas, los Logs y las Trazas. Las Métricas son una medida de un servicio que se registra durante su ejecución, actuan como indicadores de disponibilidad y rendimiento. Los Logs son archivos de texto con marcas de tiempo, representan eventos que ocurren durante la ejecución, pueden o no ser estructurados y contener metadata. Las Trazas nos dan una imagen del recorrido que realiza una request a lo largo de la aplicación.

OpenTelemetry aborda los tres pilares de la observabilidad proporcionando APIs, SDKs e instrumentos que permiten obtener informacion sobre el comportamiento de una aplicación. En el caso de las métricas, permite medir aspectos como la cantidad de solicitudes, tiempos de respuesta o consumo de recursos; en los logs, registrar eventos y errores ocurridos durante la ejecución; y mediante las trazas, permite seguir el recorrido completo de una solicitud a través de los distintos componentes del sistema. Toda esta información puede ser recopilada y luego exportada a herramientas de almacenamiento y análisis.

### 2.3 ¿Qué son las métricas RED (Rate, Errors, Duration)? ¿Para qué sirve cada una?

Las métricas RED, propuestas por Tom Wilkie, son indicadores que permiten obtener una visión rápida del comportamiento, rendimiento y confiabilidad de un sistema de una forma clara. En palabras del mismo Tom, se trata de un indicador de que tan felices serán tus clientes.

### Rate

**Definición**: Mide la cantidad de solicitudes procesadas por un servicio en un periodo de tiempo establecido.

**Utilidad**: Ayuda a conocer el nivel de actividad o carga que recibe la aplicacion.

### Errors

**Definición**: Mide el porcentaje o cantidad de solicitudes que finalizan con error.

**Utilidad**: Busca encontrar problemas de funcionamiento y evaluar la confiabilidad del sistema.

### Duration

**Definición**: Mide el tiempo que el sistema tarda en procesar una solicitud.

**Utilidad**: Permite evaluar el rendimiento percibido por los usuarios finales e identificar cuellos de botella.

---

### 2.4 ¿Qué es OTLP (OpenTelemetry Protocol)? ¿Qué ventajas tiene frente a exportar directamente a Prometheus?

El OTLP es el protocolo definido por OpenTelemetry para la codificacion, transporte y entrega de datos de telemetria entre aplicaciones que generan informacion y sistemas que la reciben. Algunos de los protocolos que utiliza son, gRPC y HTTP, permitiendo a traves de ellos transmitir métricas, logs y trazas.

La principal ventaja de OTLP y lo que la diferencia de sistemas como Prometheus es que proporciona un mecanismo de comunicación independiente de la herramienta de destino. Ademas, como ya se mencionó Prometheus trabaja principalmente con métricas, mientras que OTLP permite el uso de los tres pilares de la observabilidad.

### 2.5 ¿Cómo se relaciona OpenTelemetry con Grafana?

Podría decirse que OpenTelemetry (OTL) y Grafana son complementarios en terminos de observabilidad. Mientras que OTL genera, recopila y exporta datos de telemetría, Grafana permite visualizar y analizar esos datos mediante dashboards y graficos interactivos.

OTL encaja naturalmente con las estrategias de Grafana, ya que ambos promueven el uso de estandares abiertos e independientes de los proveedores. Gracias a esta ideología se pueden agrupar en una misma plataforma, información proveniente de distintas fuentes.

