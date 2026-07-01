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
} from '@ionic/angular/standalone';
import { toSignal } from '@angular/core/rxjs-interop';
import { Currency } from '@core/services/currency/currency';
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
  ],
})
export class WalletCardComponent {
  // --- Dependencies ---
  #currencyService = inject(Currency);

  // --- Inputs ---
  account = input.required<CondominiumAccount>();

  // --- Signals ---
  #currencies = toSignal(this.#currencyService.currencies$, {
    initialValue: [],
  });

  /** Icon name derived from the account type. */
  iconName = computed(() => ICON_MAP[this.account().account_type]);

  /** Currency symbol for the account's currency, falling back to the ISO code. */
  currencySymbol = computed(() => {
    const isoCode = this.account().currency;
    const currency = this.#currencies().find((c) => c.iso_code === isoCode);
    return currency?.symbol ?? isoCode;
  });
}
