---
id: 0018
estado: Propuesto
autor: Melissa Braunstein
fecha: 2026-05-15
titulo: Cancelación de Pagos
---

# TDD-0018: Cancelación de Pagos

## 1. Contexto de Negocio

### 1.1. Objetivo

Permitir la cancelación de pagos pendientes garantizando inmutabilidad y trazabilidad financiera. La cancelación nunca implica borrado físico: un pago cancelado conserva todos sus datos originales y solo cambia su `status` a `Cancelado` con el timestamp correspondiente en `canceled_at`.

La cancelación puede originarse de dos formas:

1. **Manual**: el administrador cancela explícitamente un pago `Pendiente` vía endpoint HTTP.
2. **Automática por vencimiento**: un job programado cancela los pagos cuya `due_date` ya pasó sin haberse abonado.

### 1.2. User Persona

* **Rol**: Administrador
* **Necesidad**: Cancelar pagos pendientes en casos excepcionales (ej. error de carga, acuerdo con el socio) y delegar al sistema la cancelación automática de pagos vencidos.

### 1.3. Criterios de Aceptación

* Como administrador, quiero cancelar un pago pendiente para anular cargos que ya no corresponden, manteniendo trazabilidad.

- Escenario de éxito (manual): Si el administrador cancela un pago `Pendiente`, el sistema debe actualizar su `status` a `Cancelado` y setear `canceled_at` con la fecha actual.
- Escenario de éxito (idempotencia): Si el administrador cancela un pago que ya está en `Cancelado`, el sistema debe responder 200 OK devolviendo el pago tal cual está, sin modificar `canceled_at` ni generar efectos colaterales.
- Escenario de éxito (job de vencimiento): Si un pago tiene `status = Pendiente` y `due_date < hoy`, el job diario debe cancelarlo automáticamente y setear `canceled_at`.
- Escenario de fallo: Si el administrador intenta cancelar un pago `Pagado`, el sistema debe rechazar la operación.
- Escenario de fallo: Si el administrador intenta cancelar un pago inexistente, el sistema debe rechazar la operación.
- Escenario de fallo: Si el administrador envía un `id` con formato inválido, el sistema debe rechazar la operación.
- Escenario de fallo: Si el job intenta cancelar un pago que ya está en estado terminal (porque otro proceso lo actualizó antes), la operación debe omitirse silenciosamente sin abortar el job.

## 2. Diseño Técnico

### 2.1. Modelo de Dominio

Entidad `Payment`:

* `id`: Identificador único universal (UUID).
* `member_id`: Identificador del socio.
* `amount`: Monto decimal positivo.
* `month`: Mes del pago (derivado de `due_date`). Valor entre 1 y 12.
* `year`: Año del pago (derivado de `due_date`).
* `due_date`: Fecha de vencimiento (ISO 8601). Debe ser estrictamente posterior al día actual.
* `payment_date`: Fecha en la que se registró el pago efectivo. Inicialmente `null`.
* `status`: Estado del pago (`Pendiente`, `Pagado`, `Cancelado`). En la creación es siempre `Pendiente`.
* `created_at`: Fecha de creación.
* `updated_at`: Fecha de última modificación.
* `canceled_at`: Fecha de cancelación. Inicialmente `null`.

### 2.2. Contrato de API (@alentapp/shared)

#### Cancelar pago

`PATCH /api/v1/payments/:id/cancel`

**Request Body:** vacío. La intención queda expresada en la URL.

**Response (200 OK):** El pago completo, con `status = "Cancelado"` y `canceled_at` seteado.

```ts
type PaymentResponseDTO{
  id: string;
  member_id: string;
  amount: number;
  month: number;
  year: number;
  due_date: string;
  payment_date: null;
  status: "Cancelado";
  created_at: string;
  updated_at: string;
  canceled_at: string;
}
```

### 2.3. Esquema de Persistencia

```prisma
model Payment {
  id           String    @id @default(uuid())
  member_id    String
  amount       Decimal
  month        Int
  year         Int
  status       String    @default("Pendiente")
  due_date     DateTime
  payment_date DateTime?
  created_at   DateTime  @default(now())
  updated_at   DateTime  @updatedAt
  canceled_at  DateTime?

  member       Member    @relation(fields: [member_id], references: [id])
}
```

