import { test, expect } from '@playwright/test';
import { uniqueDni, uniqueEmail, uniqueName } from './test-data.js';

const API_URL = 'http://localhost:3001/api/v1';

const TEST_MEMBER = {
    name: uniqueName('Socio E2E Payment'),
    dni: uniqueDni(),
    email: uniqueEmail(),
    birthdate: '1990-01-01',
    category: 'Pleno',
};

let memberId: string;

test.describe('Payments Full-Stack E2E', () => {
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


    test('debe cobrar el pago y mostrar estado Pagado', async ({ page }) => {
        await page.goto('/payments');


        await expect(page.getByText('Pendiente')).toBeVisible({ timeout: 10000 });

        await page.getByRole('button', { name: 'Cobrar' }).first().click();

        await expect(page.getByText('Cobro exitoso')).toBeVisible({ timeout: 10000 });

        await expect(page.getByText('Pagado')).toBeVisible({ timeout: 10000 });

        await expect(page.getByRole('button', { name: 'Cobrar' })).toBeHidden();
        await expect(page.getByRole('button', { name: 'Anular' })).toBeHidden();
    });

    test('debe editar el monto de un pago Pendiente', async ({ page, request }) => {

        const res = await request.post(`${API_URL}/payments`, {
            data: {
                member_id: memberId,
                amount: 500,
                due_date: '2099-11-30',
            },
        });
        expect(res.ok()).toBeTruthy();

        await page.goto('/payments');

        await expect(page.getByText('Pendiente')).toBeVisible({ timeout: 10000 });

        await page.getByRole('button', { name: 'Editar' }).first().click();
        await expect(page.getByText('Editar Pago')).toBeVisible();

 
        await page.getByLabel('Monto').fill('9999');


        await page
            .locator('[role="dialog"]')
            .getByRole('button', { name: 'Guardar Cambios' })
            .click();

        await expect(page.getByText('Pago actualizado con exito')).toBeVisible({ timeout: 10000 });
    });

    test('debe mostrar error al editar con monto 0', async ({ page, request }) => {

        const res = await request.post(`${API_URL}/payments`, {
            data: {
                member_id: memberId,
                amount: 500,
                due_date: '2099-10-31',
            },
        });
        expect(res.ok()).toBeTruthy();

        await page.goto('/payments');

        await expect(page.getByText('Pendiente').first()).toBeVisible({ timeout: 10000 });

        await page.getByRole('button', { name: 'Editar' }).first().click();
        await expect(page.getByText('Editar Pago')).toBeVisible();


        await page.getByLabel('Monto').fill('0');

        await page
            .locator('[role="dialog"]')
            .getByRole('button', { name: 'Guardar Cambios' })
            .click();

   
        await expect(page.getByText('El monto debe ser mayor a 0')).toBeVisible();
    });

        test.afterAll(async ({ request }) => {
        if (memberId){
            //eliminamos el miembro creado para no dejar datos basura
            const deleteResponse = await request.delete(`http://localhost:3001/api/v1/socios/${memberId}`);
            expect(deleteResponse.ok()).toBeTruthy();
        }
    });
});