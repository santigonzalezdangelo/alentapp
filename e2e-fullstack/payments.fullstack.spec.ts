import { test, expect } from '@playwright/test';
import { uniqueDni, uniqueEmail, uniqueName } from './test-data.js';
import { API_URL } from './global-setup.js';

/**
 * Tests E2E Full-Stack para el módulo de Pagos.
 * Verifica la integración real entre UI → API → DB.
 *
 * El global-setup limpia la DB antes de la suite.
 * El socio se crea desde la UI en beforeEach — cada test tiene su propio socio.
 * DNI y email únicos por corrida para evitar colisiones con el constraint UNIQUE.
 */

const API_BASE = `${API_URL}/api/v1`;

test.describe('Payments Full-Stack E2E', () => {
    let testMember: { name: string; dni: string; email: string };
    let memberId: string;

    test.beforeEach(async ({ page, request }) => {
        testMember = {
            name: uniqueName('Socio Para Pagos'),
            dni: uniqueDni(),
            email: uniqueEmail(),
        };

        await page.goto('/members');

        await page.locator('button:has-text("Agregar Miembro")').click();
        await expect(page.getByText('Agregar Nuevo Miembro')).toBeVisible();

        await page.getByPlaceholder('Ej. Juan Pérez').fill(testMember.name);
        await page.getByPlaceholder('Ej. 12345678').fill(testMember.dni);
        await page.getByPlaceholder('ejemplo@correo.com').fill(testMember.email);
        await page.getByLabel(/Fecha de Nacimiento/i).fill('1990-01-01');

        await page.getByRole('button', { name: 'Crear Miembro' }).click();
        await expect(page.getByText(testMember.name)).toBeVisible({ timeout: 10000 });

        const res = await request.get(`${API_BASE}/socios`);
        const body = await res.json();
        const member = body.data.find((m: any) => m.dni === testMember.dni);
        memberId = member.id;
    });

    test.afterEach(async ({ request }) => {
        if (memberId) {
            await request.delete(`${API_BASE}/socios/${memberId}`);
        }
    });

    test('1. debe crear un pago real y mostrarlo en la lista como Pendiente', async ({ page }) => {
        await page.goto('/payments');

        await page.getByRole('button', { name: /Crear Pago/i }).first().click();
        await expect(page.getByText('Crear Nuevo Pago')).toBeVisible();

        await page.getByText('Seleccione un socio').click();
        await page.getByRole('option', { name: `${testMember.name} (${testMember.dni})` }).click();

        await page.getByLabel('Monto').fill('2500');

        await page.getByLabel('Fecha de Vencimiento').fill('2099-05-31');

        await expect(page.getByText('Período: 05/2099')).toBeVisible();

        await page.locator('[role="dialog"]').getByRole('button', { name: 'Crear Pago' }).click();

        await expect(page.getByText('Pago creado con exito')).toBeVisible({ timeout: 10000 });

        await expect(
            page.getByText(`Socio: ${testMember.name} (${testMember.dni})`),
        ).toBeVisible({ timeout: 10000 });
        await expect(page.getByText('Pendiente')).toBeVisible();
        await expect(page.getByText('Cuota 5/2099')).toBeVisible();
    });

    test('2. debe registrar el cobro de un pago y actualizar el estado a Pagado', async ({ page, request }) => {

        await page.goto('/payments');

        await expect(page.getByText('Pendiente')).toBeVisible({ timeout: 10000 });

        await page.getByRole('button', { name: 'Cobrar' }).first().click();

        await expect(page.getByText('Cobro exitoso')).toBeVisible({ timeout: 10000 });

        await expect(page.getByText('Pagado')).toBeVisible({ timeout: 10000 });

        await expect(page.getByRole('button', { name: 'Cobrar' })).toBeHidden();
        await expect(page.getByRole('button', { name: 'Anular' })).toBeHidden();
    });

    test('3. debe anular un pago Pendiente y deshabilitar acciones de cobro', async ({ page, request }) => {
        const res = await request.post(`${API_BASE}/payments`, {
            data: {
                member_id: memberId,
                amount: 5000,
                due_date: '2099-12-31',
            },
        });
        expect(res.ok()).toBeTruthy();

        await page.goto('/payments');

        await expect(page.getByText('Pendiente')).toBeVisible({ timeout: 10000 });

        await page.getByRole('button', { name: 'Anular' }).first().click();

        await expect(page.getByText('Anulación exitosa')).toBeVisible({ timeout: 10000 });

        await expect(page.getByText('Cancelado')).toBeVisible({ timeout: 10000 });

        await expect(page.getByRole('button', { name: 'Anular' })).toBeHidden();
        await expect(page.getByRole('button', { name: 'Cobrar' })).toBeHidden();
    });
});