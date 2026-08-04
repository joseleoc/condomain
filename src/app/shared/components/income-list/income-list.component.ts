import { Component, computed, inject, input, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonList, IonItem, IonLabel, IonIcon, IonNote, IonSpinner } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { syncOutline, checkmarkCircle, timeOutline } from 'ionicons/icons';
import { toSignal } from '@angular/core/rxjs-interop';
import { IncomesService } from '@core/services/incomes/incomes.service';
import { FinancialTransaction } from '@app-types/financial-transactions';
import { CondominiumAccounts } from '@core/services/condominium-accounts/condominium-accounts';

@Component({
  selector: 'app-income-list',
  standalone: true,
  imports: [CommonModule, IonList, IonItem, IonLabel, IonIcon, IonNote, IonSpinner],
  templateUrl: './income-list.component.html',
  styleUrl: './income-list.component.scss',
})
export class IncomeListComponent implements OnInit {
  private incomesService = inject(IncomesService);
  private accountsService = inject(CondominiumAccounts);

  condominiumId = input.required<string>();

  incomes = toSignal(this.incomesService.incomes$, { initialValue: [] });
  loading = toSignal(this.incomesService.loading$, { initialValue: false });
  accounts = toSignal(this.accountsService.accounts$, { initialValue: [] });

  // Map account_id to account name for quick lookup
  accountMap = computed(() => {
    const map = new Map<string, string>();
    this.accounts().forEach(account => {
      map.set(account.id, account.name);
    });
    return map;
  });

  constructor() {
    addIcons({ syncOutline, checkmarkCircle, timeOutline });
  }

  ngOnInit(): void {
    this.incomesService.fetchIncomesByCondominium(this.condominiumId());
    this.accountsService.fetchByCondominium(this.condominiumId());
  }

  getAccountName(accountId: string): string {
    return this.accountMap().get(accountId) || 'Unknown Account';
  }

  isPendingSync(income: FinancialTransaction): boolean {
    return (income as any)._local_status === 'pending' || income.status === 'pending';
  }

  getSyncIcon(income: FinancialTransaction): string {
    return this.isPendingSync(income) ? 'sync-outline' : 'checkmark-circle';
  }

  getSyncColor(income: FinancialTransaction): string {
    return this.isPendingSync(income) ? 'warning' : 'success';
  }

  getSyncText(income: FinancialTransaction): string {
    return this.isPendingSync(income) ? 'Pending sync' : 'Synced';
  }

  formatDate(dateString: string): string {
    const date = new Date(dateString);
    return date.toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  }

  formatAmount(amount: number, currency: string): string {
    return `${amount.toFixed(2)} ${currency}`;
  }
}
