import { test, expect } from '@playwright/test';

test.describe('MedicalCertificates Full-Stack E2E', () => {

    test('debe mostrar el estado vacío cuando no hay certificados en la DB', async ({ page }) => {
        await page.goto('/medical-certificates');
        await expect(page.getByText('No se encontraron certificados médicos.'))
            .toBeVisible({ timeout: 10000 });
    });

    test('debe crear un certificado real y mostrarlo en la tabla', async ({ page, request }) => {
        const dni = '13333331';

        const memberResponse = await request.post('http://localhost:3001/api/v1/socios', {
            data: {
                name: 'Socio E2E MC Fullstack',
                dni,
                email: `mc-fullstack-${dni}@test.com`,
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
        const memberId = memberBody.data.id;

        await page.goto('/medical-certificates');

        await expect(page.getByText('No se encontraron certificados médicos.'))
            .toBeVisible({ timeout: 10000 });

        await page.getByRole('button', { name: /Agregar Certificado/i }).click();

        await expect(page.getByText('Agregar Nuevo Certificado Médico')).toBeVisible();

        await page.getByLabel('DNI del Socio').fill(dni);
        await page.getByLabel('Fecha de Emisión').fill('2026-05-01');
        await page.getByLabel('Fecha de Vencimiento').fill('2026-05-15');
        await page.getByLabel('Matrícula del Médico').fill('MP12345');
        await page.getByLabel('Institución').fill('Hospital Municipal');

        await page.getByRole('button', { name: /Crear Certificado/i }).click();

        await expect(page.getByText('MP12345')).toBeVisible({ timeout: 10000 });
        await expect(page.getByText(dni)).toBeVisible();
        await expect(page.getByText('2026-05-01')).toBeVisible();
        await expect(page.getByText('2026-05-15')).toBeVisible();

        const deleteResponse = await request.delete(
            `http://localhost:3001/api/v1/socios/${memberId}`,
        );
        expect(deleteResponse.ok()).toBeTruthy();
    });
});
