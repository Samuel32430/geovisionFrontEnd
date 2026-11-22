import { expect, test, type Page } from '@playwright/test';
import { loginPrueba } from '../src/app/core/auth/testing/auth-test-data';

async function ingresar(page: Page, usuario: string, password: string) {
  await page.getByLabel('Usuario o correo electrónico').fill(usuario);
  await page.getByLabel('Contraseña', { exact: true }).fill(password);
  await page.getByRole('button', { name: 'Iniciar sesión' }).click();
}

test('redirige al login al abrir una ruta protegida sin sesión', async ({ page }) => {
  await page.goto('/inicio');
  await expect(page).toHaveURL(/\/login\?returnUrl=%2Finicio$/);
  await expect(page.getByRole('heading', { name: 'Bienvenido de nuevo' })).toBeVisible();
});

test('valida los campos obligatorios del formulario', async ({ page }) => {
  await page.goto('/login');
  await page.getByRole('button', { name: 'Iniciar sesión' }).click();
  await expect(page.getByLabel('Usuario o correo electrónico')).toHaveAttribute(
    'aria-invalid',
    'true',
  );
  await expect(page.getByLabel('Contraseña', { exact: true })).toHaveAttribute(
    'aria-invalid',
    'true',
  );
});

test('informa que las credenciales son incorrectas al recibir un 401', async ({ page }) => {
  await page.route('**/api/v1/auth/login', (route) => route.fulfill({ status: 401 }));
  await page.goto('/login');
  await ingresar(page, 'prueba.p01', 'no-valida');
  await expect(page.getByRole('alert')).toContainText(
    'El usuario o la contraseña no son correctos.',
  );
  await expect(page).toHaveURL(/\/login$/);
});

test('regresa a la ruta solicitada y cierra la sesión', async ({ page }) => {
  await page.route('**/api/v1/**', async (route) => {
    const url = new URL(route.request().url());
    if (url.pathname.endsWith('/auth/login')) {
      await route.fulfill({ json: { ...loginPrueba(), permisos: [] } });
      return;
    }
    await route.fulfill({ status: url.pathname.endsWith('/auth/logout') ? 204 : 404 });
  });
  await page.goto('/inicio');
  await ingresar(page, 'prueba.p01', 'solo-pruebas');
  await expect(page).toHaveURL(/\/inicio$/);
  await page.getByRole('button', { name: 'Cerrar sesión', exact: true }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Cerrar sesión' }).click();
  await expect(page).toHaveURL(/\/login$/);
  await page.goto('/inicio');
  await expect(page).toHaveURL(/\/login\?returnUrl=%2Finicio$/);
});

test.describe('API real', () => {
  const usuario = process.env['E2E_USERNAME'] ?? '';
  const password = process.env['E2E_PASSWORD'] ?? '';
  test.skip(
    !usuario || !password,
    'Configura E2E_USERNAME y E2E_PASSWORD para el entorno de pruebas.',
  );

  test('inicia sesión y vuelve a la ruta solicitada', async ({ page }) => {
    await page.goto('/inicio');
    await expect(page).toHaveURL(/\/login\?returnUrl=%2Finicio$/);
    const respuesta = page.waitForResponse(
      (response) =>
        response.url().endsWith('/api/v1/auth/login') && response.request().method() === 'POST',
    );
    await ingresar(page, usuario, password);
    expect((await respuesta).status()).toBe(200);
    await expect(page).toHaveURL(/\/inicio$/);
  });
});
