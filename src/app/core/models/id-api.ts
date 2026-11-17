export type ConIdApi<T extends object, K extends keyof T> = T | (Omit<T, K> & { id: number });

export function normalizarId<T extends object, K extends keyof T>(
  dto: ConIdApi<T, K>,
  clave: K,
): T {
  if ('id' in dto) {
    const { id, ...datos } = dto;
    return { ...datos, [clave]: id } as T;
  }
  return dto as T;
}
