import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { MainLayout } from './main-layout';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';

describe('MainLayout', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MainLayout],
      providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()],
    }).compileComponents();
  });

  it('should link to the dashboard, patient module and ventas section', () => {
    const fixture = TestBed.createComponent(MainLayout);
    fixture.detectChanges();
    const links = Array.from(
      fixture.nativeElement.querySelectorAll('nav a'),
    ) as HTMLAnchorElement[];
    expect(links.map((link) => link.getAttribute('href'))).toEqual([
      '/inicio',
      '/atencion-paciente-consulta',
      '/ventas/nueva',
      '/ventas/historial',
      '/ventas/pagos-pendientes',
    ]);
  });

  it('should open and close the mobile navigation', () => {
    const fixture = TestBed.createComponent(MainLayout);
    fixture.detectChanges();
    const toggle = fixture.nativeElement.querySelector('.mobile-toggle') as HTMLButtonElement;
    toggle.click();
    fixture.detectChanges();
    expect(toggle.getAttribute('aria-expanded')).toBe('true');
    (fixture.nativeElement.querySelector('.backdrop') as HTMLButtonElement).click();
    fixture.detectChanges();
    expect(toggle.getAttribute('aria-expanded')).toBe('false');
  });
});
