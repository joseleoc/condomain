import { Component, computed, input } from '@angular/core';
import {
  IonCard,
  IonCardHeader,
  IonCardSubtitle,
  IonCardContent,
  IonIcon,
} from '@ionic/angular/standalone';
import { TranslocoPipe } from '@jsverse/transloco';

@Component({
  selector: 'app-net-worth-card',
  templateUrl: './net-worth-card.component.html',
  styleUrls: ['./net-worth-card.component.scss'],
  standalone: true,
  imports: [
    IonCard,
    IonCardHeader,
    IonCardSubtitle,
    IonCardContent,
    IonIcon,
    TranslocoPipe,
  ],
})
export class NetWorthCardComponent {
  // --- Inputs ---
  netWorth = input<number | null>(null);
  isLoading = input<boolean>(false);
  isEmpty = input<boolean>(false);
  hasError = input<boolean>(false);
  currency = input<string>('USD');

  // --- Computed ---
  /** Formatted net worth with thousands separators and 2 decimals. */
  formattedNetWorth = computed(() => {
    const value = this.netWorth() ?? 0;
    return new Intl.NumberFormat('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value);
  });
}
