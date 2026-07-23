import { ComponentFixture, TestBed } from '@angular/core/testing';
import { SharedTestingModule } from '@testing/shared-testing.module';
import { NetWorthCardComponent } from './net-worth-card.component';

describe('NetWorthCardComponent', () => {
  let component: NetWorthCardComponent;
  let fixture: ComponentFixture<NetWorthCardComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [NetWorthCardComponent, SharedTestingModule],
    }).compileComponents();

    fixture = TestBed.createComponent(NetWorthCardComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    fixture.componentRef.setInput('netWorth', 1250.5);
    fixture.componentRef.setInput('currency', 'USD');
    fixture.detectChanges();

    expect(component).toBeTruthy();
  });

  it('should display formatted net worth with currency when data is available', () => {
    fixture.componentRef.setInput('netWorth', 1250.5);
    fixture.componentRef.setInput('currency', 'USD');
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    const valueElement = compiled.querySelector('.net-worth-value');

    expect(valueElement).toBeTruthy();
    expect(valueElement!.textContent).toContain('USD');
    expect(valueElement!.textContent).toContain('1,250.50');
  });

  it('should format net worth with thousands separator and 2 decimals', () => {
    fixture.componentRef.setInput('netWorth', 1234567.891);
    fixture.componentRef.setInput('currency', 'VES');
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    const valueElement = compiled.querySelector('.net-worth-value');

    expect(valueElement!.textContent).toContain('VES');
    expect(valueElement!.textContent).toContain('1,234,567.89');
  });

  it('should render zero formatted value when netWorth is null', () => {
    fixture.componentRef.setInput('netWorth', null);
    fixture.componentRef.setInput('currency', 'USD');
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    const valueElement = compiled.querySelector('.net-worth-value');

    expect(valueElement!.textContent).toContain('0.00');
  });

  it('should show loading state when isLoading is true', () => {
    fixture.componentRef.setInput('isLoading', true);
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;

    expect(compiled.querySelector('.loading-state')).toBeTruthy();
    expect(compiled.querySelector('.pulse-label')).toBeTruthy();
    expect(compiled.querySelector('.pulse-value')).toBeTruthy();
    expect(compiled.querySelector('.net-worth-value')).toBeFalsy();
  });

  it('should show error state when hasError is true', () => {
    fixture.componentRef.setInput('hasError', true);
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;

    expect(compiled.querySelector('.error-state')).toBeTruthy();
    expect(compiled.querySelector('ion-icon[name="alert-circle-outline"]')).toBeTruthy();
    expect(compiled.textContent).toContain('financial.dashboard.netWorth.error');
  });

  it('should show empty state when isEmpty is true', () => {
    fixture.componentRef.setInput('isEmpty', true);
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;

    expect(compiled.querySelector('.empty-state')).toBeTruthy();
    expect(compiled.querySelector('ion-icon[name="wallet-outline"]')).toBeTruthy();
    expect(compiled.textContent).toContain('financial.dashboard.netWorth.empty');
  });

  it('should prioritize loading state over error and empty states', () => {
    fixture.componentRef.setInput('isLoading', true);
    fixture.componentRef.setInput('hasError', true);
    fixture.componentRef.setInput('isEmpty', true);
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;

    expect(compiled.querySelector('.loading-state')).toBeTruthy();
    expect(compiled.querySelector('.error-state')).toBeFalsy();
    expect(compiled.querySelector('.empty-state')).toBeFalsy();
  });

  it('should display the net worth title', () => {
    fixture.componentRef.setInput('netWorth', 1000);
    fixture.componentRef.setInput('currency', 'USD');
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;

    expect(compiled.textContent).toContain('financial.dashboard.netWorth.title');
  });
});
