import { Component, computed, effect, inject, input, output } from '@angular/core';
import {
  AbstractControl,
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  ValidationErrors,
  Validators,
} from '@angular/forms';
import { AsyncPipe } from '@angular/common';
import {
  IonInput,
  IonItem,
  IonSelect,
  IonSelectOption,
} from '@ionic/angular/standalone';
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { map } from 'rxjs';
import { CondominiumAccounts } from '@core/services/condominium-accounts/condominium-accounts';
import { TransactionCategories } from '@core/services/transaction-categories/transaction-categories';
import { Currency } from '@core/services/currency/currency';

export interface IncomeFormValue {
  account_id: string;
  category_id: string;
  amount: number;
  original_currency: string;
  exchange_rate: number;
  description: string;
  reference_number: string | null;
  transaction_date: string;
}

@Component({
  selector: 'app-income-form',
  templateUrl: './income-form.component.html',
  styleUrls: ['./income-form.component.scss'],
  standalone: true,
  imports: [
    AsyncPipe,
    ReactiveFormsModule,
    TranslocoPipe,
    IonInput,
    IonItem,
    IonSelect,
    IonSelectOption,
  ],
})
export class IncomeFormComponent {
  // --- Dependencies ---
  #accountsService = inject(CondominiumAccounts);
  #categoriesService = inject(TransactionCategories);
  #currencyService = inject(Currency);
  #translocoService = inject(TranslocoService);

  // --- Inputs ---
  condominiumId = input.required<string>();
  baseCurrency = input.required<string>();

  // --- Outputs ---
  formSubmit = output<IncomeFormValue>();
  cancelled = output<void>();

  // --- Signals ---
  #accounts = toSignal(this.#accountsService.accounts$, { initialValue: [] });
  #categories = toSignal(this.#categoriesService.categories$, { initialValue: [] });
  currencies = toSignal(this.#currencyService.currencies$, { initialValue: [] });

  availableAccounts = computed(() =>
    this.#accounts().filter((account) => account.condominium_id === this.condominiumId()),
  );

  availableCategories = computed(() =>
    this.#categories().filter(
      (category) =>
        category.category_type === 'income' && category.condominium_id === this.condominiumId(),
    ),
  );

  showExchangeRate = computed(() => {
    const currency = this.formValue().original_currency;
    return !!currency && currency !== this.baseCurrency();
  });

  // --- Form ---
  form = new FormGroup({
    account_id: new FormControl('', {
      validators: [Validators.required],
      nonNullable: true,
    }),
    category_id: new FormControl('', {
      validators: [Validators.required],
      nonNullable: true,
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

  // --- Error streams ---
  accountErrors$ = this.#buildErrorStream(this.form.controls.account_id, () => null);
  categoryErrors$ = this.#buildErrorStream(this.form.controls.category_id, () => null);
  amountErrors$ = this.#buildErrorStream(this.form.controls.amount, (errors) => {
    if (errors['min']) {
      return this.#translocoService.translate('validation.min', {
        value: (errors['min'] as { min: number }).min,
      });
    }
    return null;
  });
  currencyErrors$ = this.#buildErrorStream(this.form.controls.original_currency, () => null);
  exchangeRateErrors$ = this.#buildErrorStream(this.form.controls.exchange_rate, (errors) => {
    if (errors['min']) {
      return this.#translocoService.translate('validation.min', {
        value: (errors['min'] as { min: number }).min,
      });
    }
    return null;
  });
  descriptionErrors$ = this.#buildErrorStream(this.form.controls.description, () => null);
  referenceNumberErrors$ = this.#buildErrorStream(this.form.controls.reference_number, () => null);
  transactionDateErrors$ = this.#buildErrorStream(this.form.controls.transaction_date, (errors) => {
    if (errors['futureDate']) {
      return this.#translocoService.translate('validation.futureDate');
    }
    return null;
  });

  // --- Reactivity ---
  #loadAccountsEffect = effect(() => {
    const condominiumId = this.condominiumId();
    if (condominiumId) {
      this.#accountsService.fetchByCondominium(condominiumId).catch((error) => {
        console.error('Failed to fetch accounts:', error);
      });
    }
  });

  #loadCategoriesEffect = effect(() => {
    const condominiumId = this.condominiumId();
    if (condominiumId) {
      this.#categoriesService.fetchByCondominium(condominiumId).catch((error) => {
        console.error('Failed to fetch categories:', error);
      });
    }
  });

  #currencyChangeSubscription = this.form.controls.original_currency.valueChanges
    .pipe(takeUntilDestroyed())
    .subscribe((currency) => {
      const exchangeRateControl = this.form.controls.exchange_rate;
      if (currency === this.baseCurrency()) {
        exchangeRateControl.setValue(1, { emitEvent: false });
        exchangeRateControl.removeValidators(Validators.required);
      } else {
        exchangeRateControl.addValidators(Validators.required);
      }
      exchangeRateControl.updateValueAndValidity({ emitEvent: false });
    });

  // --- Methods ---

  /**
   * Validates and submits the form. Emits the form value if valid.
   */
  submit(): void {
    if (this.form.invalid) {
      this.#markAllAsTouched();
      return;
    }

    const formValue = this.form.value as IncomeFormValue;
    this.formSubmit.emit(formValue);
    this.#resetForm();
  }

  /**
   * Emits the cancelled event.
   */
  onCancel(): void {
    this.cancelled.emit();
    this.#resetForm();
  }

  // --- Private Methods ---

  #resetForm(): void {
    this.form.reset(
      {
        account_id: '',
        category_id: '',
        amount: 0,
        original_currency: this.baseCurrency(),
        exchange_rate: 1,
        description: '',
        reference_number: null,
        transaction_date: this.#today(),
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

  #buildErrorStream(
    control: AbstractControl,
    mapErrors: (errors: ValidationErrors) => string | null,
  ) {
    return control.statusChanges.pipe(
      takeUntilDestroyed(),
      map(() => {
        const errors = control.errors;
        if (!errors) return null;

        if (errors['required']) {
          return this.#translocoService.translate('validation.required');
        }

        return mapErrors(errors);
      }),
    );
  }
}
