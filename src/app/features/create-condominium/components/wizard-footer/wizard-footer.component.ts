import {
  Component,
  computed,
  inject,
  input,
  OnInit,
  output,
} from '@angular/core';
import { Wizard } from '@features/create-condominium/services/wizard/wizard';
import {
  IonFooter,
  IonToolbar,
  IonButtons,
  IonButton,
  IonSpinner,
} from '@ionic/angular/standalone';
import { TranslocoPipe } from '@jsverse/transloco';

@Component({
  selector: 'app-wizard-footer',
  templateUrl: './wizard-footer.component.html',
  styleUrls: ['./wizard-footer.component.scss'],
  imports: [
    IonFooter,
    IonToolbar,
    IonButtons,
    IonButton,
    IonSpinner,
    TranslocoPipe,
  ],
})
export class WizardFooterComponent {
  // --- Dependencies ---
  private wizardService = inject(Wizard);

  // --- Inputs ---

  // --- Properties ---
  loading = computed(() => this.wizardService.loading());
  buttonLabel = computed(() => this.wizardService.buttonLabel());
  backLabel = computed(() => this.wizardService.backLabel());

  triggerClick() {
    this.wizardService.triggerNextStep();
  }

  triggerBack() {
    this.wizardService.triggerBackStep();
    this.wizardService.goBack();
  }
}
