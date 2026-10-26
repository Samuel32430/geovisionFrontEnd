import { TestBed } from '@angular/core/testing';
import { Dashboard } from './dashboard';

describe('Dashboard', () => {
  it('should show zero indicators and empty sections without sample patient data', async () => {
    await TestBed.configureTestingModule({ imports: [Dashboard] }).compileComponents();
    const fixture = TestBed.createComponent(Dashboard);
    fixture.detectChanges();
    const element = fixture.nativeElement as HTMLElement;
    expect(element.querySelectorAll('.stat').length).toBe(4);
    expect(
      Array.from(element.querySelectorAll('.stat-value')).map((node) => node.textContent?.trim()),
    ).toEqual(['S/ 0.00', '0 órdenes', '0 atendidos', '0 productos']);
    expect(element.textContent).toContain('Aún no hay ventas ni pedidos');
    expect(element.textContent).toContain('No hay consultas registradas');
    expect(element.textContent).toContain('Sin alertas para mostrar');
    expect(Array.from(element.querySelectorAll('button')).every((button) => button.disabled)).toBe(
      true,
    );
  });
});
