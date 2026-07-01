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
  IonSegment,
  IonSegmentButton,
  IonLabel,
  IonAlert,
} from '@ionic/angular/standalone';
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';
import { TransactionCategories } from '@core/services/transaction-categories/transaction-categories';
import { ContextService } from '@core/services/context/context.service';
import { Toast } from '@core/services/toast/toast';
import { CategoryGroupComponent } from '../../components/category-group/category-group.component';
import { CategoryFormModalComponent } from '../../components/category-form-modal/category-form-modal.component';
import type { CategoryTreeNode, TransactionCategory } from '@app-types/transaction-categories';

type CategoryType = 'income' | 'expense';

const CATEGORY_TYPES: CategoryType[] = ['income', 'expense'];

@Component({
  selector: 'app-category-list',
  templateUrl: './category-list.page.html',
  styleUrls: ['./category-list.page.scss'],
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
    IonSegment,
    IonSegmentButton,
    IonLabel,
    IonAlert,
    TranslocoPipe,
    CategoryGroupComponent,
    CategoryFormModalComponent,
  ],
})
export class CategoryListPage {
  // --- Dependencies ---
  #categoriesService = inject(TransactionCategories);
  contextService = inject(ContextService);
  #translocoService = inject(TranslocoService);
  #toast = inject(Toast);

  // --- State signals ---
  isFormModalOpen = signal(false);
  categoryToEdit = signal<TransactionCategory | null>(null);
  deleteTarget = signal<TransactionCategory | null>(null);
  selectedType = signal<CategoryType>('expense');
  categoryTree = signal<CategoryTreeNode[]>([]);

  // --- Computed ---
  isEditMode = computed(() => this.categoryToEdit() !== null);

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
  loading$ = this.#categoriesService.loading$;
  error$ = this.#categoriesService.error$;

  // --- Effects ---
  #fetchCategoriesEffect = effect(() => {
    const condominium = this.contextService.activeCondominium();
    const type = this.selectedType();
    if (condominium) {
      this.#fetchCategories(condominium.id, type);
    }
  });

  // --- Event Handlers ---

  setSelectedType(type: CategoryType): void {
    this.selectedType.set(type);
  }

  getCategoryTypes(): CategoryType[] {
    return CATEGORY_TYPES;
  }

  openCreateModal(): void {
    this.categoryToEdit.set(null);
    this.isFormModalOpen.set(true);
  }

  openEditModal(category: TransactionCategory): void {
    this.categoryToEdit.set(category);
    this.isFormModalOpen.set(true);
  }

  closeFormModal(): void {
    this.isFormModalOpen.set(false);
    this.categoryToEdit.set(null);
  }

  confirmDelete(category: TransactionCategory): void {
    if (category.is_system) {
      this.#toast.present({
        message: this.#translocoService.translate(
          'financial.categories.toast.systemError',
        ),
        color: 'danger',
        duration: 2000,
      });
      return;
    }
    this.deleteTarget.set(category);
  }

  cancelDelete(): void {
    this.deleteTarget.set(null);
  }

  async executeDelete(): Promise<void> {
    const target = this.deleteTarget();
    if (!target) return;

    try {
      await this.#categoriesService.delete(target.id);
      this.#toast.present({
        message: this.#translocoService.translate(
          'financial.categories.toast.deleted',
        ),
        color: 'success',
        duration: 2000,
      });
      await this.#refreshCategories();
    } catch (error) {
      console.error('Failed to delete category:', error);
      this.#toast.present({
        message: this.#translocoService.translate('common.error'),
        color: 'danger',
        duration: 2000,
      });
    } finally {
      this.deleteTarget.set(null);
    }
  }

  // --- Private Methods ---

  async #fetchCategories(condominiumId: string, type: CategoryType): Promise<void> {
    try {
      const tree = await this.#categoriesService.fetchByType(condominiumId, type);
      this.categoryTree.set(tree);
    } catch (error) {
      console.error('Failed to fetch categories:', error);
      this.categoryTree.set([]);
    }
  }

  async #refreshCategories(): Promise<void> {
    const condominium = this.contextService.activeCondominium();
    if (!condominium) return;
    await this.#fetchCategories(condominium.id, this.selectedType());
  }
}
