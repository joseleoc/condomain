import {
  Component,
  computed,
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
  IonText,
} from '@ionic/angular/standalone';
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';
import { toSignal } from '@angular/core/rxjs-interop';
import { CondominiumAccounts } from '@core/services/condominium-accounts/condominium-accounts';
import { Currency } from '@core/services/currency/currency';
import { FinancialTransactions } from '@core/services/financial-transactions/financial-transactions';
import { Toast } from '@core/services/toast/toast';

interface TransferFormValue {
  from_account_id: string;
  to_account_id: string;
  amount: number;
  original_currency: string;
  exchange_rate: number;
  description: string;
  transaction_date: string;
}

@Component({
  selector: 'app-transfer-form-modal',
  templateUrl: './transfer-form-modal.component.html',
  styleUrls: ['./transfer-form-modal.component.scss'],
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
    IonText,
    ReactiveFormsModule,
    TranslocoPipe,
  ],
})
export class TransferFormModalComponent {
  // --- Dependencies ---
  #accountsService = inject(CondominiumAccounts);
  #currencyService = inject(Currency);
  #transactionsService = inject(FinancialTransactions);
  #translocoService = inject(TranslocoService);
  #toast = inject(Toast);

  // --- Inputs ---
  condominiumId = input.required<string>();
  baseCurrency = input.required<string>();
  isOpen = input<boolean>(false);

  // --- Outputs ---
  isOpenChange = output<boolean>();

  // --- Signals ---
  #accounts = toSignal(this.#accountsService.accounts$, { initialValue: [] });
  currencies = toSignal(this.#currencyService.currencies$, { initialValue: [] });

  availableSourceAccounts = computed(() =>
    this.#accounts().filter((a) => a.condominium_id === this.condominiumId()),
  );

  availableDestinationAccounts = computed(() => {
    const sourceId = this.formValue().from_account_id;
    return this.availableSourceAccounts().filter((a) => a.id !== sourceId);
  });

  showExchangeRate = computed(() => {
    const currency = this.formValue().original_currency;
    return !!currency && currency !== this.baseCurrency();
  });

  // --- Form ---
  form = new FormGroup(
    {
      from_account_id: new FormControl('', {
        validators: [Validators.required],
        nonNullable: true,
      }),
      to_account_id: new FormControl('', {
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
      transaction_date: new FormControl('', {
        validators: [Validators.required, this.#futureDateValidator()],
        nonNullable: true,
      }),
    },
    { validators: this.#accountsDifferValidator() },
  );

  formValue = toSignal(this.form.valueChanges, { initialValue: this.form.value });

  // --- Reactivity ---
  #loadAccountsEffect = effect(() => {
    const condominiumId = this.condominiumId();
    const isOpen = this.isOpen();
    if (condominiumId && isOpen) {
      this.#accountsService.fetchByCondominium(condominiumId).catch((error) => {
        console.error('Failed to fetch accounts:', error);
      });
    }
  });

  #currencyChangeSubscription = this.form.controls.original_currency.valueChanges.subscribe(
    (currency) => {
      if (currency === this.baseCurrency()) {
        this.form.patchValue({ exchange_rate: 1 }, { emitEvent: false });
      }
    },
  );

  // --- Methods ---

  async submit(): Promise<void> {
    if (this.form.invalid) {
      this.#markAllAsTouched();
      return;
    }

    const formValue = this.form.value as TransferFormValue;

    try {
      await this.#transactionsService.createTransfer({
        condominium_id: this.condominiumId(),
        source_account_id: formValue.from_account_id,
        destination_account_id: formValue.to_account_id,
        amount: formValue.amount,
        original_currency: formValue.original_currency,
        exchange_rate: formValue.exchange_rate,
        base_currency: this.baseCurrency(),
        description: formValue.description,
        transaction_date: formValue.transaction_date,
      });

      this.#showToast('created', 'success');
      this.isOpenChange.emit(false);
      this.#resetForm();
    } catch (error) {
      console.error('Failed to create transfer:', error);
      const message = error instanceof Error ? error.message : String(error);
      if (message.includes('must be different')) {
        this.#showToast('sameAccountError', 'danger');
      } else {
        this.#showToast('error', 'danger');
      }
    }
  }

  cancel(): void {
    this.isOpenChange.emit(false);
    this.#resetForm();
  }

  // --- Private Methods ---

  #resetForm(): void {
    this.form.reset(
      {
        from_account_id: '',
        to_account_id: '',
        amount: 0,
        original_currency: this.baseCurrency(),
        exchange_rate: 1,
        description: '',
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

  #accountsDifferValidator() {
    return (group: AbstractControl) => {
      const from = group.get('from_account_id')?.value;
      const to = group.get('to_account_id')?.value;
      if (from && to && from === to) {
        return { sameAccount: true };
      }
      return null;
    };
  }
}
