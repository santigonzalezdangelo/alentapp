import { test, expect } from '@playwright/test';
import { createMember } from '../helpers/api.js';
import { uniqueDni, uniqueEmail, uniqueName, futureDate } from '../helpers/test-data.js';

test.describe('Crear pago (TDD-0010)', () => {
    test('crea un pago desde el formulario y aparece en la lista', async ({ page }) => {
        const member = await createMember({
            name: uniqueName('E2E'),
            dni: uniqueDni(),
            email: uniqueEmail(),
        });

        const dueDate = futureDate(60);
        const period = new Date(dueDate);
        const month = String(period.getUTCMonth() + 1).padStart(2, '0');
        const year = period.getUTCFullYear();

        await page.goto('/payments');
        await expect(page.getByRole('heading', { name: /gestion de pagos/i })).toBeVisible();

        await page.getByRole('button', { name: /crear pago/i }).first().click();
        await expect(page.getByText('Crear Nuevo Pago')).toBeVisible();

        await page.getByText('Seleccione un socio').click();
        await page.getByRole('option', { name: `${member.name} (${member.dni})` }).click();

        await page.getByLabel('Monto').fill('1500');
        await page.getByLabel('Fecha de Vencimiento').fill(dueDate);
        await expect(page.getByText(`Período: ${month}/${year}`)).toBeVisible();

        await page.locator('[role="dialog"]').getByRole('button', { name: 'Crear Pago' }).click();

        await expect(page.getByText('Pago creado con exito')).toBeVisible();
        await expect(page.getByText(`Socio: ${member.name} (${member.dni})`)).toBeVisible();
    });

    test('muestra error si el monto es 0', async ({ page }) => {
        const member = await createMember({
            name: uniqueName('E2E'),
            dni: uniqueDni(),
            email: uniqueEmail(),
        });

        await page.goto('/payments');
        await page.getByRole('button', { name: /crear pago/i }).first().click();
        await expect(page.getByText('Crear Nuevo Pago')).toBeVisible();

        await page.getByText('Seleccione un socio').click();
        await page.getByRole('option', { name: `${member.name} (${member.dni})` }).click();

        await page.getByLabel('Monto').fill('0');
        await page.getByLabel('Fecha de Vencimiento').fill(futureDate(60));

        await page.locator('[role="dialog"]').getByRole('button', { name: 'Crear Pago' }).click();

        await expect(page.getByText('El monto debe ser mayor a 0')).toBeVisible();
    });

    test('muestra error si no se selecciona un socio', async ({ page }) => {
        await page.goto('/payments');
        await page.getByRole('button', { name: /crear pago/i }).first().click();
        await expect(page.getByText('Crear Nuevo Pago')).toBeVisible();

        await page.getByLabel('Monto').fill('1500');
        await page.getByLabel('Fecha de Vencimiento').fill(futureDate(60));

        await page.locator('[role="dialog"]').getByRole('button', { name: 'Crear Pago' }).click();

        await expect(page.getByText('Debe seleccionar un socio')).toBeVisible();
    });


    test('cobra un pago y muestra estado Pagado', async ({ page }) => {
        const member = await createMember({
            name: uniqueName('E2E'),
            dni: uniqueDni(),
            email: uniqueEmail(),
        });

        await page.goto('/payments');


        await page.getByRole('button', { name: /crear pago/i }).first().click();
        await expect(page.getByText('Crear Nuevo Pago')).toBeVisible();

        await page.getByText('Seleccione un socio').click();
        await page.getByRole('option', { name: `${member.name} (${member.dni})` }).click();

        await page.getByLabel('Monto').fill('1500');
        await page.getByLabel('Fecha de Vencimiento').fill(futureDate(60));

        await page.locator('[role="dialog"]').getByRole('button', { name: 'Crear Pago' }).click();
        await expect(page.getByText('Pago creado con exito')).toBeVisible();

        await page.getByRole('button', { name: 'Cobrar' }).first().click();

        await expect(page.getByText('Cobro exitoso')).toBeVisible();
        await expect(page.getByText('Pagado').first()).toBeVisible();

    });

    test('edita el monto de un pago Pendiente', async ({ page }) => {
        const member = await createMember({
            name: uniqueName('E2E'),
            dni: uniqueDni(),
            email: uniqueEmail(),
        });

        await page.goto('/payments');

        // Crear pago desde la UI
        await page.getByRole('button', { name: /crear pago/i }).first().click();
        await expect(page.getByText('Crear Nuevo Pago')).toBeVisible();

        await page.getByText('Seleccione un socio').click();
        await page.getByRole('option', { name: `${member.name} (${member.dni})` }).click();

        await page.getByLabel('Monto').fill('500');
        await page.getByLabel('Fecha de Vencimiento').fill(futureDate(60));

        await page.locator('[role="dialog"]').getByRole('button', { name: 'Crear Pago' }).click();
        await expect(page.getByText('Pago creado con exito')).toBeVisible();

        // Editar el pago
        await page.getByRole('button', { name: 'Editar' }).first().click();
        await expect(page.getByText('Editar Pago')).toBeVisible();

        // Cambiar monto
        await page.getByLabel('Monto').fill('9999');

        await page.locator('[role="dialog"]').getByRole('button', { name: 'Guardar Cambios' }).click();

        await expect(page.getByText('Pago actualizado con exito')).toBeVisible();
    });

    test('muestra error al editar con monto 0', async ({ page }) => {
        const member = await createMember({
            name: uniqueName('E2E'),
            dni: uniqueDni(),
            email: uniqueEmail(),
        });

        await page.goto('/payments');

        // Crear pago desde la UI
        await page.getByRole('button', { name: /crear pago/i }).first().click();
        await expect(page.getByText('Crear Nuevo Pago')).toBeVisible();

        await page.getByText('Seleccione un socio').click();
        await page.getByRole('option', { name: `${member.name} (${member.dni})` }).click();

        await page.getByLabel('Monto').fill('500');
        await page.getByLabel('Fecha de Vencimiento').fill(futureDate(60));

        await page.locator('[role="dialog"]').getByRole('button', { name: 'Crear Pago' }).click();
        await expect(page.getByText('Pago creado con exito')).toBeVisible();

        // Intentar editar con monto inválido
        await page.getByRole('button', { name: 'Editar' }).first().click();
        await expect(page.getByText('Editar Pago')).toBeVisible();

        await page.getByLabel('Monto').fill('0');

        await page.locator('[role="dialog"]').getByRole('button', { name: 'Guardar Cambios' }).click();

        await expect(page.getByText('El monto debe ser mayor a 0')).toBeVisible();
    });
});