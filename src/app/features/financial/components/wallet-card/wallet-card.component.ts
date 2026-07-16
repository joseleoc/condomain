import { Component, computed, inject, input } from '@angular/core';
import {
  IonCard,
  IonCardHeader,
  IonCardTitle,
  IonCardSubtitle,
  IonCardContent,
  IonIcon,
  IonItem,
  IonLabel,
  IonBadge,
} from '@ionic/angular/standalone';
import { TranslocoPipe } from '@jsverse/transloco';
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
  imports: [
    IonCard,
    IonCardHeader,
    IonCardTitle,
    IonCardSubtitle,
    IonCardContent,
    IonIcon,
    IonItem,
    IonLabel,
    IonBadge,
    TranslocoPipe,
  ],
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
    return account.icon || ICON_MAP[account.account_type];
  });

  /** Accent color derived from the account color or primary fallback. */
  accentColor = computed(() => {
    return this.account().color || 'var(--ion-color-primary)';
  });

  /** Formatted balance with thousands separators and 2 decimals. */
  formattedBalance = computed(() => {
    const account = this.account();
    return new Intl.NumberFormat('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(account.current_balance);
  });

  /** Transloco key for the account type badge label. */
  accountTypeLabel = computed(() => {
    return `financial.wallets.accountType.${this.account().account_type}`;
  });
}
