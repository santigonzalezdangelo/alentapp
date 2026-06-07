# Informe de Verificación y Entrega — Fase 4

## Grupo 08

- **Integrantes:** Melissa Braunstein · Santiago Gonzalez D'Angelo · Maria Pia Porzio · Leandro Andres Noval · Pilar Wagner
- **Repositorio:** https://github.com/santigonzalezdangelo/alentapp
- **Fecha:** 07/06/2026

---

## 4.1. Verificación Técnica

### Tamaño de imágenes

| Métrica | Antes (desarrollo) | Después (producción) | Mejora |
|---------|-------------------|---------------------|--------|
| Tamaño imagen API | 408 MB | 134 MB | −67.2% |
| Tamaño imagen Web | 223 MB | 23.3 MB | −89.6% |
| Tiempo de startup API | 33.843 s | 0.310 s | −99.1% |
| Memoria API (idle) | 124.4 MiB | 192.6 MiB | +54.8% |

La imagen de la API se redujo aproximadamente un 67.2% gracias al uso de multi-stage build, la separación de dependencias de compilación y ejecución, y la eliminación de herramientas innecesarias para producción. La imagen del frontend se redujo un 89.6%, pasando de una imagen basada en Node.js utilizada para desarrollo a una imagen mínima basada en Nginx para servir contenido estático. El tiempo de startup de la API se redujo un 99.1% respecto del entorno de desarrollo. Por otro lado, el consumo de memoria observado en producción fue superior al registrado en desarrollo (+54.8%), comportamiento atribuible a la incorporación de componentes de observabilidad (OpenTelemetry, Prometheus y Grafana) y a la ejecución de servicios adicionales asociados al entorno productivo.

### Endpoints accesibles

| Endpoint | Resultado |
|----------|-----------|
| `curl http://localhost:3000/api/v1/socios` | ✅ 200 OK |
| `curl http://localhost:3000/api/v1/sports` | ✅ 200 OK |
| `curl http://localhost:3000/api/v1/lockers` | ✅ 200 OK |
| `curl http://localhost:3000/api/v1/payments` | ✅ 200 OK |
| `curl http://localhost:3000/api/v1/disciplines` | ✅ 200 OK |
| `curl http://localhost:3000/api/v1/medical-certificates` | ✅ 200 OK |
| `curl http://localhost:3000/health` | ✅ 200 OK |
| `curl http://localhost/` (frontend vía nginx) | ✅ 200 OK |

### Estado de los contenedores

```
NAME                  IMAGE                   STATUS
alentapp-api          alentapp-api:prod        Up (healthy)
alentapp-db           postgres:16-alpine       Up (healthy)
alentapp-grafana      grafana/grafana:latest   Up
alentapp-prometheus   prom/prometheus:latest   Up
alentapp-web          alentapp-web:prod        Up (healthy)
```

### Evidencias

**Figura 1.** Comparación de tamaño de imagen API.

![Figura 1](./imagenes/api-images.png)

**Figura 2.** Comparación de tamaño de imagen Web.

![Figura 2](./imagenes/web-images.png)

**Figura 3.** Startup API (desarrollo)

![Figura 3](./imagenes/startup-api-antes.png)

**Figura 4.** Startup API (producción)

![Figura 4](./imagenes/startup-api-ahora.png)

**Figura 5.** Memoria API (desarrollo)

![Figura 5](./imagenes/memoria-api-antes.png)

**Figura 6.** Memoria API (producción)

![Figura 6](./imagenes/memoria-api-ahora.png)

---

## 4.2. Verificación de Seguridad

| Medida | Verificación | Resultado |
|--------|-------------|-----------|
| Usuario no-root | La API corre con el usuario `node` definido en el Dockerfile.prod | ✅ |
| Sin herramientas de build | `tsc` y `npm` no están disponibles en la imagen final | ✅ |
| Read-only filesystem | `docker exec alentapp-web touch /test` falla con `Read-only file system`. La API tiene `read_only: false` por compatibilidad con Prisma. | ✅ |
| Capabilities mínimas | `cap_drop: ALL` aplicado en el compose productivo. Se verificó que `docker exec alentapp-api date -s "2020-01-01"` falla con `Operation not permitted`. | ✅ |
| Variables sensibles via `.env` | `DATABASE_URL`, `POSTGRES_PASSWORD` y demás variables no están hardcodeadas en el compose | ✅ |
| Healthchecks funcionando | `docker compose ps` muestra estado `healthy` en api, web y db | ✅ |
| Límites de recursos | CPU y memoria definidos por servicio en el compose productivo | ✅ |
| Logging con rotación | Driver `json-file` con `max-size: 10m` y `max-file: 3` | ✅ |

---

## 4.3. Verificación de Observabilidad

| Ítem | Verificación | Resultado |
|------|-------------|-----------|
| OpenTelemetry expone métricas | `docker exec alentapp-api wget -qO- http://localhost:9464/metrics` devuelve métricas en formato Prometheus | ✅ |
| Prometheus scrapea el endpoint | Target `alentapp-otel` en estado **UP** en `http://localhost:9090/targets` | ✅ |
| Métricas RED presentes | `http_requests_total`, `http_request_duration`, `http_requests_errors_total`, `http_requests_active` visibles en el endpoint | ✅ |
| Rutas normalizadas | Las métricas registran `/api/v1/socios/:id` en lugar de `/api/v1/socios/99999` | ✅ |
| Grafana datasource configurado | Prometheus configurado como datasource apuntando a `http://prometheus:9090` | ✅ |
| Dashboard RED funcional | 6 paneles visibles con datos reales | ✅ |
| Paneles responden al tráfico | Los gráficos actualizan en tiempo real al generar requests | ✅ |
| Métricas de error reflejan 4xx | El panel "Tasa de error %" y "Errores por endpoint" muestran las requests a rutas inexistentes | ✅ |

### Métricas verificadas en el endpoint

```
# HELP http_requests_total Total de requests HTTP
# TYPE http_requests_total counter
http_requests_total{method="GET",route="/health",status="200"} 36

# HELP http_request_duration Duración de requests en ms
# TYPE http_request_duration histogram
http_request_duration_count{method="GET",route="/health"} 36

# HELP http_requests_active Requests concurrentes en ejecución
# TYPE http_requests_active gauge
http_requests_active{method="GET",route="/health"} 0
```

---

