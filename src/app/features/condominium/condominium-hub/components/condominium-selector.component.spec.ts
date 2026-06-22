import { ComponentFixture, TestBed } from '@angular/core/testing';
import { SharedTestingModule } from '@testing/shared-testing.module';
import { CondominiumSelectorComponent } from './condominium-selector.component';

describe('CondominiumSelectorComponent', () => {
  let component: CondominiumSelectorComponent;
  let fixture: ComponentFixture<CondominiumSelectorComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SharedTestingModule, CondominiumSelectorComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(CondominiumSelectorComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should emit condominiumChange when a condominium is selected', () => {
    const spy = jasmine.createSpy('condominiumChange');
    component.condominiumChange.subscribe(spy);

    component.onCondominiumSelected({ detail: { value: 'test-condo-id' } });

    expect(spy).toHaveBeenCalledWith('test-condo-id');
  });

  it('should not emit when value is falsy', () => {
    const spy = jasmine.createSpy('condominiumChange');
    component.condominiumChange.subscribe(spy);

    component.onCondominiumSelected({ detail: { value: null } });

    expect(spy).not.toHaveBeenCalled();
  });
});
