import { Component, inject, signal } from '@angular/core';
import { Condominium } from '@core/services/condominium/condominium';
import { IncomesService } from '@core/services/incomes/incomes.service';
import { toSignal } from '@angular/core/rxjs-interop';
import { NewCondoAnimatedBtnComponent } from '@shared/components/new-condo-animated-btn/new-condo-animated-btn.component';
import { IncomeFormModalComponent } from '@shared/components/modals/income-form-modal/income-form-modal.component';
import { IonButton, IonIcon } from '@ionic/angular/standalone';
import { TranslocoPipe } from '@jsverse/transloco';
import { IncomeFormValue } from '@shared/components/forms/income-form/income-form.component';

@Component({
  selector: 'app-home',
  templateUrl: 'home.page.html',
  styleUrls: ['home.page.scss'],
  imports: [NewCondoAnimatedBtnComponent, IncomeFormModalComponent, IonButton, IonIcon, TranslocoPipe],
})
export class HomePage {
  private condominiumService = inject(Condominium);
  private incomesService = inject(IncomesService);

  // --- Properties ---
  activeCondominium = toSignal(this.condominiumService.activeCondominium$);
  isIncomeModalOpen = signal(false);

  // --- Methods ---

  /**
   * Handles income form submission.
   */
  async onIncomeFormSubmit(value: IncomeFormValue): Promise<void> {
    const condominium = this.activeCondominium();
    if (!condominium) {
      console.error('No active condominium');
      return;
    }

    try {
      await this.incomesService.createIncome({
        condominium_id: condominium.id,
        account_id: value.account_id,
        category_id: value.category_id,
        amount: value.amount,
        original_currency: value.original_currency,
        exchange_rate: value.exchange_rate,
        description: value.description,
        reference_number: value.reference_number,
        transaction_date: value.transaction_date,
      });
      
      this.isIncomeModalOpen.set(false);
    } catch (error) {
      console.error('Failed to create income:', error);
    }
  }
}
