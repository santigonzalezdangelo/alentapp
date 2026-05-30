import { test, expect } from '@playwright/test';

test.describe('Sports Full-Stack E2E', () => {
    test('debe crear un deporte real y rechazar otro con nombre duplicado', async ({ page }) => {
        await page.goto('/sports');

        // Navega a la pantalla de administración de deportes.
        await page.getByRole('button', { name: /Agregar Deporte/i }).click();
        await expect(page.getByText('Agregar Nuevo Deporte')).toBeVisible();

        const sportName = `Sport E2E Create ${Date.now()}`;

        // Completa el formulario con datos válidos para crear un deporte.
        await page.getByPlaceholder('Ej. Tenis').fill(sportName);
        await page.getByPlaceholder('Ej. Actividad deportiva').fill('Deporte creado desde e2e');
        await page.getByLabel(/Cupo Máximo/i).fill('25');
        await page.getByLabel(/Precio Adicional/i).fill('3500');

        // Envía el formulario de creación.
        await page.getByRole('button', { name: 'Crear Deporte' }).click();

        // Espera que el modal se cierre después de crear el deporte.
        await expect(page.getByRole('button', { name: 'Crear Deporte' })).toBeHidden();
        // Verifica que el deporte creado aparezca en la tabla.
        await expect(page.getByText(sportName)).toBeVisible({ timeout: 10000 });
        await expect(page.getByText('Deporte creado desde e2e')).toBeVisible();

        // Abre nuevamente el modal para intentar crear otro deporte.
        await page.getByRole('button', { name: /Agregar Deporte/i }).click();
        await expect(page.getByText('Agregar Nuevo Deporte')).toBeVisible();

        await page.getByPlaceholder('Ej. Tenis').fill(`   ${sportName.toLowerCase()}   `);
        await page.getByPlaceholder('Ej. Actividad deportiva').fill('Intento duplicado desde e2e');
        await page.getByLabel(/Cupo Máximo/i).fill('10');
        await page.getByLabel(/Precio Adicional/i).fill('1000');

        // Prepara la captura del alert antes de hacer click.
        const dialogMessagePromise = new Promise<string>((resolve) => {
            page.once('dialog', async (dialog) => {
                const message = dialog.message();
                await dialog.accept();
                resolve(message);
            });
        });

        await page.getByRole('button', { name: 'Crear Deporte' }).click();

        // Espera el mensaje del alert capturado.
        const dialogMessage = await dialogMessagePromise;
        expect(dialogMessage).toContain('Ya existe un deporte activo con ese nombre');
    });
});