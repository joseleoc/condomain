import { Component, inject, OnDestroy, OnInit, signal } from '@angular/core';
import { CreationProcessSelectorComponent } from '../creation-process-selector/creation-process-selector.component';
import { CreateCondominiumProcessOptions } from '@features/create-condominium/create-condominium.types';
import { SimpleCreationProcessComponent } from '../simple-creation-process/simple-creation-process.component';
import { MassiveCreationProcessComponent } from '../massive-creation-process/massive-creation-process.component';
import { AiCreationProcessComponent } from '../ai-creation-process/ai-creation-process.component';
import { Subscription } from 'rxjs';
import { Wizard } from '@features/create-condominium/services/wizard/wizard';
import { Structures } from '@features/create-condominium/services/structures/structures';
import { TranslocoService } from '@jsverse/transloco';
import { Toast } from '@core/services/toast/toast';

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
  private structuresService = inject(Structures);
  private toast = inject(Toast);
  private translocoService = inject(TranslocoService);

  // --- Properties ---
  private nextSubscription!: Subscription;
  private showMinStructuresToast = false;
  creationProcessSelected = signal<CreateCondominiumProcessOptions | null>(
    null,
  );

  // --- Lifecycle Hooks ---
  ngOnInit() {
    this.nextSubscription = this.wizardService.nextStep$.subscribe(
      async (currentStep) => {
        const structures = this.structuresService.structures$.getValue();
        if (structures.length > 0 && this.creationProcessSelected() != null) {
          this.wizardService.step.set(3);
        } else {
          if (!this.showMinStructuresToast) {
            // Prevents showing the toast when we first enter the step, since at that moment there are no structures but we don't want to show the toast until the user tries to go to the next step without adding any structure
            this.showMinStructuresToast = true;
            return;
          }

          this.toast.present({
            message: this.translocoService.translate(
              'condominium.structuresList.addAtLeastOneStructure',
            ),
            dismissButton: true,
          });
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
