import { Component, inject, signal, viewChild } from '@angular/core';
import { TranslocoModule, TranslocoPipe } from '@jsverse/transloco';
import {
  IonContent,
  IonHeader,
  IonToolbar,
  IonButtons,
  IonBackButton,
  IonProgressBar,
  IonText,
  IonTitle,
} from '@ionic/angular/standalone';
import { MAX_STEPS } from './create-condominium.constants';
import { Wizard } from './services/wizard/wizard';
import { Step1Component } from './components/step-1/step-1.component';
import { Step2Component } from './components/step-2/step-2.component';
import { WizardFooterComponent } from './components/wizard-footer/wizard-footer.component';

@Component({
  selector: 'app-create-condominium',
  templateUrl: './create-condominium.page.html',
  styleUrls: ['./create-condominium.page.scss'],
  standalone: true,
  imports: [
    TranslocoModule,
    IonContent,
    IonHeader,
    IonToolbar,
    IonButtons,
    IonBackButton,
    IonProgressBar,
    TranslocoPipe,
    IonText,
    IonTitle,
    Step1Component,
    Step2Component,
    WizardFooterComponent,
  ],
})
export class CreateCondominiumPage {
  // --- Dependencies ---
  private wizardService = inject(Wizard);

  // --- Properties ---
  step = this.wizardService.step;
  loading = this.wizardService.loading;
  progressPercentage = this.wizardService.progressPercentage;
  stepLabel = signal('condominium.createForm.newCondominium');

  // --- ViewChild ---
  private step1Component = viewChild(Step1Component);

  // --- Methods ---
  async handleNextStep() {
    let canContinue = false;

    if (this.step() === 1) {
      canContinue = (await this.step1Component()?.submitForm()) || false;
    }

    if (canContinue && this.step() < MAX_STEPS) {
      this.step.update((value) => value + 1);
    }
  }
}
