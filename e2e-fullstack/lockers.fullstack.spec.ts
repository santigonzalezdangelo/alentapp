import { test, expect } from '@playwright/test';

test.describe('Lockers Full-Stack E2E', () => {
    test('debe crear un locker real, mostrarlo en la tabla y rechazar número duplicado', async ({ page, request }) => {
        await page.goto('/lockers');

        await page.getByRole('button', {
            name: /Agregar Locker/i,
        }).click();

        await expect(
            page.getByText('Agregar Nuevo Locker')
        ).toBeVisible();

        const lockerNumber = Number(
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
});

