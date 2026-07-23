import { Component, input, output, viewChild } from '@angular/core';
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
import { TranslocoPipe } from '@jsverse/transloco';
import {
  IncomeFormComponent,
  IncomeFormValue,
} from '@shared/components/forms/income-form/income-form.component';

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
   * Handles form submission. Re-emits the value, then closes the modal.
   */
  onFormSubmit(value: IncomeFormValue): void {
    this.formSubmit.emit(value);
    this.isOpenChange.emit(false);
  }

  /**
   * Cancels the form and closes the modal.
   */
  cancel(): void {
    this.isOpenChange.emit(false);
  }
}
