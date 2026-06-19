import { Component, computed, inject } from '@angular/core';
import { TranslocoModule, TranslocoPipe, TranslocoService } from '@jsverse/transloco';
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
import { AlertController } from '@ionic/angular/standalone';

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
  private alertController = inject(AlertController);
  private translocoService = inject(TranslocoService);

  // --- Properties ---
  step = this.wizardService.step;
  loading = this.wizardService.loading;
  progressPercentage = this.wizardService.progressPercentage;
  stepLabel = computed(
    () => `condominium.wizard.step${this.step()}Description`,
  );

  constructor() {
    this.checkSavedWizard();
  }

  private async checkSavedWizard() {
    if (!this.wizardService.hasSavedWizard()) return;

    const alert = await this.alertController.create({
      header: this.translocoService.translate(
        'condominium.wizard.unsavedProgressTitle',
      ),
      message: this.translocoService.translate(
        'condominium.wizard.unsavedProgressMessage',
      ),
      buttons: [
        {
          text: this.translocoService.translate(
            'condominium.wizard.startFresh',
          ),
          role: 'cancel',
          handler: () => {
            this.wizardService.clearStorage();
          },
        },
        {
          text: this.translocoService.translate(
            'condominium.wizard.continueProgress',
          ),
          role: 'confirm',
          handler: () => {
            this.wizardService.restoreFromStorage();
          },
        },
      ],
    });
    await alert.present();
  }
}
