import {
  Component,
  computed,
  DestroyRef,
  effect,
  inject,
  input,
  OnInit,
  output,
  signal,
} from '@angular/core';
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
  IonDatetimeButton,
  IonDatetime,
  IonPopover,
  IonLabel,
  IonNote,
  IonButton,
} from '@ionic/angular/standalone';
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { map } from 'rxjs';
import { CondominiumAccounts } from '@core/services/condominium-accounts/condominium-accounts';
import { TransactionCategories } from '@core/services/transaction-categories/transaction-categories';
import { Currency } from '@core/services/currency/currency';

export interface ExpenseFormValue {
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
  selector: 'app-expense-form',
  templateUrl: './expense-form.component.html',
  styleUrls: ['./expense-form.component.scss'],
  standalone: true,
  imports: [
    AsyncPipe,
    ReactiveFormsModule,
    TranslocoPipe,
    IonInput,
    IonItem,
    IonSelect,
    IonSelectOption,
    IonDatetimeButton,
    IonDatetime,
    IonPopover,
    IonLabel,
    IonNote,
    IonButton,
  ],
})
export class ExpenseFormComponent implements OnInit {
  // --- Dependencies ---
  #accountsService = inject(CondominiumAccounts);
  #categoriesService = inject(TransactionCategories);
  #currencyService = inject(Currency);
  #translocoService = inject(TranslocoService);
  #destroyRef = inject(DestroyRef);

  // --- Inputs ---
  condominiumId = input.required<string>();
  baseCurrency = input.required<string>();

  // --- Outputs ---
  formSubmit = output<ExpenseFormValue>();
  cancelled = output<void>();

  // --- Lifecycle ---
  ngOnInit(): void {
    // Set default currency once on init
    this.form.patchValue(
      {
        original_currency: this.baseCurrency(),
      },
      { emitEvent: false },
    );

    // Fetch data
    this.#accountsService.fetchByCondominium(this.condominiumId()).catch((error) => {
      console.error('Failed to fetch accounts:', error);
    });
    this.#categoriesService.fetchByCondominium(this.condominiumId()).catch((error) => {
      console.error('Failed to fetch categories:', error);
    });
  }

  // --- Signals ---
  #accounts = toSignal(this.#accountsService.accounts$, { initialValue: [] });
  #categories = toSignal(this.#categoriesService.categories$, { initialValue: [] });
  currencies = toSignal(this.#currencyService.currencies$, { initialValue: [] });
  tempDate = signal<string>(this.#today());

  availableAccounts = computed(() =>
    this.#accounts().filter((account) => account.condominium_id === this.condominiumId()),
  );

  availableCategories = computed(() =>
    this.#categories().filter(
      (category) =>
        category.category_type === 'expense' && category.condominium_id === this.condominiumId(),
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
    transaction_date: new FormControl(this.#today(), {
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
  #currencyChangeSubscription = this.form.controls.original_currency.valueChanges
    .pipe(takeUntilDestroyed(this.#destroyRef))
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

    const formValue = this.form.value as ExpenseFormValue;
    this.formSubmit.emit(formValue);
  }

  /**
   * Emits the cancelled event.
   */
  onCancel(): void {
    this.cancelled.emit();
    this.#resetForm();
  }

  /**
   * Resets the form to its initial state.
   */
  resetForm(): void {
    this.#resetForm();
  }

  /**
   * Handles date selection from the calendar. Auto-applies the date.
   */
  onDateChange(event: CustomEvent): void {
    const dateValue = event.detail.value;
    if (dateValue) {
      // Extract just the date part (YYYY-MM-DD)
      const dateOnly = dateValue.split('T')[0];
      this.tempDate.set(dateOnly);
      this.form.patchValue({ transaction_date: dateOnly }, { emitEvent: false });
    }
  }

  /**
   * Applies the selected date and closes the popover.
   */
  applyDate(popover: IonPopover): void {
    // Date is already applied via onDateChange, just close the popover
    popover.dismiss();
  }

  /**
   * Cancels the date selection and closes the popover.
   */
  cancelDate(popover: IonPopover): void {
    // Revert to the original date from the form
    this.tempDate.set(this.form.controls.transaction_date.value);
    popover.dismiss();
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
    this.tempDate.set(this.#today());
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
      takeUntilDestroyed(this.#destroyRef),
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
