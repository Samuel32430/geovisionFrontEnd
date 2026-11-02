import { LoginResponse } from '../auth.model';

// Unsigned synthetic token used exclusively in unit tests, never sent to a server.
export function loginPrueba(exp = Math.floor(Date.now() / 1000) + 3600): LoginResponse {
  const payload = btoa(JSON.stringify({ sub: 'prueba.p01', exp }));
  return {
    token: `${btoa('{"alg":"test"}')}.${payload}.firma-prueba`,
    tipoToken: 'Bearer',
    idUsuario: 1,
    username: 'prueba.p01',
    correo: 'prueba.p01@example.invalid',
    idPersona: 2,
    nombreCompleto: 'Operador Prueba',
    roles: ['PRUEBA_P01'],
    permisos: ['PACIENTES_LEER'],
  };
}
