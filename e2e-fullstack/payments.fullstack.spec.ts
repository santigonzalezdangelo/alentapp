import { test, expect } from '@playwright/test';

const API_URL = 'http://localhost:3001/api/v1';

const TEST_MEMBER = {
    name: 'Socio E2E Payment',
    dni: '77788899',
    email: 'payment-e2e@test.com',
    birthdate: '1990-01-01',
    category: 'Pleno',
};

let memberId: string;

test.describe('Payments Full-Stack E2E )', () => {
    test.beforeAll(async ({ request }) => {
        const res = await request.post(`${API_URL}/socios`, { data: TEST_MEMBER });
        expect(res.ok()).toBeTruthy();
        const body = await res.json();
        memberId = body.data.id;
    });

    test('debe mostrar el estado vacío cuando no hay pagos en la DB', async ({ page }) => {
        await page.goto('/payments');
        await expect(
            page.getByText('No hay pagos registrados.'),
        ).toBeVisible({ timeout: 10000 });
    });

    test('debe crear un pago real y mostrarlo en la lista como Pendiente', async ({ page }) => {
        await page.goto('/payments');

        await page.getByRole('button', { name: /Crear Pago/i }).first().click();
        await expect(page.getByText('Crear Nuevo Pago')).toBeVisible();

    
        await page.getByText('Seleccione un socio').click();
        await page.getByRole('option', { name: `${TEST_MEMBER.name} (${TEST_MEMBER.dni})` }).click();

        await page.getByLabel('Monto').fill('1500');

        await page.getByLabel('Fecha de Vencimiento').fill('2099-12-31');

        await expect(page.getByText('Período: 12/2099')).toBeVisible();

        await page
            .locator('[role="dialog"]')
            .getByRole('button', { name: 'Crear Pago' })
            .click();

        await expect(page.getByText('Pago creado con exito')).toBeVisible({ timeout: 10000 });

     
        await expect(
            page.getByText(`Socio: ${TEST_MEMBER.name} (${TEST_MEMBER.dni})`),
        ).toBeVisible({ timeout: 10000 });

        await expect(page.getByText('Pendiente')).toBeVisible();


        await expect(page.getByText('Cuota 12/2099')).toBeVisible();
    });

    test('debe mostrar error si no se selecciona un socio', async ({ page }) => {
        await page.goto('/payments');

        await page.getByRole('button', { name: /Crear Pago/i }).first().click();
        await expect(page.getByText('Crear Nuevo Pago')).toBeVisible();

  
        await page.getByLabel('Monto').fill('1500');
        await page.getByLabel('Fecha de Vencimiento').fill('2099-12-31');

        await page
            .locator('[role="dialog"]')
            .getByRole('button', { name: 'Crear Pago' })
            .click();

        await expect(page.getByText('Debe seleccionar un socio')).toBeVisible();
    });

    test('debe mostrar error si el monto es 0', async ({ page }) => {
        await page.goto('/payments');

        await page.getByRole('button', { name: /Crear Pago/i }).first().click();
        await expect(page.getByText('Crear Nuevo Pago')).toBeVisible();

        // Seleccionar socio — usar role option para evitar ambigüedad con la lista
        await page.getByText('Seleccione un socio').click();
        await page.getByRole('option', { name: `${TEST_MEMBER.name} (${TEST_MEMBER.dni})` }).click();

        await page.getByLabel('Monto').fill('0');
        await page.getByLabel('Fecha de Vencimiento').fill('2099-12-31');

        await page
            .locator('[role="dialog"]')
            .getByRole('button', { name: 'Crear Pago' })
            .click();

        await expect(page.getByText('El monto debe ser mayor a 0')).toBeVisible();
    });
});