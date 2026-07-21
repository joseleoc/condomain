import { Component, computed, input } from '@angular/core';
import { IonIcon } from '@ionic/angular/standalone';
import type { CondominiumAccount } from '@app-types/condominium-accounts';

type AccountType = CondominiumAccount['account_type'];

const ICON_MAP: Record<AccountType, string> = {
  bank: 'business',
  cash: 'cash',
  wallet: 'wallet',
  credit: 'card',
  investment: 'trending-up',
};

@Component({
  selector: 'app-wallet-card',
  templateUrl: './wallet-card.component.html',
  styleUrls: ['./wallet-card.component.scss'],
  standalone: true,
  imports: [IonIcon],
})
export class WalletCardComponent {
  // --- Inputs ---
  account = input.required<CondominiumAccount>();
  isLoading = input<boolean>(false);
  hasError = input<boolean>(false);

  // --- Computed ---
  /** Icon name derived from the account icon or account type fallback. */
  iconName = computed(() => {
    const account = this.account();
    return account.icon || ICON_MAP[account.account_type] || 'wallet-outline';
  });

  /** Accent color derived from the account color or primary fallback. */
  accentColor = computed(() => {
    return this.account().color || 'var(--ion-color-primary)';
  });

  /** Light background color for the icon circle (accent color at low opacity). */
  iconBgColor = computed(() => {
    const color = this.account().color;
    if (color) {
      return this.#hexToRgba(color, 0.12);
    }
    return 'var(--ion-color-light)';
  });

  /** Formatted balance with thousands separators and 2 decimals. */
  formattedBalance = computed(() => {
    const account = this.account();
    const sign = account.current_balance < 0 ? '-' : '';
    const absBalance = Math.abs(account.current_balance);
    return (
      sign +
      new Intl.NumberFormat('en-US', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }).format(absBalance)
    );
  });

  // --- Private helpers ---
  #hexToRgba(hex: string, alpha: number): string {
    const cleaned = hex.replace('#', '');
    const r = parseInt(cleaned.substring(0, 2), 16);
    const g = parseInt(cleaned.substring(2, 4), 16);
    const b = parseInt(cleaned.substring(4, 6), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  }
}
