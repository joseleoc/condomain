import { Component, computed, inject, signal, viewChild } from '@angular/core';
import {
  TranslocoModule,
  TranslocoPipe,
  TranslocoService,
} from '@jsverse/transloco';
import {
  IonContent,
  IonHeader,
  IonToolbar,
  IonButtons,
  IonBackButton,
  IonProgressBar,
  IonText,
  IonTitle,
  IonButton,
  IonFooter,
  IonSpinner,
  ToastController,
} from '@ionic/angular/standalone';
import { Condominium } from '@core/services/condominium/condominium';
import { CreateCondominiumData } from '@core/services/condominium/condominium.types';
import { CreateCondominiumFormComponent } from './components/create-condominium-form/create-condominium-form.component';
import { Location } from '@angular/common';
import { Condominium as TCondominium } from '@app-types/condominium';
import { MAX_STEPS } from './create-condominium.constants';
import { Wizard } from './services/wizard/wizard';
import { toSignal } from '@angular/core/rxjs-interop';
import { Step1Component } from './components/step-1/step-1.component';

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
    IonButton,
    IonFooter,
    IonSpinner,
    Step1Component,
  ],
})
export class CreateCondominiumPage {
  // --- Dependencies ---
  private location = inject(Location);
  private wizardService = inject(Wizard);

  // --- Properties ---
  step = this.wizardService.step;
  loading = this.wizardService.loading;
  progressPercentage = this.wizardService.progressPercentage;
  stepLabel = signal('condominium.createForm.newCondominium');

  // --- ViewChild ---
  private step1Component = viewChild(Step1Component);

  // --- Methods ---

  goBack() {
    if (this.step() > 1) {
      this.step.update((value) => value - 1);
      return;
    }
    this.location.back();
  }

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
