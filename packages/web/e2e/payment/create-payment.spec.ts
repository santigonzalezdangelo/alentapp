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

        // Abrir modal
        await page.getByRole('button', { name: /crear pago/i }).first().click();
        await expect(page.getByText('Crear Nuevo Pago')).toBeVisible();

        // Seleccionar socio
        await page.getByText('Seleccione un socio').click();
        await page.getByText(`${member.name} (${member.dni})`).click();

        // Llenar monto
        await page.getByLabel('Monto').fill('1500');

        // Llenar fecha y verificar período derivado
        await page.getByLabel('Fecha de Vencimiento').fill(dueDate);
        await expect(page.getByText(`Período: ${month}/${year}`)).toBeVisible();

        // Submit
        await page.locator('[role="dialog"]').getByRole('button', { name: 'Crear Pago' }).click();

        // Verificar éxito
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
        await page.getByText(`${member.name} (${member.dni})`).click();

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
});