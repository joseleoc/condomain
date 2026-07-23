import {
  Component,
  computed,
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
import { toSignal } from '@angular/core/rxjs-interop';
import { CondominiumAccounts } from '@core/services/condominium-accounts/condominium-accounts';
import { Currency } from '@core/services/currency/currency';
import { Toast } from '@core/services/toast/toast';
import type { CondominiumAccount } from '@app-types/condominium-accounts';

type AccountType = CondominiumAccount['account_type'];

const ACCOUNT_TYPES: AccountType[] = [
  'bank',
  'cash',
  'wallet',
  'credit',
  'investment',
];

interface WalletFormValue {
  name: string;
  account_type: AccountType;
  currency: string;
  institution_name: string | null;
  initial_balance: number;
  icon: string | null;
  color: string | null;
}

@Component({
  selector: 'app-wallet-form-modal',
  templateUrl: './wallet-form-modal.component.html',
  styleUrls: ['./wallet-form-modal.component.scss'],
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
export class WalletFormModalComponent {
  // --- Dependencies ---
  #accountsService = inject(CondominiumAccounts);
  #currencyService = inject(Currency);
  #translocoService = inject(TranslocoService);
  #toast = inject(Toast);

  // --- Inputs ---
  account = input<CondominiumAccount | null>(null);
  condominiumId = input.required<string>();
  isOpen = input<boolean>(false);

  // --- Outputs ---
  isOpenChange = output<boolean>();

  // --- Signals ---
  #currencies = toSignal(this.#currencyService.currencies$, {
    initialValue: [],
  });
  currencies = computed(() => this.#currencies());

  isEditMode = computed(() => this.account() !== null);

  // --- Form ---
  form = new FormGroup({
    name: new FormControl('', {
      validators: [Validators.required],
      nonNullable: true,
    }),
    account_type: new FormControl<AccountType>('bank', {
      validators: [Validators.required],
      nonNullable: true,
    }),
    currency: new FormControl('', {
      validators: [Validators.required],
      nonNullable: true,
    }),
    institution_name: new FormControl<string | null>(null),
    initial_balance: new FormControl<number>(0, {
      validators: [Validators.required, Validators.min(0)],
      nonNullable: true,
    }),
    icon: new FormControl<string | null>(null),
    color: new FormControl<string | null>(null),
  });

  // --- Reactivity ---
  #populateFormEffect = effect(() => {
    const account = this.account();
    if (account) {
      this.form.patchValue({
        name: account.name,
        account_type: account.account_type,
        currency: account.currency,
        institution_name: account.institution_name,
        initial_balance: account.initial_balance,
        icon: account.icon,
        color: account.color,
      });
    } else {
      this.#resetForm();
    }
  });

  // --- Methods ---

  /**
   * Submits the form. Creates or updates the account depending on the mode.
   */
  async submit(): Promise<void> {
    if (this.form.invalid) {
      this.#markAllAsTouched();
      return;
    }

    const formValue = this.form.value as WalletFormValue;
    const account = this.account();

    try {
      if (account) {
        await this.#accountsService.update(account.id, {
          name: formValue.name,
          account_type: formValue.account_type,
          currency: formValue.currency,
          institution_name: formValue.institution_name,
          initial_balance: formValue.initial_balance,
          icon: formValue.icon,
          color: formValue.color,
        });
        this.#showToast('updated', 'success');
      } else {
        await this.#accountsService.create({
          condominium_id: this.condominiumId(),
          name: formValue.name,
          account_type: formValue.account_type,
          currency: formValue.currency,
          institution_name: formValue.institution_name,
          initial_balance: formValue.initial_balance,
          icon: formValue.icon,
          color: formValue.color,
        });
        this.#showToast('created', 'success');
      }

      this.isOpenChange.emit(false);
      this.#resetForm();
    } catch (error) {
      console.error('Failed to save wallet:', error);
      this.#showToast('saveError', 'danger');
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
   * Returns the available account types for the select dropdown.
   */
  getAccountTypes(): AccountType[] {
    return ACCOUNT_TYPES;
  }

  // --- Private Methods ---

  #resetForm(): void {
    this.form.reset({
      name: '',
      account_type: 'bank',
      currency: '',
      institution_name: null,
      initial_balance: 0,
      icon: null,
      color: null,
    });
  }

  #markAllAsTouched(): void {
    Object.values(this.form.controls).forEach((control) => {
      control.markAsTouched();
      control.updateValueAndValidity();
    });
  }

  #showToast(key: string, color: string): void {
    this.#toast.present({
      message: this.#translocoService.translate(`financial.wallets.toast.${key}`),
      color,
      duration: 2000,
    });
  }
}
