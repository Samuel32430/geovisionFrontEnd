import { ComponentFixture, TestBed } from '@angular/core/testing';
import { RecetasRecientes } from './recetas-recientes';

describe('RecetasRecientes', () => {
  let component: RecetasRecientes;
  let fixture: ComponentFixture<RecetasRecientes>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RecetasRecientes],
    }).compileComponents();

    fixture = TestBed.createComponent(RecetasRecientes);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
