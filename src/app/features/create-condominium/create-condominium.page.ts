import { Component, computed, inject, OnDestroy, signal } from '@angular/core';
import { TranslocoModule, TranslocoPipe, TranslocoService } from '@jsverse/transloco';
import { firstValueFrom } from 'rxjs';
import {
  IonContent,
  IonHeader,
  IonToolbar,
  IonProgressBar,
  IonText,
  IonTitle,
  IonModal,
  IonButtons,
  IonButton,
  IonIcon,
} from '@ionic/angular/standalone';
import { trigger, state, transition, style, animate } from '@angular/animations';
import { Wizard } from './services/wizard/wizard';
import { Step1Component } from './components/step-1/step-1.component';
import { Step2Component } from './components/step-2/step-2.component';
import { WizardFooterComponent } from './components/wizard-footer/wizard-footer.component';
import { Step3Component } from './components/step-3/step-3.component';
import { AlertController } from '@ionic/angular/standalone';
import { TelemetryService } from '@core/services/telemetry';
import { TelemetryEvents } from '@core/services/telemetry/telemetry.types';

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
    IonModal,
    IonButtons,
    IonButton,
    IonIcon,
    Step1Component,
    Step2Component,
    WizardFooterComponent,
    Step3Component,
  ],
  animations: [
    trigger('helpPulse', [
      state('void', style({ transform: 'scale(1)' })),
      state('*', style({ transform: 'scale(1)' })),
      transition('* => *', [
        animate('300ms ease-in-out', style({ transform: 'scale(1.15)', opacity: 0.7 })),
        animate('300ms ease-in-out', style({ transform: 'scale(1)', opacity: 1 })),
      ]),
    ]),
  ],
})
export class CreateCondominiumPage implements OnDestroy {
  // --- Dependencies ---
  wizardService = inject(Wizard);
  private alertController = inject(AlertController);
  private translocoService = inject(TranslocoService);
  private telemetry = inject(TelemetryService);

  // --- Properties ---
  step = this.wizardService.step;
  loading = this.wizardService.loading;
  progressPercentage = this.wizardService.progressPercentage;
  stepLabel = computed(
    () => `condominium.wizard.step${this.step()}Description`,
  );
  isHelpModalOpen = signal(false);

  helpTitle = computed(() => {
    if (this.step() === 2 && this.wizardService.creationProcessSelected() === null) {
      return 'condominium.wizard.help.processSelectorTitle';
    }
    return `condominium.wizard.help.step${this.step()}Title`;
  });
  helpBody = computed(() => {
    if (this.step() === 2 && this.wizardService.creationProcessSelected() === null) {
      return 'condominium.wizard.help.processSelectorBody';
    }
    return `condominium.wizard.help.step${this.step()}Body`;
  });

  constructor() {
    this.trackWizardStarted();
    this.checkSavedWizard();
  }

  ngOnDestroy(): void {
    this.trackWizardAbandoned();
  }

  private trackWizardStarted(): void {
    try {
      this.telemetry.track(TelemetryEvents.WIZARD_STARTED, {
        step: 1,
      });
    } catch {
      // Telemetry must never block page load
    }
  }

  private trackWizardAbandoned(): void {
    try {
      this.telemetry.track(TelemetryEvents.WIZARD_ABANDONED, {
        step: this.step(),
      });
    } catch {
      // Telemetry must never block navigation
    }
  }

  private async checkSavedWizard() {
    if (!this.wizardService.hasSavedWizard()) return;

    const [header, message, startFresh, continueProgress] = await Promise.all([
      firstValueFrom(
        this.translocoService.selectTranslate(
          'condominium.wizard.unsavedProgressTitle',
        ),
      ),
      firstValueFrom(
        this.translocoService.selectTranslate(
          'condominium.wizard.unsavedProgressMessage',
        ),
      ),
      firstValueFrom(
        this.translocoService.selectTranslate(
          'condominium.wizard.startFresh',
        ),
      ),
      firstValueFrom(
        this.translocoService.selectTranslate(
          'condominium.wizard.continueProgress',
        ),
      ),
    ]);

    const alert = await this.alertController.create({
      header,
      message,
      backdropDismiss: false,
      buttons: [
        {
          text: startFresh,
          role: 'cancel',
          handler: () => {
            this.wizardService.clearStorage();
          },
        },
        {
          text: continueProgress,
          role: 'confirm',
          handler: () => {
            this.wizardService.restoreFromStorage();
          },
        },
      ],
    });
    await alert.present();
  }

  openHelpModal() {
    this.isHelpModalOpen.set(true);
  }

  closeHelpModal() {
    this.isHelpModalOpen.set(false);
  }
}
