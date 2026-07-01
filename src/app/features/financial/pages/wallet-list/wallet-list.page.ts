import { Component, computed, effect, inject, signal } from '@angular/core';
import { AsyncPipe } from '@angular/common';
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
  IonList,
  IonItemSliding,
  IonItem,
  IonItemOptions,
  IonItemOption,
  IonAlert,
} from '@ionic/angular/standalone';
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';
import { CondominiumAccounts } from '@core/services/condominium-accounts/condominium-accounts';
import { ContextService } from '@core/services/context/context.service';
import { Toast } from '@core/services/toast/toast';
import { WalletCardComponent } from '../../components/wallet-card/wallet-card.component';
import { WalletFormModalComponent } from '../../components/wallet-form-modal/wallet-form-modal.component';
import type { CondominiumAccount } from '@app-types/condominium-accounts';

@Component({
  selector: 'app-wallet-list',
  templateUrl: './wallet-list.page.html',
  styleUrls: ['./wallet-list.page.scss'],
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
    IonList,
    IonItemSliding,
    IonItem,
    IonItemOptions,
    IonItemOption,
    IonAlert,
    TranslocoPipe,
    WalletCardComponent,
    WalletFormModalComponent,
  ],
})
export class WalletListPage {
  // --- Dependencies ---
  #accountsService = inject(CondominiumAccounts);
  contextService = inject(ContextService);
  #translocoService = inject(TranslocoService);
  #toast = inject(Toast);

  // --- State signals ---
  isFormModalOpen = signal(false);
  accountToEdit = signal<CondominiumAccount | null>(null);
  deleteTarget = signal<CondominiumAccount | null>(null);

  // --- Computed ---
  isEditMode = computed(() => this.accountToEdit() !== null);

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

  // --- Service state ---
  accounts$ = this.#accountsService.accounts$;
  loading$ = this.#accountsService.loading$;
  error$ = this.#accountsService.error$;

  // --- Effects ---
  #fetchAccountsEffect = effect(() => {
    const condominium = this.contextService.activeCondominium();
    if (condominium) {
      this.#accountsService.fetchByCondominium(condominium.id).catch((error) => {
        console.error('Failed to fetch wallets:', error);
      });
    }
  });

  // --- Event Handlers ---

  openCreateModal(): void {
    this.accountToEdit.set(null);
    this.isFormModalOpen.set(true);
  }

  openEditModal(account: CondominiumAccount): void {
    this.accountToEdit.set(account);
    this.isFormModalOpen.set(true);
  }

  closeFormModal(): void {
    this.isFormModalOpen.set(false);
    this.accountToEdit.set(null);
  }

  confirmDelete(account: CondominiumAccount): void {
    this.deleteTarget.set(account);
  }

  cancelDelete(): void {
    this.deleteTarget.set(null);
  }

  async executeDelete(): Promise<void> {
    const target = this.deleteTarget();
    if (!target) return;

    try {
      await this.#accountsService.delete(target.id);
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