## 3. Arquitectura y Flujo

### 3.1. Componentes de Arquitectura Hexagonal

* **Puerto (Domain)**: `PaymentRepository`
  * `findById(id)`
  * `cancel(id, canceled_at)`
  * `findExpiredPending(now)` — usado por el job de vencimiento
* **Adaptadores de Entrada (Delivery)**:
  * `PaymentController` — endpoint HTTP `PATCH /payments/:id/cancel`
  * `CancelExpiredPaymentsUseCase` — scheduler diario
* **Adaptador de Salida (Infrastructure)**: `PostgresPaymentRepository`
* **Dependencia adicional**: `Clock` — abstracción para obtener la fecha/hora actual, inyectada en el caso de uso y en el job para facilitar testing.

### 3.2. Lógica del Caso de Uso

#### Caso de Uso: `CancelPaymentUseCase`

Este caso de uso es invocado tanto por el `PaymentController` (HTTP) como por el job programado. Centraliza las reglas de cancelación para garantizar consistencia.

1. Recibir `id` del pago.
2. Validar que `id` tenga formato UUID válido.
3. Buscar pago existente por `id`. Si no existe, retornar error 404.
4. **Aplicar idempotencia y validar estado**:
   * Si el pago está en `Cancelado`: retornar el pago tal cual, con 200 OK. No re-setear `canceled_at`, no generar logs ni efectos colaterales.
   * Si el pago está en `Pagado`: rechazar con error 409.
   * Si el pago está en `Pendiente`: continuar con el flujo.
5. Setear `status = "Cancelado"` y `canceled_at = Clock.now()`.
6. Persistir cambios usando una transacción que vuelva a verificar el estado actual del pago antes de actualizar (defensa contra concurrencia, ver sección 3.4).
7. Retornar el pago cancelado.

### 3.3. Job Programado

#### Job: `CancelExpiredPaymentsUseCase`

* **Disparador**: scheduler diario (cron a las 00:30 hora local).
* **Selección**: `status = Pendiente AND due_date < Clock.now()`.
* **Acción**: para cada pago seleccionado, invoca `CancelPaymentUseCase`.
* **Errores parciales**: el fallo en un pago no debe abortar el job. Cada cancelación se procesa de forma independiente y los errores se loguean.
* **Idempotencia**: si entre la selección y la actualización el pago ya pasó a estado terminal (por intervención del admin), la lógica del caso de uso lo deja sin efecto. El job continúa con los siguientes pagos.

### 3.4. Idempotencia y Concurrencia

#### Idempotencia en la cancelación

El endpoint `PATCH /payments/:id/cancel` es **idempotente por naturaleza**: ejecutarlo N veces produce el mismo estado final (`status = Cancelado` con un `canceled_at` único). Esto resuelve los siguientes escenarios reales:

* **Doble-click del administrador**: si el operador hace click dos veces antes de que llegue la primera respuesta, ambas requests responden 200 OK con el mismo pago.
* **Reintento por timeout de red**: si el cliente no recibió la primera respuesta y reintenta, el comportamiento es idéntico.
* **Race entre admin y job**: si el admin cancela un pago justo cuando el job de vencimiento también lo procesa, una de las dos operaciones efectivamente materializa la cancelación y la otra ve el pago ya `Cancelado` y retorna sin tocar el registro.

La clave del diseño es que **`canceled_at` se setea una sola vez**, en la primera transición exitosa de `Pendiente → Cancelado`.

#### Manejo del vencimiento sin borrado

Cuando un pago vence sin ser abonado, el sistema **no elimina** ni modifica los datos originales. El job transiciona el pago a `Cancelado` y setea `canceled_at`, pero conserva `amount`, `due_date`, `month`, `year`, etc. Esto permite auditoría, reportes históricos de morosidad y distinguir cancelaciones manuales de automáticas comparando `canceled_at` con `due_date`.

#### Concurrencia entre admin, cobro y job

Tres flujos pueden intentar modificar un mismo pago en paralelo:

