import {
  Component,
  inject,
  OnInit,
  signal,
  viewChild,
} from '@angular/core';
import { StructuresListEmptyComponent } from '../structures-list-empty/structures-list-empty.component';
import {
  IonModal,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonButtons,
  IonButton,
  IonContent,
  IonFooter,
} from '@ionic/angular/standalone';
import { TranslocoPipe } from '@jsverse/transloco';
import { StructureFormComponent } from '@shared/components/structure-form/structure-form.component';
import { toSignal } from '@angular/core/rxjs-interop';
import { StructuresListComponent } from '../structures-list/structures-list.component';
import { Wizard } from '@features/create-condominium/services/wizard/wizard';
import { LocalStructure } from '@features/create-condominium/create-condominium.types';
import { TelemetryService } from '@core/services/telemetry';
import { TelemetryEvents } from '@core/services/telemetry/telemetry.types';
import { StructureFormValue } from '@shared/components/property-form/form.types';

@Component({
  selector: 'app-simple-creation-process',
  templateUrl: './simple-creation-process.component.html',
  styleUrls: ['./simple-creation-process.component.scss'],
  imports: [
    StructuresListEmptyComponent,
    IonModal,
    IonHeader,
    IonToolbar,
    IonTitle,
    IonButtons,
    IonButton,
    TranslocoPipe,
    IonContent,
    StructureFormComponent,
    IonFooter,
    StructuresListComponent,
  ],
})
export class SimpleCreationProcessComponent implements OnInit {
  // --- Dependencies ---
  private wizardService = inject(Wizard);
  private telemetry = inject(TelemetryService);
  // --- Components ---
  structureFormComponent = viewChild(StructureFormComponent);
  // --- Properties ---
  isOpenAddStructureModal = signal(false);
  structures = toSignal(this.wizardService.structures$);

  constructor() {}

  ngOnInit() {}

  openAddStructureModal() {
    this.isOpenAddStructureModal.set(true);
  }

  closeAddStructureModal() {
    this.isOpenAddStructureModal.set(false);
  }

  submitAddStructureForm() {
    const formComponent = this.structureFormComponent();
    if (formComponent) {
      const values = formComponent.submit();
      if (values) {
        const success = this.wizardService.saveStructureLocally({
          ...values,
          properties: [],
        });
        if (success) {
          try {
            this.telemetry.track(TelemetryEvents.STRUCTURE_ADDED, {
              mode: 'simple',
              structures_count: this.wizardService.structures$.getValue().length,
            });
          } catch {
            // Telemetry must never break wizard flow
          }
          this.closeAddStructureModal();
        }
      }
    }
  }

  editStructure(structure: LocalStructure) {
    this.wizardService.selectedStructure.set(structure);
    this.openAddStructureModal();
    try {
      this.telemetry.track(TelemetryEvents.STRUCTURE_EDITED, {
        mode: 'simple',
        structures_count: this.wizardService.structures$.getValue().length,
      });
    } catch {
      // Telemetry must never break wizard flow
    }
  }

  clearSelectedStructure() {
    this.wizardService.selectedStructure.set(null);
  }

  /**
   * Maps the wizard's selectedStructure to the form's initialData format.
   */
  getStructureInitialData() {
    const selected = this.wizardService.selectedStructure();
    if (!selected) return null;
    return {
      name: selected.name,
      description: selected.description,
    };
  }
}
