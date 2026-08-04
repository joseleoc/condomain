import { Component, inject, input, output, viewChild } from '@angular/core';
import {
  IonModal,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonButtons,
  IonButton,
  IonContent,
  IonFooter,
} from '@ionic/angular/standalone';
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';
import {
  IncomeFormComponent,
  IncomeFormValue,
} from '@shared/components/forms/income-form/income-form.component';
import { IncomesService } from '@core/services/incomes/incomes.service';
import { Toast } from '@core/services/toast/toast';

@Component({
  selector: 'app-income-form-modal',
  templateUrl: './income-form-modal.component.html',
  styleUrls: ['./income-form-modal.component.scss'],
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
    TranslocoPipe,
    IncomeFormComponent,
  ],
})
export class IncomeFormModalComponent {
  // --- Dependencies ---
  private incomesService = inject(IncomesService);
  private toast = inject(Toast);
  private translocoService = inject(TranslocoService);

  // --- Inputs ---
  isOpen = input<boolean>(false);
  condominiumId = input.required<string>();
  baseCurrency = input.required<string>();

  // --- Outputs ---
  isOpenChange = output<boolean>();
  formSubmit = output<IncomeFormValue>();

  // --- ViewChild ---
  incomeForm = viewChild.required(IncomeFormComponent);

  // --- Methods ---

  /**
   * Triggers the form submission inside the child form component.
   */
  submit(): void {
    this.incomeForm().submit();
  }

  /**
   * Handles form submission. Calls the service to create the income.
   * On success: resets form, closes modal and shows success toast.
   * On error: keeps modal open and shows error toast.
   */
  async onFormSubmit(value: IncomeFormValue): Promise<void> {
    try {
      await this.incomesService.createIncome({
        condominium_id: this.condominiumId(),
        account_id: value.account_id,
        category_id: value.category_id,
        amount: value.amount,
        original_currency: value.original_currency,
        exchange_rate: value.exchange_rate,
        description: value.description,
        reference_number: value.reference_number,
        transaction_date: value.transaction_date,
      });

      // Reset form on success
      this.incomeForm().resetForm();

      // Emit the form value for parent components
      this.formSubmit.emit(value);

      // Close modal on success
      this.isOpenChange.emit(false);

      // Show success toast
      this.toast.present({
        message: this.translocoService.translate('home.incomeCreated'),
        color: 'success',
        duration: 2000,
      });
    } catch (error: any) {
      console.error('Failed to create income:', error);

      // Show error toast with specific message for duplicate reference
      let errorMessage = this.translocoService.translate('home.incomeCreateError');

      if (error?.code === '23505' && error?.message?.includes('reference_unique_active')) {
        errorMessage = this.translocoService.translate('home.duplicateReferenceNumber');
      }

      this.toast.present({
        message: errorMessage,
        color: 'danger',
        duration: 3000,
      });

      // Don't close modal on error - let user fix the issue
      // Don't reset form on error - preserve user input
    }
  }

  /**
   * Cancels the form and closes the modal.
   */
  cancel(): void {
    this.isOpenChange.emit(false);
  }
}
