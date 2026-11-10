import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { of } from 'rxjs';
import { InventarioStock } from './inventario-stock';
import { InventarioService } from '../../services/inventario.service';

describe('InventarioStock', () => {
  let component: InventarioStock;
  let fixture: ComponentFixture<InventarioStock>;
  let inventarioServiceMock: Partial<InventarioService>;

  beforeEach(async () => {
    inventarioServiceMock = {
      listarProductos: () =>
        of({
          content: [
            {
              idProducto: 1,
              codigo: 'MONT-001',
              nombre: 'Montura Classic',
              marca: 'Ray-Ban',
              precio: 299,
              stock: 8,
              estado: 1,
            },
          ],
          number: 0,
          size: 10,
          totalElements: 1,
          totalPages: 1,
          first: true,
          last: true,
          empty: false,
        }),
      listarAlertasBajoStock: () => of([]),
    };

    await TestBed.configureTestingModule({
      imports: [InventarioStock],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: InventarioService, useValue: inventarioServiceMock },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(InventarioStock);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('debe crearse correctamente e inicializar el listado de productos', () => {
    expect(component).toBeTruthy();
  });
});
