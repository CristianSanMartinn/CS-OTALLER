import { BadRequestException } from '@nestjs/common';
export function bodyObject(body: unknown, allowed: string[]): Record<string, unknown> {
  if (!body || typeof body !== 'object' || Array.isArray(body)) throw new BadRequestException('Envía un objeto JSON válido.');
  const value = body as Record<string, unknown>;
  if (Object.keys(value).some(key => !allowed.includes(key))) throw new BadRequestException('La solicitud contiene campos no permitidos.');
  return value;
}
export function text(input: Record<string, unknown>, key: string, max: number, required = false): string {
  const raw = input[key];
  if (raw !== undefined && raw !== null && typeof raw !== 'string') throw new BadRequestException(key + ' debe ser texto.');
  const value = typeof raw === 'string' ? raw.trim() : '';
  if ((required && !value) || value.length > max) throw new BadRequestException('Revisa el campo ' + key + '.');
  return value;
}
export function uuid(value: string) {
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value)) throw new BadRequestException('Identificador inválido.');
  return value;
}
export function email(value: string) {
  if (value && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) throw new BadRequestException('Correo electrónico inválido.');
  return value.toLowerCase();
}
