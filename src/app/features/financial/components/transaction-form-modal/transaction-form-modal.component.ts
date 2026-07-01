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
  AbstractControl,
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
  IonSegment,
  IonSegmentButton,
  IonLabel,
  IonNote,
} from '@ionic/angular/standalone';
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { CondominiumAccounts } from '@core/services/condominium-accounts/condominium-accounts';
import { TransactionCategories } from '@core/services/transaction-categories/transaction-categories';
import { Currency } from '@core/services/currency/currency';
import { FinancialTransactions } from '@core/services/financial-transactions/financial-transactions';
import { Toast } from '@core/services/toast/toast';
import type { FinancialTransaction } from '@app-types/financial-transactions';

type TransactionFormType = 'income' | 'expense';

const TRANSACTION_TYPES: TransactionFormType[] = ['income', 'expense'];

interface TransactionFormValue {
  type: TransactionFormType;
  account_id: string;
  category_id: string | null;
  amount: number;
  original_currency: string;
  exchange_rate: number;
  description: string;
  reference_number: string | null;
  transaction_date: string;
}

@Component({
  selector: 'app-transaction-form-modal',
  templateUrl: './transaction-form-modal.component.html',
  styleUrls: ['./transaction-form-modal.component.scss'],
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
    IonSegment,
    IonSegmentButton,
    IonLabel,
    IonNote,
    ReactiveFormsModule,
    TranslocoPipe,
  ],
})
export class TransactionFormModalComponent {
  // --- Dependencies ---
  #accountsService = inject(CondominiumAccounts);
  #categoriesService = inject(TransactionCategories);
  #currencyService = inject(Currency);
  #transactionsService = inject(FinancialTransactions);
  #translocoService = inject(TranslocoService);
  #toast = inject(Toast);
  #destroyRef = inject(DestroyRef);

  // --- Inputs ---
  transaction = input<FinancialTransaction | null>(null);
  condominiumId = input.required<string>();
  baseCurrency = input.required<string>();
  isOpen = input<boolean>(false);

  // --- Outputs ---
  isOpenChange = output<boolean>();

  // --- Signals ---
  #accounts = toSignal(this.#accountsService.accounts$, { initialValue: [] });
  #categories = toSignal(this.#categoriesService.categories$, { initialValue: [] });
  currencies = toSignal(this.#currencyService.currencies$, { initialValue: [] });

  isEditMode = computed(() => this.transaction() !== null);
  isTerminal = computed(() => {
    const status = this.transaction()?.status;
    return status === 'completed' || status === 'voided';
  });

  availableAccounts = computed(() =>
    this.#accounts().filter((a) => a.condominium_id === this.condominiumId()),
  );

  availableCategories = computed(() => {
    const selectedType = this.formValue().type ?? 'expense';
    return this.#categories().filter(
      (c) => c.category_type === selectedType && c.condominium_id === this.condominiumId(),
    );
  });

  showExchangeRate = computed(() => {
    const currency = this.formValue().original_currency;
    return !!currency && currency !== this.baseCurrency();
  });