1. Admin cancelando vía `PATCH /payments/:id/cancel`.
2. Admin cobrando vía `PATCH /payments/:id/pay` (TDD-0011).
3. Job de vencimiento ejecutando `CancelPaymentUseCase`.

La estrategia adoptada es **transacción con relectura del estado**, idéntica a la del TDD-0011:

1. El caso de uso, antes de persistir, abre una transacción.
2. Dentro de la transacción se vuelve a leer el estado del pago.
3. Si el estado ya no es `Pendiente`, la operación se aborta:
   * Si encontró `Cancelado`: devuelve idempotentemente con 200.
   * Si encontró `Pagado`: devuelve 409.
4. Si el estado sigue siendo `Pendiente`, se aplica la cancelación y se commitea la transacción.

Esto garantiza que solo una de las operaciones concurrentes materializa el cambio.

#### Inyección de Clock

`CancelPaymentUseCase` y `CancelExpiredPaymentsUseCase` reciben una dependencia `Clock` por inyección. En producción, `Clock.now()` retorna la hora del sistema; en tests, se inyecta un mock que retorna una fecha fija. Esto permite:

* Tests determinísticos sobre el valor de `canceled_at`.
* Simular escenarios de vencimiento del job sin depender del reloj real.

## 4. Casos de Borde y Errores

| Escenario                                              | Resultado Esperado                              | Código HTTP |
| ------------------------------------------------------ | ----------------------------------------------- | ----------- |
| Pago inexistente                                       | El pago no existe                               | 404         |
| Pago en `Pendiente`                                      | Se cancela exitosamente, `canceled_at` seteado  | 200         |
| Pago ya en `Cancelado` (idempotencia)                   | Se retorna el pago sin modificar                | 200         |
| Pago en `Pagado`                                         | No se puede cancelar un pago ya abonado         | 409         |
| ID con formato inválido                                | Formato de ID inválido                          | 400         |
| Error de DB                                            | Error interno                                   | 500         |
| Job: pago ya en estado terminal al momento de procesar | Omitido sin error, registrado en log            | N/A         |

## 5. Plan de Implementación

1. Crear tipos compartidos de cancelación en `@alentapp/shared`.
2. Asegurar que la interfaz `Clock` (definida junto a TDD-0010 y TDD-0011) esté disponible.
3. Ampliar `PaymentRepository` con `cancel` y `findExpiredPending`.
4. Implementar `CancelPaymentUseCase` con manejo de idempotencia y relectura transaccional.
5. Crear endpoint `PATCH /api/v1/payments/:id/cancel` en `PaymentController`.
6. Implementar `CancelExpiredPaymentsUseCase` con scheduler diario.
7. Integrar frontend administrativo con acción "Cancelar pago" en la vista de detalle.

## 6. Observaciones Adicionales

* La cancelación es **idempotente**: invocar el endpoint N veces es equivalente a invocarlo una vez. `canceled_at` se setea solo en la primera transición real.
* La cancelación es una transición terminal: un pago `Cancelado` no puede volver a `Pendiente` ni transicionar a `Pagado`.
* Si un pago fue cancelado automáticamente por vencimiento y el socio efectivamente pagó, el administrador debe crear un nuevo pago vía TDD-0010 en lugar de intentar revivir el cancelado. Esto es posible porque la unicidad por período solo aplica a pagos activos, no cancelados.
* **Socios inactivos**: si un socio pasa a `Suspendido`, sus pagos existentes en `Pendiente` se mantienen en ese estado. Si no se abonan antes de la `due_date`, el job de vencimiento los cancelará automáticamente. No se realiza una cancelación masiva al momento de la inactivación del socio.
* `canceled_at` se setea automáticamente vía `Clock.now()`. Nunca se acepta desde el cliente.
* No se permite la eliminación física de pagos bajo ninguna circunstancia.
* El `CancelPaymentUseCase` es el único punto donde se materializa la transición a `Cancelado`. Tanto el endpoint HTTP como el job lo invocan, garantizando reglas idénticas.
* La concurrencia entre los distintos flujos (cancelación manual, cobro y job de vencimiento) se resuelve mediante relectura transaccional del estado antes de persistir cualquier cambio.

