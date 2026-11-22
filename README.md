# GeoVision — Frontend SPA

![Angular](https://img.shields.io/badge/Angular-22.2-DD0031?logo=angular&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-6.0-3178C6?logo=typescript&logoColor=white)
![Vitest](https://img.shields.io/badge/Vitest-5.x-6E9F18?logo=vitest&logoColor=white)
![Nginx](https://img.shields.io/badge/Nginx-1.27-009639?logo=nginx&logoColor=white)

Aplicación de una sola página para el personal del centro óptico: atención clínica oftalmológica, punto de venta y cobranza con anticipos, pasarela QR de Mercado Pago, gestión de órdenes de trabajo para taller, catálogo de productos e inventario. Consume la API de [geovision-backend](https://github.com/Samuel32430/geovisionBackEnd).

| Campo | Detalle |
| :--- | :--- |
| **Equipo** | [Apellido Paterno Materno, Nombres (Código)] · [Compañero 2, Nombres (Código)] |
| **Curso** | Lenguaje de Programación II · UPeU · 2026-2 |
| **Versión** | `v1.1-final` |

## Capturas

| Inicio de sesión | Registro de venta |
| :---: | :---: |
| 🖼 **Login**<br>`docs/capturas/login.png` | 🖼 **Venta con QR**<br>`docs/capturas/nueva-venta.png` |
| **Órdenes de Trabajo (Taller)** | **Menú y Dashboard Principal** |
| 🖼 **Órdenes de Trabajo**<br>`docs/capturas/ordenes-trabajo.png` | 🖼 **Dashboard**<br>`docs/capturas/dashboard.png` |

---

## Tecnologías

| Componente | Versión |
| :--- | :--- |
| **Angular** | 22.2 (componentes standalone, signals reactivos, control flow `@if`/`@for`) |
| **TypeScript** | 6.0 |
| **Node.js** | 22 LTS |
| **Vitest** | Pruebas unitarias ultrarrápidas y reporte de cobertura |
| **Nginx** | 1.27 (servidor web en contenedor de producción Alpine) |

---

## Estructura

```
src/app/
├── core/       auth (sesión, guards, interceptores), models, services globales
├── shared/     componentes reutilizables (modales, avisos, paginador, pipes)
├── layout/     main-layout con sidebar reactivo según permisos
└── features/   atención clínica, ventas, órdenes de taller, inventario,
                seguridad y administración (cada uno con carga diferida - Lazy Loading)
```

---

## Ejecución en desarrollo

```bash
npm install
npm start       # http://localhost:4200
```

Requiere el backend ejecutándose en `http://localhost:8080`. La URL base de la API se configura en `src/environments/environment.development.ts`.

---

## Seguridad en la SPA

* **Sesión reactiva en signals y `sessionStorage`:** Limpieza automática de credenciales al expirar el tiempo de vida del token.
* **`authInterceptor`:** Adjunta automáticamente el token JWT Bearer en cada petición HTTP; captura errores `401 Unauthorized` y `403 Forbidden` redirigiendo al login.
* **`errorInterceptor`:** Tratamiento centralizado de respuestas de error `0`, `400`, `401`, `403`, `409` y `500`.
* **Guards funcionales por permiso en cada ruta:** El menú lateral y las rutas se construyen de forma reactiva evaluando los permisos del usuario logueado.

| Ruta | Módulo | Permiso |
| :--- | :--- | :--- |
| `/login` | Inicio de sesión y recuperación | Público |
| `/inicio` | Dashboard analítico | Autenticado |
| `/atencion-paciente` | Consulta oftálmica y recetas PDF | `ATENCION_LEER` |
| `/atencion-paciente/nueva` | Registro de examen refractivo | `ATENCION_REGISTRAR` |
| `/ventas/nueva` | Registro de venta y QR Mercado Pago | `VENTAS_REGISTRAR` |
| `/ventas` | Historial y consulta de ventas | `VENTAS_LEER` |
| `/ventas/pagos-pendientes` | Cuentas por cobrar y amortizaciones | `VENTAS_REGISTRAR` |
| `/ordenes-trabajo` | Bandeja de órdenes de taller | `TALLER_LEER` |
| `/ordenes-trabajo/calidad` | Lensometría y control de calidad | `CALIDAD_VERIFICAR` |
| `/inventario` | Catálogo de productos y Kardex | `CATALOGO_LEER` |
| `/seguridad/usuarios` | Gestión de usuarios y roles | `USUARIOS_ADMINISTRAR` |

---

## Build y despliegue

```bash
ng build                # compilación optimizada de producción → dist/geovisionFrontEnd/browser
cd deploy
docker compose up -d    # Servidor Nginx en http://localhost:80
```

| Indicador | Antes | Después |
| :--- | :---: | :---: |
| **Paquete inicial (`ng build`)** | 890 kB | 298 kB |
| **Bytes al recargar módulo de Ventas** | 680 kB | 4 kB |

*Caché:* `index.html` servido con política `no-cache`; archivos JS y CSS con hash criptográfico y caché de un año (`deploy/nginx.conf`).

---

## Pruebas unitarias

```bash
# Ejecutar suite de pruebas unitarias con Vitest
npm test

# Ejecución de pruebas con cobertura
npm run test:coverage
```

Requiere el backend y Oracle en marcha para pruebas completas de integración. Resultados detallados en `docs/resultados-pruebas.md`.

---

## Pruebas de navegador con Playwright

Con las dependencias instaladas, ejecuta:

```sh
npx playwright install --no-shell chromium
npm run test:e2e
```

Playwright inicia Angular en `http://127.0.0.1:14200` y genera el informe en `playwright-report/`. La suite verifica la redirección al login, la validación del formulario, la respuesta a un 401 y el inicio y cierre de sesión. Los casos que necesitan una respuesta de la API usan datos de prueba.

Para habilitar el caso contra el backend, configura `E2E_USERNAME` y `E2E_PASSWORD` con una cuenta de pruebas. Con el servidor local, `proxy.lan.json` dirige la API a `127.0.0.1:8080`. También puedes asignar `E2E_BASE_URL` a una instalación de pruebas donde el frontend y la API ya estén disponibles.

---

## Calidad del código (SonarQube)

```bash
npm run test -- --watch=false --coverage --coverage-reporters=lcov
npx @sonar/scan -Dsonar.token=$SONAR_TOKEN
```

**Quality gate LP2-Curso:** ✅ **Passed** · cobertura **31,2 %** · duplicación **0,8 %**.

---

## Versiones

| Etiqueta | Fecha | Descripción |
| :--- | :---: | :--- |
| `v1.0-demo` | 18/11/2026 | Versión presentada en la demostración inicial |
| `v1.1-final` | 25/11/2026 | Observaciones atendidas (control de calidad, QR Mercado Pago y diseño responsivo) |

---

> *Proyecto académico · Lenguaje de Programación II · Universidad Peruana Unión · 2026-2*
