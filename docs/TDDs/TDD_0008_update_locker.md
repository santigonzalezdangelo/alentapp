---
id: 0008
estado: Propuesto
autor: Pilar Wagner
fecha: 2026-05-03
titulo: Actualización y Asignación de Lockers
---

# TDD-0008: Actualización y Asignación de Lockers

## 1. Contexto de Negocio

### 1.1. Objetivo

Permitir a los administradores actualizar el estado y la asignación de lockers, controlando correctamente la disponibilidad, ocupación y mantenimiento de los casilleros del club.

### 1.2. User Persona

* **Rol**: Administrador
* **Necesidad**: Asignar lockers disponibles a socios, modificar estados de lockers existentes evitando conflictos de asignación y gestionar situaciones excepcionales como lockers dañados o fuera de servicio.

### 1.3. Criterios de Aceptación

* Como administrador, quiero asignar lockers para gestionar correctamente el uso y disponibilidad de los casilleros.

- Escenario de éxito: "Si el locker está disponible y el socio existe, el sistema debe asignarlo correctamente".
- Escenario de éxito: "Si un locker ocupado pasa a estado `MAINTENANCE`, el sistema debe permitir el cambio de estado y conservar la referencia del socio asignado hasta que se realice una nueva asignación manual".
- Escenario de éxito: "Si un locker en estado `MAINTENANCE` vuelve a estar disponible, el sistema debe permitir actualizar su estado a `AVAILABLE`".
- Escenario de éxito: "Si un locker ocupado se libera, el sistema debe eliminar la asignación del socio y actualizar el estado a `AVAILABLE`".

- Escenario de fallo: "Si el locker se encuentra en estado `MAINTENANCE`, el sistema debe bloquear la asignación y notificar el error".
- Escenario de fallo: "Si el locker ya está ocupado, el sistema debe impedir una nueva asignación".
- Escenario de fallo: "Si el socio indicado no existe, el sistema debe cancelar la operación y notificar el error".
- Escenario de fallo: "Si se envían estados inválidos, el sistema debe rechazar la actualización".

---

## 2. Diseño Técnico

### 2.1. Modelo de Dominio

La entidad Locker mantiene los mismos campos definidos para el alta.

* `id`: Identificador único universal (UUID).
* `number`: Número entero positivo, obligatorio y único.
* `location`: Enumeración (`MALE`, `FEMALE`, `CHILDREN`).
* `status`: Enumeración (`AVAILABLE`, `OCCUPIED`, `MAINTENANCE`).
* `member_id`: Identificador del socio asignado, opcional.
* `contract_end_date`: Fecha de finalización del contrato en formato ISO 8601 Date (`YYYY-MM-DD`), opcional.

### 2.2. Contrato de API (@alentapp/shared)

* **Endpoint**: `PATCH /api/v1/lockers/:id`
* **Request Body**:

```ts
{
    status?: 'AVAILABLE' | 'MAINTENANCE';
    member_id?: string | null;
    contract_end_date?: string | null; // ISO 8601 Date (YYYY-MM-DD)
}
```

* **Response (Success)**: `200 OK`
* **Response Body**: `LockerResponseDTO`

```ts
type LockerResponseDTO = {
id: string;
number: number;
location: 'MALE' | 'FEMALE' | 'CHILDREN';
status: 'AVAILABLE' | 'OCCUPIED' | 'MAINTENANCE';
member_id: string | null;
contract_end_date: string | null; // ISO Date (YYYY-MM-DD)
};

type ErrorResponse = {
message: string;
};
```

### 2.3. Esquema de Persistencia

```prisma
enum LockerLocation {
MALE
FEMALE
CHILDREN
}

enum LockerStatus {
AVAILABLE
OCCUPIED
MAINTENANCE
}

model Locker {
id                String         @id @default(uuid())
number            Int            @unique
location          LockerLocation
status            LockerStatus   @default(AVAILABLE)
member_id         String?
member            Member?       @relation(fields: [member_id], references: [id])
contract_end_date DateTime?
}
```

---

## 3. Arquitectura y Flujo

### 3.1. Componentes de Arquitectura Hexagonal

