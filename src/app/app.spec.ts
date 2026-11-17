import { TestBed } from '@angular/core/testing';
import { App } from './app';

describe('App', () => {
  it('should contain the application router outlet', async () => {
    await TestBed.configureTestingModule({ imports: [App] }).compileComponents();
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('router-outlet')).not.toBeNull();
  });
});
