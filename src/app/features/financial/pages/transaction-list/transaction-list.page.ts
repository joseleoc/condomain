import { Component, computed, effect, inject, signal } from '@angular/core';
import { AsyncPipe } from '@angular/common';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import {
  IonContent,
  IonHeader,
  IonToolbar,
  IonButtons,
  IonBackButton,
  IonTitle,
  IonIcon,
  IonButton,
  IonSpinner,
  IonFab,
  IonFabButton,
  IonFabList,
  IonItemSliding,
  IonItem,
  IonItemOptions,
  IonItemOption,
  IonSelect,
  IonSelectOption,
  IonInput,
  IonRefresher,
  IonRefresherContent,
  IonInfiniteScroll,
  IonInfiniteScrollContent,
  IonListHeader,
  IonLabel,
} from '@ionic/angular/standalone';
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';
import { FinancialTransactions } from '@core/services/financial-transactions/financial-transactions';
import { CondominiumAccounts } from '@core/services/condominium-accounts/condominium-accounts';
import { TransactionCategories } from '@core/services/transaction-categories/transaction-categories';
import { ContextService } from '@core/services/context/context.service';
import { Toast } from '@core/services/toast/toast';
import { FinancialEventsService } from '@core/services/financial-events/financial-events.service';
import { TransactionCardComponent } from '../../components/transaction-card/transaction-card.component';
import { TransactionFormModalComponent } from '../../components/transaction-form-modal/transaction-form-modal.component';
import { TransferFormModalComponent } from '../../components/transfer-form-modal/transfer-form-modal.component';
import { ExpenseFormModalComponent } from '@shared/components/modals/expense-form-modal/expense-form-modal.component';
import type {
  FinancialTransaction,
  TransactionFilter,
  TransactionStatus,
  TransactionType,
} from '@app-types/financial-transactions';

type TypeFilter = TransactionType | 'all';
type StatusFilter = TransactionStatus | 'all';

const TYPE_FILTERS: TypeFilter[] = ['all', 'income', 'expense', 'transfer'];
const STATUS_FILTERS: StatusFilter[] = ['all', 'pending', 'completed', 'voided'];

@Component({
  selector: 'app-transaction-list',
  templateUrl: './transaction-list.page.html',
  styleUrls: ['./transaction-list.page.scss'],
  standalone: true,
  imports: [
    AsyncPipe,
    IonContent,
    IonHeader,
    IonToolbar,
    IonButtons,
    IonBackButton,
    IonTitle,
    IonIcon,
    IonButton,
    IonSpinner,
    IonFab,
    IonFabButton,
    IonFabList,
    IonItemSliding,
    IonItem,
    IonItemOptions,
    IonItemOption,
    IonSelect,
    IonSelectOption,
    IonInput,
    IonRefresher,
    IonRefresherContent,
    IonInfiniteScroll,
    IonInfiniteScrollContent,
    IonListHeader,
    IonLabel,
    TranslocoPipe,
    TransactionCardComponent,
    TransactionFormModalComponent,
    TransferFormModalComponent,
    ExpenseFormModalComponent,
  ],
})
export class TransactionListPage {
  // --- Dependencies ---
  #transactionsService = inject(FinancialTransactions);
  #accountsService = inject(CondominiumAccounts);
  #categoriesService = inject(TransactionCategories);
  #financialEvents = inject(FinancialEventsService);
  contextService = inject(ContextService);
  #translocoService = inject(TranslocoService);
  #toast = inject(Toast);

  // --- State signals ---
  isTransactionFormOpen = signal(false);
  isTransferFormOpen = signal(false);
  isExpenseFormOpen = signal(false);
  transactionToEdit = signal<FinancialTransaction | null>(null);
  accountFilter = signal<string>('all');
  categoryFilter = signal<string>('all');
  typeFilter = signal<TypeFilter>('all');
  statusFilter = signal<StatusFilter>('all');
  dateFromFilter = signal<string>('');
  dateToFilter = signal<string>('');

  // --- Computed ---
  filters = computed<TransactionFilter>(() => {
    const filters: TransactionFilter = {};
    const accountId = this.accountFilter();
    const categoryId = this.categoryFilter();
    const type = this.typeFilter();
    const status = this.statusFilter();
    const dateFrom = this.dateFromFilter();
    const dateTo = this.dateToFilter();

    if (accountId && accountId !== 'all') filters.account_id = accountId;
    if (categoryId && categoryId !== 'all') filters.category_id = categoryId;
    if (type && type !== 'all') filters.type = type;
    if (status && status !== 'all') filters.status = status;
    if (dateFrom) filters.date_from = dateFrom;
    if (dateTo) filters.date_to = dateTo;

    return filters;
  });

  baseCurrency = computed(() => this.contextService.activeCondominium()?.currency ?? 'USD');

  // --- Service state ---
  transactions$ = this.#transactionsService.transactions$;
  loading$ = this.#transactionsService.loading$;
  loadingMore$ = this.#transactionsService.loadingMore$;
  hasMore$ = this.#transactionsService.hasMore$;
  error$ = this.#transactionsService.error$;
  accounts$ = this.#accountsService.accounts$;
  categories$ = this.#categoriesService.categories$;

