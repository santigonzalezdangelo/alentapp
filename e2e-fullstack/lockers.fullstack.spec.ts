import { test, expect } from '@playwright/test';

test.describe('Lockers Full-Stack E2E', () => {
    test('debe crear un locker real y mostrarlo en la tabla', async ({ page }) => {
        // Entramos a la vista real de lockers.
        await page.goto('/lockers');

        // Abrimos el modal de creación.
        await page.getByRole('button', {
            name: /Agregar Locker/i,
        }).click();

        // Verificamos que el modal se haya abierto.
        await expect(
            page.getByText('Agregar Nuevo Locker')
        ).toBeVisible();

        const lockerNumber = Number(
            `${Date.now()}`.slice(-5)
        );

        // Completamos el formulario.
        await page
            .getByPlaceholder('Ej. 10')
            .fill(lockerNumber.toString());

        // Guardamos el locker.
        await page.getByRole('button', {
            name: 'Crear Locker',
        }).click();

        // Esperamos que el modal desaparezca.
        await expect(
            page.getByRole('button', {
                name: 'Crear Locker',
            })
        ).toBeHidden();

        // Verificamos que el locker aparezca en la tabla.
        await expect(
            page.getByText(lockerNumber.toString())
        ).toBeVisible({ timeout: 10000 });

        // Verificamos que se muestre el estado inicial.
        await expect(
            page.getByText('Disponible')
        ).toBeVisible();
    });
});