* **Puerto (Domain)**: `LockerRepository` con métodos `findById(id)` y `update(id, data)`.
* **Adaptador de Entrada (Delivery)**: `LockerController`, recibe la request HTTP, extrae params y body, y delega al caso de uso.
* **Adaptador de Salida (Infrastructure)**: `PostgresLockerRepository`, implementa los métodos `findById` y `update`.

### 3.2. Lógica del Caso de Uso

**Caso de Uso**: `UpdateLockerUseCase`.

1. Recibir el `id` del locker a actualizar.
2. Buscar el locker por `id`.
3. Validar los datos de entrada.
4. Verificar que el locker exista.
5. Verificar que el estado recibido, si se envía, sea válido.
6. Verificar que el socio exista cuando se envíe `member_id`.
7. Impedir asignaciones sobre lockers en estado `MAINTENANCE`.
8. Impedir asignaciones sobre lockers ya ocupados por otro socio.
9. Actualizar automáticamente el estado a `OCCUPIED` cuando se asigne un socio.
10. Permitir cambiar un locker ocupado a estado `MAINTENANCE`.
11. Permitir liberar lockers ocupados eliminando `member_id` y `contract_end_date`.
12. Actualizar automáticamente el estado a `AVAILABLE` cuando un locker sea liberado, excepto si el locker se encuentra en estado MAINTENANCE, en cuyo caso conserva dicho estado.
13. Persistir los cambios a través de `LockerRepository`.
14. Retornar el locker actualizado.

---

## 4. Casos de Borde y Errores

| Escenario | Resultado Esperado | Código HTTP |
|---|---|---|
| Locker inexistente | "El locker no existe" | 404 Not Found |
| Locker en mantenimiento | "El locker está en mantenimiento" | 400 Bad Request |
| Locker ya ocupado | "El locker ya se encuentra asignado" | 409 Conflict |
| Socio inexistente | "El socio no existe" | 404 Not Found |
| Estado inválido | "El estado seleccionado no es válido" | 400 Bad Request |
| Campos con formato inválido | "Formato de datos inválido" | 400 Bad Request |
| Fecha de contrato sin socio asignado | "No se puede asignar fecha de contrato sin socio" | 400 Bad Request |
| Locker disponible sin liberar asignación | "No se puede marcar un locker como disponible mientras tenga un socio asignado" | 400 Bad Request |
| Error de conexión a DB | "Error interno, reintente más tarde" | 500 Internal Server Error |
| Actualización exitosa | Estado del locker actualizado correctamente | 200 OK |
| Asignación exitosa | Locker asignado correctamente al socio | 200 OK |

---

## 5. Plan de Implementación

1. Actualizar los tipos en `@alentapp/shared`.
2. Ampliar el puerto `LockerRepository` con los métodos `findById(id)` y `update(id, data)`.
3. Implementar el caso de uso `UpdateLockerUseCase`.
4. Implementar validaciones de disponibilidad y estado.
5. Implementar el endpoint `PATCH` en el controlador.
6. Realizar pruebas unitarias y de integración.

---

## 6. Observaciones Adicionales

* El endpoint utiliza `PATCH` debido a que la operación permite modificaciones parciales sobre el recurso Locker.
* Las operaciones de asignación deben manejar concurrencia para evitar doble asignación del mismo locker.
* Cuando un locker se asigna, su estado debe actualizarse automáticamente a `OCCUPIED`.
* Un locker en estado `MAINTENANCE` no puede recibir nuevas asignaciones.
* El sistema debe permitir pasar un locker de estado `OCCUPIED` a `MAINTENANCE`.
* Cuando un locker pase a estado `MAINTENANCE`, el sistema no debe reasignar automáticamente al socio afectado. La reasignación deberá realizarse manualmente por un administrador utilizando otro locker disponible.
* Cuando un locker se libera, `member_id` y `contract_end_date` deben establecerse automáticamente en `null`.
* Si un locker se libera mientras se encuentra en estado `MAINTENANCE`, no cambia a `AVAILABLE`. Para pasar un locker de estado `MAINTENANCE` a `AVAILABLE`, el cambio debe realizarse explícitamente mediante actualización del campo `status`.