  // --- Form ---
  form = new FormGroup({
    type: new FormControl<TransactionFormType>('expense', {
      validators: [Validators.required],
      nonNullable: true,
    }),
    account_id: new FormControl('', {
      validators: [Validators.required],
      nonNullable: true,
    }),
    category_id: new FormControl<string | null>(null, {
      validators: [Validators.required],
    }),
    amount: new FormControl<number>(0, {
      validators: [Validators.required, Validators.min(0.01)],
      nonNullable: true,
    }),
    original_currency: new FormControl('', {
      validators: [Validators.required],
      nonNullable: true,
    }),
    exchange_rate: new FormControl<number>(1, {
      validators: [Validators.required, Validators.min(0.0001)],
      nonNullable: true,
    }),
    description: new FormControl('', {
      validators: [Validators.required],
      nonNullable: true,
    }),
    reference_number: new FormControl<string | null>(null),
    transaction_date: new FormControl('', {
      validators: [Validators.required, this.#futureDateValidator()],
      nonNullable: true,
    }),
  });

  formValue = toSignal(this.form.valueChanges, { initialValue: this.form.value });

  // --- Reactivity ---
  #populateFormEffect = effect(() => {
    const transaction = this.transaction();
    if (transaction) {
      this.form.patchValue(
        {
          type: transaction.type as TransactionFormType,
          account_id: transaction.account_id,
          category_id: transaction.category_id,
          amount: transaction.amount,
          original_currency: transaction.original_currency,
          exchange_rate: transaction.exchange_rate,
          description: transaction.description,
          reference_number: transaction.reference_number,
          transaction_date: transaction.transaction_date,
        },
        { emitEvent: false },
      );
      if (this.isTerminal()) {
        this.form.disable();
      } else {
        this.form.enable();
        this.form.controls.type.disable();
      }
    } else {
      this.#resetForm();
    }
  });

  #loadAccountsEffect = effect(() => {
    const condominiumId = this.condominiumId();
    const isOpen = this.isOpen();
    if (condominiumId && isOpen) {
      this.#accountsService.fetchByCondominium(condominiumId).catch((error) => {
        console.error('Failed to fetch accounts:', error);
      });
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

  #currencyChangeSubscription = this.form.controls.original_currency.valueChanges
    .pipe(takeUntilDestroyed(this.#destroyRef))
    .subscribe((currency) => {
      if (currency === this.baseCurrency()) {
        this.form.patchValue({ exchange_rate: 1 }, { emitEvent: false });
      }
    });

  #typeChangeSubscription = this.form.controls.type.valueChanges
    .pipe(takeUntilDestroyed(this.#destroyRef))
    .subscribe(() => {
      this.form.patchValue({ category_id: null }, { emitEvent: false });
    });

  // --- Methods ---

  async submit(): Promise<void> {
    if (this.isTerminal()) {
      this.#showToast('terminalEditError', 'danger');
      return;
    }

    if (this.form.invalid) {
      this.#markAllAsTouched();
      return;
    }

    const formValue = this.form.value as TransactionFormValue;
    const transaction = this.transaction();

    try {
      if (transaction) {
        await this.#transactionsService.update(transaction.id, {
          account_id: formValue.account_id,
          category_id: formValue.category_id,
          amount: formValue.amount,
          original_currency: formValue.original_currency,
          exchange_rate: formValue.exchange_rate,
          description: formValue.description,
          reference_number: formValue.reference_number,
          transaction_date: formValue.transaction_date,
        });
        this.#showToast('updated', 'success');
      } else {
        await this.#transactionsService.create({
          condominium_id: this.condominiumId(),
          account_id: formValue.account_id,
          category_id: formValue.category_id,
          type: formValue.type,
          amount: formValue.amount,
          original_currency: formValue.original_currency,
          exchange_rate: formValue.exchange_rate,
          description: formValue.description,
          reference_number: formValue.reference_number,
          transaction_date: formValue.transaction_date,
        });
        this.#showToast('created', 'success');
      }

      this.isOpenChange.emit(false);
      this.#resetForm();
    } catch (error) {
      console.error('Failed to save transaction:', error);
      this.#showToast('error', 'danger');
    }
  }

  cancel(): void {
    this.isOpenChange.emit(false);
    this.#resetForm();
  }

  getTransactionTypes(): TransactionFormType[] {
    return TRANSACTION_TYPES;
  }

  // --- Private Methods ---

  #resetForm(): void {
    this.form.reset(
      {
        type: 'expense',
        account_id: '',
        category_id: null,
        amount: 0,
        original_currency: this.baseCurrency(),
        exchange_rate: 1,
        description: '',
        reference_number: null,
        transaction_date: this.#today(),
      },
      { emitEvent: false },
    );
    this.form.enable();
  }

  #markAllAsTouched(): void {
    Object.values(this.form.controls).forEach((control) => {
      control.markAsTouched();
      control.updateValueAndValidity();
    });
  }

  #showToast(key: string, color: string): void {
    this.#toast.present({
      message: this.#translocoService.translate(`financial.transactions.toast.${key}`),
      color,
      duration: 2000,
    });
  }

  #today(): string {
    return new Date().toISOString().split('T')[0];
  }

  #futureDateValidator() {
    return (control: AbstractControl<string>) => {
      if (!control.value) return null;
      const selected = new Date(control.value);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      if (selected > today) {
        return { futureDate: true };
      }
      return null;
    };
  }
}
