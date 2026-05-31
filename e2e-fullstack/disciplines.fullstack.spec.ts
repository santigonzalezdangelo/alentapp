import { test, expect } from '@playwright/test';

test.describe('Disciplines Full-Stack E2E', () => {
    //para poder eliminar el miembro creado al final del test
    let memberId: string;

    test('debe mostrar el estado vacío cuando no hay sanciones en la DB', async ({ page }) => {
        await page.goto('/disciplines');
        await expect(page.getByText('No se encontraron sanciones.')).toBeVisible({ timeout: 10000 });
    });

    test('debe crear una sancion real y mostrarla en la tabla', async ({ page, request }) => {
        const dni = '46268119';
        
        const memberResponse = await request.post('http://localhost:3001/api/v1/socios', {
            data: {
                name: 'Socio E2E Discipline',
                dni,
                email: `discipline-${dni}@test.com`,
                birthdate: '1995-06-15',
                category: 'Pleno',
            },
        });

        if (!memberResponse.ok()) {
            console.log('STATUS:', memberResponse.status());
            console.log('BODY:', await memberResponse.text());
        }

        expect(memberResponse.ok()).toBeTruthy();

        const memberBody = await memberResponse.json();
        memberId = memberBody.data.id;

        await page.goto('/disciplines');

        await expect(page.getByText('No se encontraron sanciones.')).toBeVisible( {timeout: 10000} );
        
        await page.getByRole('button', { name: /Agregar Sanción/i }).click();
        
        await expect(page.getByText('Agregar Nueva Sanción')).toBeVisible();

        await page.getByLabel('DNI del Socio').fill(dni);
        await page.getByLabel('Motivo').fill('Conducta inapropiada');
        await page.getByLabel('Fecha de inicio').fill('2026-05-01');
        await page.getByLabel('Fecha de fin').fill('2026-05-15');
        
        await page.getByRole('button', { name: /Crear Sanción/i }).click();

        await expect(page.getByText('Conducta inapropiada')).toBeVisible({ timeout: 10000 });
        await expect(page.getByText(dni)).toBeVisible();
        await expect(page.getByText('01/05/2026')).toBeVisible();
        await expect(page.getByText('15/05/2026')).toBeVisible();
    });

    test('debe editar la sanción creada y ver el cambio en la tabla', async ({ page, request }) => {
        await page.goto('/disciplines');

        await expect(page.getByText('Conducta inapropiada')).toBeVisible( {timeout: 10000} );

        await page.getByRole('button', { name: /Editar sanción/i }).first().click();
        await expect(page.getByText('Editar Sanción')).toBeVisible();

        await page.getByLabel('Motivo').fill('Daño a la propiedad del club');

        await page.getByRole('button', { name: /Guardar Cambios/i }).click();
        await expect(page.getByRole('button', { name: /Guardar Cambios/i })).toBeHidden();

        await expect(page.getByText('Daño a la propiedad del club')).toBeVisible({ timeout: 10000 });

        await expect(page.getByText('Conducta inapropiada', { exact: true })).toBeHidden();
    });

    test.afterAll(async ({ request }) => {
        if (memberId){
            //eliminamos el miembro creado para no dejar datos basura
            const deleteResponse = await request.delete(`http://localhost:3001/api/v1/socios/${memberId}`);
            expect(deleteResponse.ok()).toBeTruthy();
        }
    });
});