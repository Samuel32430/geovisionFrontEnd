# GeovisionFrontEnd

This project was generated using [Angular CLI](https://github.com/angular/angular-cli) version 22.2.1.

## Development server

To start a local development server, run:

```bash
ng serve
```

Once the server is running, open your browser and navigate to `http://localhost:4200/`. The application will automatically reload whenever you modify any of the source files.

## Code scaffolding

Angular CLI includes powerful code scaffolding tools. To generate a new component, run:

```bash
ng generate component component-name
```

For a complete list of available schematics (such as `components`, `directives`, or `pipes`), run:

```bash
ng generate --help
```

## Building

To build the project run:

```bash
ng build
```

This will compile your project and store the build artifacts in the `dist/` directory. By default, the production build optimizes your application for performance and speed.

## Running unit tests

To execute unit tests with the [Vitest](https://vitest.dev/) test runner, use the following command:

```bash
ng test
```

## Running end-to-end tests

For end-to-end (e2e) testing, run:

```bash
ng e2e
```

Angular CLI does not come with an end-to-end testing framework by default. You can choose one that suits your needs.

## Additional Resources

For more information on using the Angular CLI, including detailed command references, visit the [Angular CLI Overview and Command Reference](https://angular.dev/tools/cli) page.
# Pruebas de navegador con Playwright

Con las dependencias instaladas, ejecuta:

```sh
npx playwright install --no-shell chromium
npm run test:e2e
```

Playwright inicia Angular en `http://127.0.0.1:14200` y genera el informe en `playwright-report/`. La suite verifica la redirección al login, la validación del formulario, la respuesta a un 401 y el inicio y cierre de sesión. Los casos que necesitan una respuesta de la API usan datos de prueba.

Para habilitar el caso contra el backend, configura `E2E_USERNAME` y `E2E_PASSWORD` con una cuenta de pruebas. Con el servidor local, `proxy.lan.json` dirige la API a `127.0.0.1:8080`. También puedes asignar `E2E_BASE_URL` a una instalación de pruebas donde el frontend y la API ya estén disponibles.
