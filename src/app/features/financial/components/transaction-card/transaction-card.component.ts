import { Component, computed, inject, input, output } from '@angular/core';
import {
  IonItem,
  IonLabel,
  IonBadge,
  IonIcon,
} from '@ionic/angular/standalone';
import { toSignal } from '@angular/core/rxjs-interop';
import { Currency } from '@core/services/currency/currency';
import { CondominiumAccounts } from '@core/services/condominium-accounts/condominium-accounts';
import { TransactionCategories } from '@core/services/transaction-categories/transaction-categories';
import { TranslocoPipe } from '@jsverse/transloco';
import type {
  FinancialTransaction,
  TransactionType,
} from '@app-types/financial-transactions';

type StatusColor = 'warning' | 'success' | 'medium';
type TypeColor = 'success' | 'danger' | 'primary';

const TYPE_ICON_MAP: Record<TransactionType, string> = {
  income: 'arrow-up-circle-outline',
  expense: 'arrow-down-circle-outline',
  transfer: 'swap-horizontal-outline',
};

const STATUS_COLOR_MAP: Record<FinancialTransaction['status'], StatusColor> = {
  pending: 'warning',
  completed: 'success',
  voided: 'medium',
};

const TYPE_COLOR_MAP: Record<TransactionType, TypeColor> = {
  income: 'success',
  expense: 'danger',
  transfer: 'primary',
};

@Component({
  selector: 'app-transaction-card',
  templateUrl: './transaction-card.component.html',
  styleUrls: ['./transaction-card.component.scss'],
  standalone: true,
  imports: [IonItem, IonLabel, IonBadge, IonIcon, TranslocoPipe],
})
export class TransactionCardComponent {
  // --- Dependencies ---
  #currencyService = inject(Currency);
  #accountsService = inject(CondominiumAccounts);
  #categoriesService = inject(TransactionCategories);

  // --- Inputs ---
  transaction = input.required<FinancialTransaction>();
  showAccountName = input<boolean>(false);

  // --- Outputs ---
  statusChange = output<{ id: string; newStatus: FinancialTransaction['status'] }>();

  // --- Signals ---
  #currencies = toSignal(this.#currencyService.currencies$, {
    initialValue: [],
  });
  #accounts = toSignal(this.#accountsService.accounts$, {
    initialValue: [],
  });
  #categories = toSignal(this.#categoriesService.categories$, {
    initialValue: [],
  });

  // --- Computed ---
  typeIcon = computed(() => TYPE_ICON_MAP[this.transaction().type]);
  statusColor = computed(() => STATUS_COLOR_MAP[this.transaction().status]);
  typeColor = computed(() => TYPE_COLOR_MAP[this.transaction().type]);

  currencySymbol = computed(() => {
    const isoCode = this.transaction().original_currency;
    const currency = this.#currencies().find((c) => c.iso_code === isoCode);
    return currency?.symbol ?? isoCode;
  });

  category = computed(() => {
    const categoryId = this.transaction().category_id;
    if (!categoryId) return null;
    return this.#categories().find((c) => c.id === categoryId) ?? null;
  });

  categoryIcon = computed(() => this.category()?.icon ?? 'pricetag-outline');

  accountName = computed(() => {
    const accountId = this.transaction().account_id;
    const account = this.#accounts().find((a) => a.id === accountId);
    return account?.name ?? '';
  });

  formattedAmount = computed(() => {
    const { type, amount } = this.transaction();
    const symbol = this.currencySymbol();
    const formatted = `${symbol}${amount.toFixed(2)}`;
    if (type === 'income') return `+${formatted}`;
    if (type === 'expense') return `-${formatted}`;
    return formatted;
  });

  canComplete = computed(() => this.transaction().status === 'pending');
  canVoid = computed(() =>
    ['pending', 'completed'].includes(this.transaction().status),
  );

  // --- Methods ---
  emitStatusChange(newStatus: FinancialTransaction['status']): void {
    this.statusChange.emit({ id: this.transaction().id, newStatus });
  }
}
