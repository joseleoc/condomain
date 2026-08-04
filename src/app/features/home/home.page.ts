import { Component, inject, signal } from '@angular/core';
import { Condominium } from '@core/services/condominium/condominium';
import { toSignal } from '@angular/core/rxjs-interop';
import { NewCondoAnimatedBtnComponent } from '@shared/components/new-condo-animated-btn/new-condo-animated-btn.component';
import { IncomeFormModalComponent } from '@shared/components/modals/income-form-modal/income-form-modal.component';
import { IncomeListComponent } from '@shared/components/income-list/income-list.component';
import { IonButton, IonIcon } from '@ionic/angular/standalone';
import { TranslocoPipe } from '@jsverse/transloco';

@Component({
  selector: 'app-home',
  templateUrl: 'home.page.html',
  styleUrls: ['home.page.scss'],
  imports: [
    NewCondoAnimatedBtnComponent,
    IncomeFormModalComponent,
    IncomeListComponent,
    IonButton,
    IonIcon,
    TranslocoPipe,
  ],
})
export class HomePage {
  private condominiumService = inject(Condominium);

  // --- Properties ---
  activeCondominium = toSignal(this.condominiumService.activeCondominium$);
  isIncomeModalOpen = signal(false);
}
