import { test, expect } from '@playwright/test';
import { API_URL } from './global-setup.js';

let lockerNumber: number;
let lockerId: string;

test.describe('Lockers Full-Stack E2E', () => {
    test('debe crear un locker real, mostrarlo en la tabla y rechazar número duplicado', async ({ page }) => {
        await page.goto('/lockers');

        await page.getByRole('button', {
            name: /Agregar Locker/i,
        }).click();

        await expect(
            page.getByText('Agregar Nuevo Locker')
        ).toBeVisible();

        lockerNumber = Number(
            `${Date.now()}`.slice(-5)
        );

        await page
            .getByPlaceholder('Ej. 10')
            .fill(lockerNumber.toString());

        await page.getByRole('button', {
            name: 'Crear Locker',
        }).click();

        await expect(
            page.getByText('Agregar Nuevo Locker')
        ).toBeHidden({ timeout: 10000 });

        await expect(
            page.getByText(lockerNumber.toString())
        ).toBeVisible({ timeout: 10000 });

        await expect(
            page.getByText('Disponible').first()
        ).toBeVisible();

        // Intentamos crear un locker con el mismo número
        await page.getByRole('button', {
            name: /Agregar Locker/i,
        }).click();

        await expect(
            page.getByText('Agregar Nuevo Locker')
        ).toBeVisible();

        await page
            .getByPlaceholder('Ej. 10')
            .fill(lockerNumber.toString());

        const dialogMessagePromise = new Promise<string>((resolve) => {
            page.once('dialog', async (dialog) => {
                const message = dialog.message();
                await dialog.accept();
                resolve(message);
            });
        });

        await page.getByRole('button', {
            name: 'Crear Locker',
        }).click();

        const dialogMessage = await dialogMessagePromise;
        expect(dialogMessage).toContain('Ya existe un locker con ese número');
    });

test('debe editar el locker creado y cambiar su estado a mantenimiento', async ({ page, request }) => {
    await page.goto('/lockers');

    await expect(
        page.getByText(lockerNumber.toString())
    ).toBeVisible({ timeout: 10000 });

    // Guardamos el id para limpieza
    const lockersResponse = await request.get(`${API_URL}/api/v1/lockers`);
    const lockersBody = await lockersResponse.json();
    const createdLocker = lockersBody.data.find((l: any) => l.number === lockerNumber);
    if (createdLocker) lockerId = createdLocker.id;

    const row = page.getByRole('row').filter({ hasText: lockerNumber.toString() });
    await row.getByLabel('Editar locker').click();

    await expect(page.getByText('Editar Locker')).toBeVisible();

    // Abrimos el dropdown de estado
    await page.getByRole('combobox').nth(1).click();
    // Seleccionamos mantenimiento
    await page.getByRole('option', { name: 'Mantenimiento' }).click();

    await page.getByRole('button', { name: 'Guardar Cambios' }).click();

    await expect(
        page.getByText('Editar Locker')
    ).toBeHidden({ timeout: 10000 });

    await expect(
        page.getByText('Mantenimiento')
    ).toBeVisible({ timeout: 10000 });
});

test('debe eliminar el locker y verificar que desaparece de la tabla', async ({ page }) => {
    await page.goto('/lockers');

    await expect(
        page.getByText(lockerNumber.toString())
    ).toBeVisible({ timeout: 10000 });

    page.on('dialog', (dialog) => dialog.accept());

    const row = page.getByRole('row').filter({ hasText: lockerNumber.toString() });
    await row.getByLabel('Eliminar locker').click();

    await expect(
        page.getByText(lockerNumber.toString())
    ).toBeHidden({ timeout: 10000 });
});

test.afterAll(async ({ request }) => {
    if (lockerId) {
        await request.delete( `${API_URL}/api/v1/lockers/${lockerId}`);
    }
});
});
