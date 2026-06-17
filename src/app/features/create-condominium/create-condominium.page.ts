import { Component, computed, inject, viewChild } from '@angular/core';
import { TranslocoModule, TranslocoPipe } from '@jsverse/transloco';
import {
  IonContent,
  IonHeader,
  IonToolbar,
  IonProgressBar,
  IonText,
  IonTitle,
} from '@ionic/angular/standalone';
import { Wizard } from './services/wizard/wizard';
import { Step1Component } from './components/step-1/step-1.component';
import { Step2Component } from './components/step-2/step-2.component';
import { WizardFooterComponent } from './components/wizard-footer/wizard-footer.component';
import { Step3Component } from './components/step-3/step-3.component';

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
    IonProgressBar,
    TranslocoPipe,
    IonText,
    IonTitle,
    Step1Component,
    Step2Component,
    WizardFooterComponent,
    Step3Component,
  ],
})
export class CreateCondominiumPage {
  // --- Dependencies ---
  private wizardService = inject(Wizard);

  // --- Properties ---
  step = this.wizardService.step;
  loading = this.wizardService.loading;
  progressPercentage = this.wizardService.progressPercentage;
  stepLabel = computed(
    () => `condominium.wizard.step${this.step()}Description`,
  );

  // --- ViewChild ---
  private step1Component = viewChild(Step1Component);

  // --- Methods ---
}
