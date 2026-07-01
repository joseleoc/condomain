import {
  Component,
  computed,
  DestroyRef,
  effect,
  inject,
  input,
  output,
} from '@angular/core';
import {
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import {
  IonModal,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonButtons,
  IonButton,
  IonContent,
  IonFooter,
  IonInput,
  IonSelect,
  IonSelectOption,
  IonItem,
} from '@ionic/angular/standalone';
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { TransactionCategories } from '@core/services/transaction-categories/transaction-categories';
import { Toast } from '@core/services/toast/toast';
import type { TransactionCategory } from '@app-types/transaction-categories';

type CategoryType = TransactionCategory['category_type'];

const CATEGORY_TYPES: CategoryType[] = ['income', 'expense'];

interface CategoryFormValue {
  name: string;
  category_type: CategoryType;
  parent_id: string | null;
  icon: string | null;
  color: string | null;
}

@Component({
  selector: 'app-category-form-modal',
  templateUrl: './category-form-modal.component.html',
  styleUrls: ['./category-form-modal.component.scss'],
  standalone: true,
  imports: [
    IonModal,
    IonHeader,
    IonToolbar,
    IonTitle,
    IonButtons,
    IonButton,
    IonContent,
    IonFooter,
    IonInput,
    IonSelect,
    IonSelectOption,
    IonItem,
    ReactiveFormsModule,
    TranslocoPipe,
  ],
})
export class CategoryFormModalComponent {
  // --- Dependencies ---
  #categoriesService = inject(TransactionCategories);
  #translocoService = inject(TranslocoService);
  #toast = inject(Toast);
  #destroyRef = inject(DestroyRef);

  // --- Inputs ---
  category = input<TransactionCategory | null>(null);
  condominiumId = input.required<string>();
  isOpen = input<boolean>(false);

  // --- Outputs ---
  isOpenChange = output<boolean>();

  // --- Signals ---
  #categories = toSignal(this.#categoriesService.categories$, {
    initialValue: [],
  });

  isEditMode = computed(() => this.category() !== null);

  availableParentCategories = computed(() => {
    const selectedType = this.form.value.category_type ?? 'expense';
    return this.#categories().filter(
      (c) => c.category_type === selectedType && c.parent_id === null,
    );
  });

  // --- Form ---
  form = new FormGroup({
    name: new FormControl('', {
      validators: [Validators.required],
      nonNullable: true,
    }),
    category_type: new FormControl<CategoryType>('expense', {
      validators: [Validators.required],
      nonNullable: true,
    }),
    parent_id: new FormControl<string | null>(null),
    icon: new FormControl<string | null>(null),
    color: new FormControl<string | null>(null),
  });

  // --- Reactivity ---
  #populateFormEffect = effect(() => {
    const category = this.category();
    if (category) {
      this.form.setValue(
        {
          name: category.name,
          category_type: category.category_type,
          parent_id: category.parent_id,
          icon: category.icon,
          color: category.color,
        },
        { emitEvent: false },
      );
    } else {
      this.#resetForm();
    }
  });

  #loadCategoriesEffect = effect(() => {
    const condominiumId = this.condominiumId();
    const isOpen = this.isOpen();
    if (condominiumId && isOpen) {
      this.#categoriesService.fetchByCondominium(condominiumId).catch((error) => {
        console.error('Failed to fetch categories:', error);
      });
    }
  });

  #typeChangeSubscription = this.form.controls.category_type.valueChanges
    .pipe(takeUntilDestroyed(this.#destroyRef))
    .subscribe(() => {
      this.form.patchValue({ parent_id: null }, { emitEvent: false });
    });

  // --- Methods ---

  /**
   * Submits the form. Creates or updates the category depending on the mode.
   */
  async submit(): Promise<void> {
    if (this.form.invalid) {
      this.#markAllAsTouched();
      return;
    }

    const formValue = this.form.value as CategoryFormValue;
    const category = this.category();

    try {
      if (category) {
        await this.#categoriesService.update(category.id, {
          name: formValue.name,
          category_type: formValue.category_type,
          parent_id: formValue.parent_id,
          icon: formValue.icon,
          color: formValue.color,
        });
        this.#showToast('updated', 'success');
      } else {
        await this.#categoriesService.create({
          condominium_id: this.condominiumId(),
          name: formValue.name,
          category_type: formValue.category_type,
          parent_id: formValue.parent_id,
          icon: formValue.icon,
          color: formValue.color,
        });
        this.#showToast('created', 'success');
      }

      this.isOpenChange.emit(false);
      this.#resetForm();
    } catch (error) {
      console.error('Failed to save category:', error);
      const message = error instanceof Error ? error.message : String(error);
      if (message.toLowerCase().includes('two levels')) {
        this.#showToast('hierarchyError', 'danger');
      } else {
        this.#toast.present({
          message: this.#translocoService.translate('common.error'),
          color: 'danger',
          duration: 2000,
        });
      }
    }
  }

  /**
   * Cancels the form and closes the modal.
   */
  cancel(): void {
    this.isOpenChange.emit(false);
    this.#resetForm();
  }

  /**
   * Returns the available category types for the select dropdown.
   */
  getCategoryTypes(): CategoryType[] {
    return CATEGORY_TYPES;
  }

  // --- Private Methods ---

  #resetForm(): void {
    this.form.reset(
      {
        name: '',
        category_type: 'expense',
        parent_id: null,
        icon: null,
        color: null,
      },
      { emitEvent: false },
    );
  }

  #markAllAsTouched(): void {
    Object.values(this.form.controls).forEach((control) => {
      control.markAsTouched();
      control.updateValueAndValidity();
    });
  }

  #showToast(key: string, color: string): void {
    this.#toast.present({
      message: this.#translocoService.translate(`financial.categories.toast.${key}`),
      color,
      duration: 2000,
    });
  }
}
