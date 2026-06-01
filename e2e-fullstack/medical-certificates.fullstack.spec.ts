import { test, expect } from '@playwright/test';
import { API_URL } from './global-setup.js';

test.describe('MedicalCertificates Full-Stack E2E', () => {
  let memberId: string;
  let dni: string;

  test.beforeAll(async ({ request }) => {
    dni = Math.floor(Math.random() * 90000000 + 10000000).toString();

    const memberResponse = await request.post(`${API_URL}/api/v1/socios`, {
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
    memberId = memberBody.data.id;
  });

  test.afterAll(async ({ request }) => {
    if (memberId) {
      const deleteResponse = await request.delete(
        `${API_URL}/api/v1/socios/${memberId}`,
      );
      expect(deleteResponse.ok()).toBeTruthy();
    }
  });

  test('debe mostrar el estado vacío cuando no hay certificados en la DB', async ({ page }) => {
    await page.goto('/medical-certificates');
    await expect(page.getByText('No se encontraron certificados médicos.'))
      .toBeVisible({ timeout: 10000 });
  });

  test('debe crear un certificado real y mostrarlo en la tabla', async ({ page }) => {
    await page.goto('/medical-certificates');

    await expect(page.getByText('No se encontraron certificados médicos.'))
      .toBeVisible({ timeout: 10000 });

    await page.getByRole('button', { name: /Agregar Certificado/i }).click();
    await expect(page.getByText('Agregar Nuevo Certificado Médico')).toBeVisible();

    await page.getByLabel('DNI del Socio').fill(dni);
    await page.getByLabel('Fecha de Emisión').fill('2026-07-01');
    await page.getByLabel('Fecha de Vencimiento').fill('2026-12-31');
    await page.getByLabel('Matrícula del Médico').fill('MP12345');
    await page.getByLabel('Institución').fill('Hospital Municipal');

    await page.getByRole('button', { name: /Crear Certificado/i }).click();

    await expect(page.getByText('MP12345')).toBeVisible({ timeout: 10000 });
    await expect(page.getByText(dni)).toBeVisible();
    await expect(page.getByText('2026-07-01')).toBeVisible();
    await expect(page.getByText('2026-12-31')).toBeVisible();
  });

  test('debe editar el certificado creado y ver el cambio en la tabla', async ({ page }) => {
    await page.goto('/medical-certificates');

    await expect(page.getByText('MP12345')).toBeVisible({ timeout: 10000 });

    await page.getByRole('button', { name: /Editar certificado/i }).first().click();
    await expect(page.getByText('Editar Certificado Médico')).toBeVisible();

    await page.getByLabel('Matrícula del Médico').fill('MP99999');

    await page.getByRole('button', { name: /Guardar Cambios/i }).click();
    await expect(page.getByRole('button', { name: /Guardar Cambios/i })).toBeHidden();

    await expect(page.getByText('MP99999')).toBeVisible({ timeout: 10000 });
    await expect(page.getByText('MP12345', { exact: true })).toBeHidden();
  });

  test('debe eliminar el certificado y mostrar el estado vacío', async ({ page }) => {
    await page.goto('/medical-certificates');

    await expect(page.getByText('MP99999')).toBeVisible({ timeout: 10000 });

    page.on('dialog', (dialog) => dialog.accept());

    await page.getByRole('button', { name: /Eliminar certificado/i }).first().click();

    await expect(page.getByText('No se encontraron certificados médicos.'))
      .toBeVisible({ timeout: 10000 });
  });
});
