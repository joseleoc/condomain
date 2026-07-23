import { ComponentFixture, TestBed } from '@angular/core/testing';
import { SharedTestingModule } from '@testing/shared-testing.module';
import { NetWorthChartComponent } from './net-worth-chart.component';
import { provideCharts, withDefaultRegisterables, BaseChartDirective } from 'ng2-charts';
import type { NetWorthDataPoint } from '@features/financial/data/services/financial-dashboard.service';

describe('NetWorthChartComponent', () => {
  let component: NetWorthChartComponent;
  let fixture: ComponentFixture<NetWorthChartComponent>;

  const mockDataPoints: NetWorthDataPoint[] = [
    { date: '2026-01-01', value: 1000, label: 'Jan 2026' },
    { date: '2026-02-01', value: 1500, label: 'Feb 2026' },
    { date: '2026-03-01', value: 1200, label: 'Mar 2026' },
  ];

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [NetWorthChartComponent, BaseChartDirective, SharedTestingModule],
      providers: [provideCharts(withDefaultRegisterables())],
    }).compileComponents();

    fixture = TestBed.createComponent(NetWorthChartComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    fixture.componentRef.setInput('dataPoints', mockDataPoints);
    fixture.componentRef.setInput('selectedDuration', '1m');
    fixture.detectChanges();

    expect(component).toBeTruthy();
  });

  it('should render chart title', () => {
    fixture.componentRef.setInput('dataPoints', mockDataPoints);
    fixture.componentRef.setInput('selectedDuration', '1m');
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.textContent).toContain('financial.dashboard.chart.title');
  });

  it('should render all duration segment buttons', () => {
    fixture.componentRef.setInput('dataPoints', mockDataPoints);
    fixture.componentRef.setInput('selectedDuration', '1m');
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    const segments = Array.from(compiled.querySelectorAll<HTMLElement>('ion-segment-button'));

    expect(segments.length).toBe(5);
    expect(segments[0].getAttribute('value')).toBe('1m');
    expect(segments[1].getAttribute('value')).toBe('3m');
    expect(segments[2].getAttribute('value')).toBe('6m');
    expect(segments[3].getAttribute('value')).toBe('1y');
    expect(segments[4].getAttribute('value')).toBe('2y');
  });

  it('should show loading skeleton when isLoading is true', () => {
    fixture.componentRef.setInput('isLoading', true);
    fixture.componentRef.setInput('selectedDuration', '1m');
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;

    expect(compiled.querySelector('.chart-skeleton')).toBeTruthy();
    expect(compiled.querySelector('.skeleton-chart')).toBeTruthy();
    expect(compiled.querySelector('.chart-container')).toBeFalsy();
  });

  it('should show error state with retry button when hasError is true', () => {
    fixture.componentRef.setInput('hasError', true);
    fixture.componentRef.setInput('selectedDuration', '1m');
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;

    expect(compiled.querySelector('.chart-error')).toBeTruthy();
    expect(compiled.querySelector('ion-icon[name="cloud-offline-outline"]')).toBeTruthy();
    expect(compiled.querySelector('ion-button')).toBeTruthy();
    expect(compiled.textContent).toContain('financial.dashboard.chart.error');
    expect(compiled.textContent).toContain('financial.dashboard.chart.retry');
  });

  it('should emit retry event when retry button is clicked', () => {
    fixture.componentRef.setInput('hasError', true);
    fixture.componentRef.setInput('selectedDuration', '1m');
    fixture.detectChanges();

    const retrySpy = jasmine.createSpy('retrySpy');
    component.retry.subscribe(retrySpy);

    const button = fixture.nativeElement.querySelector('ion-button');
    button.click();

    expect(retrySpy).toHaveBeenCalled();
  });

  it('should show empty state when isEmpty is true', () => {
    fixture.componentRef.setInput('isEmpty', true);
    fixture.componentRef.setInput('selectedDuration', '1m');
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;

    expect(compiled.querySelector('.chart-empty')).toBeTruthy();
    expect(compiled.querySelector('ion-icon[name="trending-up-outline"]')).toBeTruthy();
    expect(compiled.textContent).toContain('financial.dashboard.chart.empty');
  });

  it('should render chart container when data is available', () => {
    fixture.componentRef.setInput('dataPoints', mockDataPoints);
    fixture.componentRef.setInput('selectedDuration', '1m');
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;

    expect(compiled.querySelector('.chart-container')).toBeTruthy();
    expect(compiled.querySelector('canvas[baseChart]')).toBeTruthy();
  });

  it('should emit durationChange when segment value changes', () => {
    fixture.componentRef.setInput('dataPoints', mockDataPoints);
    fixture.componentRef.setInput('selectedDuration', '1m');
    fixture.detectChanges();

    const durationSpy = jasmine.createSpy('durationSpy');
    component.durationChange.subscribe(durationSpy);

    const segment = fixture.nativeElement.querySelector('ion-segment');
    segment.value = '6m';
    segment.dispatchEvent(new CustomEvent('ionChange', { detail: { value: '6m' } }));

    expect(durationSpy).toHaveBeenCalledWith('6m');
  });

  it('should compute chart data from dataPoints', () => {
    fixture.componentRef.setInput('dataPoints', mockDataPoints);
    fixture.componentRef.setInput('selectedDuration', '1m');
    fixture.detectChanges();

    const chartData = component.chartData();

    expect(chartData.labels).toEqual(['Jan 2026', 'Feb 2026', 'Mar 2026']);
    expect(chartData.datasets[0].data).toEqual([1000, 1500, 1200]);
  });

  it('should update chart data when dataPoints input changes', () => {
    fixture.componentRef.setInput('dataPoints', mockDataPoints);
    fixture.componentRef.setInput('selectedDuration', '1m');
    fixture.detectChanges();

    const updatedPoints: NetWorthDataPoint[] = [
      { date: '2026-04-01', value: 2000, label: 'Apr 2026' },
    ];

    fixture.componentRef.setInput('dataPoints', updatedPoints);
    fixture.detectChanges();

    const chartData = component.chartData();
    expect(chartData.labels).toEqual(['Apr 2026']);
    expect(chartData.datasets[0].data).toEqual([2000]);
  });

  it('should produce empty chart data when no dataPoints are provided', () => {
    fixture.componentRef.setInput('dataPoints', []);
    fixture.componentRef.setInput('selectedDuration', '1m');
    fixture.detectChanges();

    const chartData = component.chartData();

    expect(chartData.labels).toEqual([]);
    expect(chartData.datasets[0].data).toEqual([]);
  });
});
