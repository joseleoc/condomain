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
  ExpenseFormComponent,
  ExpenseFormValue,
} from '@shared/components/forms/expense-form/expense-form.component';
import { ExpensesService } from '@core/services/expenses/expenses.service';
import { Toast } from '@core/services/toast/toast';

@Component({
  selector: 'app-expense-form-modal',
  templateUrl: './expense-form-modal.component.html',
  styleUrls: ['./expense-form-modal.component.scss'],
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
    ExpenseFormComponent,
  ],
})
export class ExpenseFormModalComponent {
  // --- Dependencies ---
  private expensesService = inject(ExpensesService);
  private toast = inject(Toast);
  private translocoService = inject(TranslocoService);

  // --- Inputs ---
  isOpen = input<boolean>(false);
  condominiumId = input.required<string>();
  baseCurrency = input.required<string>();

  // --- Outputs ---
  isOpenChange = output<boolean>();
  formSubmit = output<ExpenseFormValue>();

  // --- ViewChild ---
  expenseForm = viewChild.required(ExpenseFormComponent);

  // --- Methods ---

  /**
   * Triggers the form submission inside the child form component.
   */
  submit(): void {
    this.expenseForm().submit();
  }

  /**
   * Handles form submission. Calls the service to create the expense.
   * On success: resets form, closes modal and shows success toast.
   * On error: keeps modal open and shows error toast.
   */
  async onFormSubmit(value: ExpenseFormValue): Promise<void> {
    try {
      await this.expensesService.createExpense({
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
      this.expenseForm().resetForm();

      // Emit the form value for parent components
      this.formSubmit.emit(value);

      // Close modal on success
      this.isOpenChange.emit(false);

      // Show success toast
      this.toast.present({
        message: this.translocoService.translate('financial.transactions.toast.expenseCreated'),
        color: 'success',
        duration: 2000,
      });
    } catch (error: any) {
      console.error('Failed to create expense:', error);

      // Show error toast with specific message for duplicate reference
      let errorMessage = this.translocoService.translate(
        'financial.transactions.toast.expenseCreateError',
      );

      if (error?.code === '23505' && error?.message?.includes('reference_unique_active')) {
        errorMessage = this.translocoService.translate(
          'financial.transactions.toast.duplicateReferenceNumber',
        );
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
