import { Component, inject, OnDestroy, OnInit } from '@angular/core';
import { CreationProcessSelectorComponent } from '../creation-process-selector/creation-process-selector.component';
import { CreateCondominiumProcessOptions } from '@features/create-condominium/create-condominium.types';
import { SimpleCreationProcessComponent } from '../simple-creation-process/simple-creation-process.component';
import { MassiveCreationProcessComponent } from '../massive-creation-process/massive-creation-process.component';
import { AiCreationProcessComponent } from '../ai-creation-process/ai-creation-process.component';
import { Subscription } from 'rxjs';
import { Wizard } from '@features/create-condominium/services/wizard/wizard';
import { TranslocoService } from '@jsverse/transloco';
import { Toast } from '@core/services/toast/toast';
import { TelemetryService } from '@core/services/telemetry';
import { TelemetryEvents } from '@core/services/telemetry/telemetry.types';

@Component({
  selector: 'app-step-2',
  templateUrl: './step-2.component.html',
  styleUrls: ['./step-2.component.scss'],
  imports: [
    CreationProcessSelectorComponent,
    SimpleCreationProcessComponent,
    MassiveCreationProcessComponent,
    AiCreationProcessComponent,
  ],
})
export class Step2Component implements OnInit, OnDestroy {
  // --- Dependencies ---
  private wizardService = inject(Wizard);
  private toast = inject(Toast);
  private translocoService = inject(TranslocoService);
  private telemetry = inject(TelemetryService);

  // --- Properties ---
  private nextSubscription!: Subscription;
  private showMinStructuresToast = false;
  creationProcessSelected = this.wizardService.creationProcessSelected;

  // --- Lifecycle Hooks ---
  ngOnInit() {
    this.nextSubscription = this.wizardService.nextStep$.subscribe(
      async () => {
        if (this.creationProcessSelected() === 'massive') return;

        const structures = this.wizardService.structures$.getValue();
        if (structures.length > 0 && this.creationProcessSelected() != null) {
          this.wizardService.setStep(3);
        } else {
          if (!this.showMinStructuresToast) {
            this.showMinStructuresToast = true;
            return;
          }

          this.toast.present({
            message: this.translocoService.translate(
              'condominium.structuresList.addAtLeastOneStructure',
            ),
            dismissButton: true,
          });

          try {
            this.telemetry.track(TelemetryEvents.WIZARD_ERROR, {
              error_type: 'validation',
              step: 2,
              message: 'No structures and no mode selected',
            });
          } catch {
            // Telemetry must never break wizard flow
          }
        }
      },
    );
  }
  ngOnDestroy(): void {
    if (this.nextSubscription) {
      this.nextSubscription.unsubscribe();
    }
  }
}