  hasMore = toSignal(this.hasMore$, { initialValue: true });
  loadingMore = toSignal(this.loadingMore$, { initialValue: false });

  // --- Effects ---
  #fetchTransactionsEffect = effect(() => {
    const condominium = this.contextService.activeCondominium();
    const filters = this.filters();
    if (condominium) {
      this.#transactionsService
        .fetchByCondominium(condominium.id, filters, 0)
        .catch((error) => {
          console.error('Failed to fetch transactions:', error);
        });
    }
  });

  #loadAccountsEffect = effect(() => {
    const condominium = this.contextService.activeCondominium();
    if (condominium) {
      this.#accountsService.fetchByCondominium(condominium.id).catch((error) => {
        console.error('Failed to fetch accounts:', error);
      });
    }
  });

  #loadCategoriesEffect = effect(() => {
    const condominium = this.contextService.activeCondominium();
    if (condominium) {
      this.#categoriesService.fetchByCondominium(condominium.id).catch((error) => {
        console.error('Failed to fetch categories:', error);
      });
    }
  });

  constructor() {
    // Listen to financial events and refresh transactions list
    this.#financialEvents.onAll().pipe(takeUntilDestroyed()).subscribe((event) => {
      const condominium = this.contextService.activeCondominium();
      if (condominium && event.condominiumId === condominium.id) {
        this.#transactionsService
          .fetchByCondominium(condominium.id, this.filters())
          .catch((error) => {
            console.error('Failed to refresh transactions after event:', error);
          });
      }
    });
  }

  // --- Event Handlers ---

  openTransactionForm(transaction?: FinancialTransaction): void {
    this.transactionToEdit.set(transaction ?? null);
    this.isTransactionFormOpen.set(true);
  }

  closeTransactionForm(): void {
    this.isTransactionFormOpen.set(false);
    this.transactionToEdit.set(null);
  }

  openTransferForm(): void {
    this.isTransferFormOpen.set(true);
  }

  closeTransferForm(): void {
    this.isTransferFormOpen.set(false);
  }

  openExpenseForm(): void {
    this.isExpenseFormOpen.set(true);
  }

  closeExpenseForm(): void {
    this.isExpenseFormOpen.set(false);
  }

  setAccountFilter(value: string | null): void {
    this.accountFilter.set(value ?? 'all');
  }

  setCategoryFilter(value: string | null): void {
    this.categoryFilter.set(value ?? 'all');
  }

  setTypeFilter(value: TypeFilter | null): void {
    this.typeFilter.set(value ?? 'all');
  }

  setStatusFilter(value: StatusFilter | null): void {
    this.statusFilter.set(value ?? 'all');
  }

  setDateFromFilter(value: string | null): void {
    this.dateFromFilter.set(value ?? '');
  }

  setDateToFilter(value: string | null): void {
    this.dateToFilter.set(value ?? '');
  }

  getTypeFilters(): TypeFilter[] {
    return TYPE_FILTERS;
  }

  getStatusFilters(): StatusFilter[] {
    return STATUS_FILTERS;
  }

  async onStatusChange(event: { id: string; newStatus: TransactionStatus }): Promise<void> {
    try {
      await this.#transactionsService.updateStatus(event.id, event.newStatus);
      this.#toast.present({
        message: this.#translocoService.translate(
          'financial.transactions.toast.updated',
        ),
        color: 'success',
        duration: 2000,
      });
    } catch (error) {
      console.error('Failed to update status:', error);
      this.#toast.present({
        message: this.#translocoService.translate('common.error'),
        color: 'danger',
        duration: 2000,
      });
    }
  }

  async handleRefresh(event: CustomEvent): Promise<void> {
    const condominium = this.contextService.activeCondominium();
    if (condominium) {
      try {
        await this.#transactionsService.fetchByCondominium(
          condominium.id,
          this.filters(),
          0,
        );
      } catch (error) {
        console.error('Failed to refresh transactions:', error);
      }
    }
    (event.target as HTMLIonRefresherElement).complete();
  }

  async handleInfiniteScroll(event: CustomEvent): Promise<void> {
    try {
      await this.#transactionsService.loadMore();
    } catch (error) {
      console.error('Failed to load more transactions:', error);
    }
    (event.target as HTMLIonInfiniteScrollElement).complete();
  }

  /**
   * Group transactions by date for display with date headers.
   */
  getTransactionsByDate(transactions: FinancialTransaction[]): { date: string; transactions: FinancialTransaction[] }[] {
    const grouped = new Map<string, FinancialTransaction[]>();

    for (const transaction of transactions) {
      const date = transaction.transaction_date;
      if (!grouped.has(date)) {
        grouped.set(date, []);
      }
      grouped.get(date)!.push(transaction);
    }

    return Array.from(grouped.entries())
      .map(([date, transactions]) => ({ date, transactions }))
      .sort((a, b) => b.date.localeCompare(a.date));
  }

  /**
   * Format date for display as section header.
   */
  formatDateHeader(dateString: string): string {
    const date = new Date(dateString);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.getTime() === today.getTime()) {
      return this.#translocoService.translate('financial.transactions.date.today');
    }
    if (date.getTime() === yesterday.getTime()) {
      return this.#translocoService.translate('financial.transactions.date.yesterday');
    }

    return date.toLocaleDateString(undefined, {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  }
}
