import { formatDate } from './formatDate';

describe('formatDate', () => {
  it('debe formatear la fecha correctamente', () => {
    const date = new Date('2022-01-01T00:00:00.000Z');
    const formattedDate = formatDate(date);
    expect(formattedDate).toBe('01/01/2022');
  });

  it('debe manejar fechas inválidas', () => {
    const date = 'invalid-date' as any;
    const formattedDate = formatDate(date);
    expect(formattedDate).toBe('Fecha inválida');
  });

  it('debe manejar fechas nulas', () => {
    const date = null;
    const formattedDate = formatDate(date);
    expect(formattedDate).toBe('Fecha no disponible');
  });
});