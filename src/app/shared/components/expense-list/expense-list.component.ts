import { Component, computed, inject, input, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonList, IonItem, IonLabel, IonIcon, IonNote, IonSpinner, IonButton } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { syncOutline, checkmarkCircle, timeOutline } from 'ionicons/icons';
import { toSignal } from '@angular/core/rxjs-interop';
import { ExpensesService } from '@core/services/expenses/expenses.service';
import { FinancialTransaction } from '@app-types/financial-transactions';
import { CondominiumAccounts } from '@core/services/condominium-accounts/condominium-accounts';

@Component({
  selector: 'app-expense-list',
  standalone: true,
  imports: [CommonModule, IonList, IonItem, IonLabel, IonIcon, IonNote, IonSpinner, IonButton],
  templateUrl: './expense-list.component.html',
  styleUrl: './expense-list.component.scss',
})
export class ExpenseListComponent implements OnInit {
  private expensesService = inject(ExpensesService);
  private accountsService = inject(CondominiumAccounts);

  condominiumId = input.required<string>();

  expenses = toSignal(this.expensesService.expenses$, { initialValue: [] });
  loading = toSignal(this.expensesService.loading$, { initialValue: false });
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
    this.expensesService.fetchExpensesByCondominium(this.condominiumId());
    this.accountsService.fetchByCondominium(this.condominiumId());
  }

  getAccountName(accountId: string): string {
    return this.accountMap().get(accountId) || 'Unknown Account';
  }

  isPendingSync(expense: FinancialTransaction): boolean {
    return (expense as any)._local_status === 'pending' || expense.status === 'pending';
  }

  getSyncIcon(expense: FinancialTransaction): string {
    return this.isPendingSync(expense) ? 'sync-outline' : 'checkmark-circle';
  }

  getSyncColor(expense: FinancialTransaction): string {
    return this.isPendingSync(expense) ? 'warning' : 'success';
  }

  getSyncText(expense: FinancialTransaction): string {
    return this.isPendingSync(expense) ? 'Pending sync' : 'Synced';
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
