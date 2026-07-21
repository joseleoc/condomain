import { Component, computed, effect, inject, signal } from '@angular/core';
import { AsyncPipe } from '@angular/common';
import {
  IonContent,
  IonIcon,
  IonButton,
  IonFab,
  IonFabButton,
  IonItem,
  IonItemSliding,
  IonItemOptions,
  IonItemOption,
  IonAlert,
  IonGrid,
  IonRow,
  IonCol,
} from '@ionic/angular/standalone';
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';
import {
  FinancialDashboardService,
  ChartDuration,
} from '../../data/services/financial-dashboard.service';
import { ContextService } from '@core/services/context/context.service';
import { Toast } from '@core/services/toast/toast';
import { NetWorthCardComponent } from '../../components/net-worth-card/net-worth-card.component';
import { NetWorthChartComponent } from '../../components/net-worth-chart/net-worth-chart.component';
import { WalletCardComponent } from '../../components/wallet-card/wallet-card.component';
import { WalletFormModalComponent } from '../../components/wallet-form-modal/wallet-form-modal.component';
import { environment } from '../../../../../environments/environment';
import type { CondominiumAccount } from '@app-types/condominium-accounts';

@Component({
  selector: 'app-financial-dashboard',
  templateUrl: './dashboard.page.html',
  styleUrls: ['./dashboard.page.scss'],
  standalone: true,
  imports: [
    AsyncPipe,
    IonContent,
    IonIcon,
    IonButton,
    IonFab,
    IonFabButton,
    IonItem,
    IonItemSliding,
    IonItemOptions,
    IonItemOption,
    IonAlert,
    TranslocoPipe,
    NetWorthCardComponent,
    NetWorthChartComponent,
    WalletCardComponent,
    WalletFormModalComponent,
    IonGrid,
    IonRow,
    IonCol,
  ],
})
export class FinancialDashboardPage {
  // --- Dependencies ---
  #dashboardService = inject(FinancialDashboardService);
  contextService = inject(ContextService);
  #translocoService = inject(TranslocoService);
  #toast = inject(Toast);

  // --- Service streams ---
  loading$ = this.#dashboardService.loading$;
  error$ = this.#dashboardService.error$;
  isEmpty$ = this.#dashboardService.isEmpty$;
  netWorth$ = this.#dashboardService.netWorth$;
  wallets$ = this.#dashboardService.wallets$;
  netWorthHistory$ = this.#dashboardService.netWorthHistory$;
  selectedDuration = this.#dashboardService.selectedDuration;

  // --- Component state ---
  isFormModalOpen = signal(false);
  walletToEdit = signal<CondominiumAccount | null>(null);
  deleteTarget = signal<CondominiumAccount | null>(null);

  constructor() {
    if (!environment.production) {
      this.#dashboardService.enableMockData();
    }
  }

  // --- Mock account for skeleton loading ---
  mockAccount: CondominiumAccount = {
    id: 'skeleton',
    name: '',
    account_type: 'bank',
    currency: 'USD',
    current_balance: 0,
    initial_balance: 0,
    condominium_id: '',
    created_at: '',
    updated_at: '',
    institution_name: null,
    icon: null,
    color: null,
    deleted_at: null,
  };

  // --- Computed ---
  deleteAlertButtons = computed(() => [
    {
      text: this.#translocoService.translate('common.cancel'),
      role: 'cancel',
      handler: () => this.cancelDelete(),
    },
    {
      text: this.#translocoService.translate('common.delete'),
      role: 'confirm',
      handler: () => this.executeDelete(),
    },
  ]);

  // --- Effects ---
  #loadDataEffect = effect(() => {
    const condominium = this.contextService.activeCondominium();
    if (condominium) {
      this.#dashboardService.loadData().catch((error) => {
        console.error('Failed to load dashboard data:', error);
      });
    }
  });

  // --- Event handlers ---
  onDurationChange(duration: ChartDuration): void {
    this.#dashboardService.setDuration(duration);
  }

  retryLoad(): void {
    this.#dashboardService.loadData().catch((error) => {
      console.error('Failed to retry loading:', error);
    });
  }

  retryLoadHistory(): void {
    // History is automatically recalculated when wallets change.
    // For now, trigger a full reload to refresh all dashboard data.
    this.retryLoad();
  }

  openCreateWalletModal(): void {
    this.walletToEdit.set(null);
    this.isFormModalOpen.set(true);
  }

  openEditWalletModal(wallet: CondominiumAccount): void {
    this.walletToEdit.set(wallet);
    this.isFormModalOpen.set(true);
  }

  closeFormModal(): void {
    this.isFormModalOpen.set(false);
    this.walletToEdit.set(null);
  }

  confirmDeleteWallet(wallet: CondominiumAccount): void {
    this.deleteTarget.set(wallet);
  }

  cancelDelete(): void {
    this.deleteTarget.set(null);
  }

  async executeDelete(): Promise<void> {
    const target = this.deleteTarget();
    if (!target) return;

    try {
      // TODO: Implement wallet deletion once the dashboard service exposes a delete method.
      // For now, just show a success toast.
      this.#toast.present({
        message: this.#translocoService.translate(
          'financial.wallets.toast.deleted',
        ),
        color: 'success',
        duration: 2000,
      });
    } catch (error) {
      console.error('Failed to delete wallet:', error);
      this.#toast.present({
        message: this.#translocoService.translate('common.error'),
        color: 'danger',
        duration: 2000,
      });
    } finally {
      this.deleteTarget.set(null);
    }
  }
}
