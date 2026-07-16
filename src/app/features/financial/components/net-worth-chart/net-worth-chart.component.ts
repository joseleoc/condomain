import { Component, computed, input, OnDestroy, output, signal } from '@angular/core';
import {
  IonCard,
  IonCardHeader,
  IonCardTitle,
  IonCardContent,
  IonSegment,
  IonSegmentButton,
  IonLabel,
  IonIcon,
  IonButton,
} from '@ionic/angular/standalone';
import { TranslocoPipe } from '@jsverse/transloco';
import { BaseChartDirective, provideCharts, withDefaultRegisterables } from 'ng2-charts';
import { ChartConfiguration } from 'chart.js';
import type { NetWorthDataPoint, ChartDuration } from '@features/financial/data/services/financial-dashboard.service';

@Component({
  selector: 'app-net-worth-chart',
  templateUrl: './net-worth-chart.component.html',
  styleUrls: ['./net-worth-chart.component.scss'],
  standalone: true,
  providers: [provideCharts(withDefaultRegisterables())],
  imports: [
    IonCard,
    IonCardHeader,
    IonCardTitle,
    IonCardContent,
    IonSegment,
    IonSegmentButton,
    IonLabel,
    IonIcon,
    IonButton,
    TranslocoPipe,
    BaseChartDirective,
  ],
})
export class NetWorthChartComponent implements OnDestroy {
  // --- Inputs ---
  dataPoints = input.required<NetWorthDataPoint[]>();
  isLoading = input<boolean>(false);
  isEmpty = input<boolean>(false);
  hasError = input<boolean>(false);
  selectedDuration = input.required<ChartDuration>();

  // --- Outputs ---
  durationChange = output<ChartDuration>();
  retry = output<void>();

  // --- Theme tracking ---
  #themeVersion = signal(0);
  #colorSchemeQuery = window.matchMedia('(prefers-color-scheme: dark)');
  #colorSchemeListener = (): void => {
    this.#themeVersion.update((version) => version + 1);
  };

  constructor() {
    this.#colorSchemeQuery.addEventListener('change', this.#colorSchemeListener);
  }

  ngOnDestroy(): void {
    this.#colorSchemeQuery.removeEventListener('change', this.#colorSchemeListener);
  }

  #primaryColor = computed(() => {
    // Re-evaluate when the color scheme changes so the chart picks up the current theme.
    this.#themeVersion();

    return (
      getComputedStyle(document.documentElement).getPropertyValue('--ion-color-primary').trim() ||
      '#ff8200'
    );
  });

  #textColor = computed(() => {
    this.#themeVersion();

    return (
      getComputedStyle(document.documentElement).getPropertyValue('--ion-text-color').trim() ||
      '#1e1e1e'
    );
  });

  // --- Computed ---
  chartData = computed<ChartConfiguration<'line'>['data']>(() => {
    const points = this.dataPoints();
    const primaryColor = this.#primaryColor();

    return {
      labels: points.map((p) => p.label),
      datasets: [
        {
          data: points.map((p) => p.value),
          label: 'Net Worth',
          borderColor: primaryColor,
          backgroundColor: `${primaryColor}1A`,
          fill: true,
          tension: 0.4,
        },
      ],
    };
  });

  // --- Chart configuration ---
  chartOptions = computed<ChartConfiguration<'line'>['options']>(() => {
    const textColor = this.#textColor();
    const gridColor = `${textColor}1A`;

    return {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
      },
      scales: {
        x: {
          ticks: { color: textColor },
          grid: { color: gridColor },
        },
        y: {
          beginAtZero: false,
          ticks: {
            color: textColor,
            callback: (value) => `$${value}`,
          },
          grid: { color: gridColor },
        },
      },
    };
  });

  // --- Methods ---
  onDurationChange(event: Event): void {
    const customEvent = event as CustomEvent<{ value: ChartDuration }>;
    this.durationChange.emit(customEvent.detail.value);
  }
}
