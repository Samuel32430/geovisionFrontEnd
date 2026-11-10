import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { MainLayout } from './main-layout';

describe('MainLayout', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MainLayout],
      providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()],
    }).compileComponents();
  });

  it('should link to the dashboard, patient module, inventario and ventas section', () => {
    const fixture = TestBed.createComponent(MainLayout);
    fixture.detectChanges();
    const links = Array.from(
      fixture.nativeElement.querySelectorAll('nav a'),
    ) as HTMLAnchorElement[];
    expect(links.map((link) => link.getAttribute('href'))).toEqual([
      '/inicio',
      '/atencion-paciente-consulta',
      '/inventario',
      '/ventas/nueva',
      '/ventas/historial',
      '/ventas/pagos-pendientes',
      '/ventas/reportes',
    ]);
  });

  it('should open and close the mobile navigation', () => {
    const fixture = TestBed.createComponent(MainLayout);
    fixture.detectChanges();
    const toggle = fixture.nativeElement.querySelector('.mobile-toggle') as HTMLButtonElement;
    toggle.click();
    fixture.detectChanges();
    expect(
      (fixture.nativeElement.querySelector('#sidebar') as HTMLElement).classList.contains('open'),
    ).toBe(true);
  });
});
