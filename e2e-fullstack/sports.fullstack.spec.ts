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
    test('debe editar un deporte real y mostrar el cambio en la tabla', async ({ page, request }) => {
        //Con Date.now() cada ejecución genera un nombre distinto y el test siempre parte de un estado limpio.
        const sportName = `Sport E2E Update ${Date.now()}`;

        // Creamos un deporte real desde la API para que el test se enfoque en editar.
        const createResponse = await request.post('http://localhost:3001/api/v1/sports', {
            data: {
                name: sportName,
                description: 'Deporte previo a edición',
                max_capacity: 20,
                additional_price: 3000,
                requires_medical_certificate: true,
            },
        });

        expect(createResponse.ok()).toBeTruthy();

        await page.goto('/sports');

        // Verificamos que el deporte creado para este test esté visible.
        await expect(page.getByText(sportName)).toBeVisible({ timeout: 10000 });

        // Buscamos la fila del deporte creado y hacemos click en editar.
        const sportRow = page.getByRole('row').filter({ hasText: sportName });
        await sportRow.getByRole('button', { name: /Editar deporte/i }).click();

        // Verificamos que se abra el modal de edición.
        await expect(page.getByText('Editar Deporte')).toBeVisible();

        // Modificamos campos editables.
        await page.getByPlaceholder('Ej. Actividad deportiva').fill('Deporte editado desde e2e');
        await page.getByLabel(/Cupo Máximo/i).fill('35');
        await page.getByLabel(/Precio Adicional/i).fill('8000');

        // Guardamos cambios.
        await page.getByRole('button', { name: 'Guardar Cambios' }).click();

        // Verificamos que el modal se cierre.
        await expect(page.getByRole('button', { name: 'Guardar Cambios' })).toBeHidden();

        // Verificamos que los cambios aparezcan reflejados en la tabla.
        await expect(page.getByText('Deporte editado desde e2e')).toBeVisible({ timeout: 10000 });
        await expect(page.getByText(sportName)).toBeVisible();

    });
});