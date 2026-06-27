import { DecimalPipe } from '@angular/common';
import { Component, inject, computed, input, output } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import {
  CreatePropertyFormData,
  LocalStructure,
  PropertyWithStructure,
} from '@features/create-condominium/create-condominium.types';
import { Wizard } from '@features/create-condominium/services/wizard/wizard';
import {
  IonAccordionGroup,
  IonAccordion,
  IonItem,
  IonIcon,
  IonList,
  IonBadge,
} from '@ionic/angular/standalone';
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';
import { AlertController } from '@ionic/angular/standalone';
import { TelemetryService } from '@core/services/telemetry';
import { TelemetryEvents } from '@core/services/telemetry/telemetry.types';

@Component({
  selector: 'app-structures-properties-accordion',
  templateUrl: './structures-properties-accordion.component.html',
  styleUrls: ['./structures-properties-accordion.component.scss'],
  imports: [
    IonAccordionGroup,
    IonAccordion,
    IonItem,
    IonIcon,
    IonList,
    TranslocoPipe,
    IonBadge,
    DecimalPipe,
  ],
})
export class StructuresPropertiesAccordionComponent {
  // --- Dependencies ---
  private wizardService = inject(Wizard);
  private alertController = inject(AlertController);
  private translocoService = inject(TranslocoService);
  private telemetry = inject(TelemetryService);

  // --- Inputs ---
  structureSelected = input<string | null>(null);

  // --- Outputs ---
  selectProperty = output<PropertyWithStructure>();

  // --- Properties ---
  structures = toSignal(this.wizardService.structures$);
  totalPercentage = computed(
    () =>
      this.structures()?.reduce(
        (acc, structure) =>
          acc +
          structure.properties.reduce(
            (propAcc, property) => propAcc + property.fee,
            0,
          ),
        0,
      ) ?? 0,
  );

  calculateStructurePercentage(structure: LocalStructure): number {
    return (
      structure.properties.reduce((acc, property) => acc + property.fee, 0) ?? 0
    );
  }

  emitSelectProperty(property: CreatePropertyFormData, structureName: string) {
    this.selectProperty.emit({ ...property, structureName });
  }

  async deleteProperty(
    event: Event,
    property: CreatePropertyFormData,
    structureName: string,
  ) {
    event.stopPropagation();
    const alert = await this.alertController.create({
      header: this.translocoService.translate(
        'condominium.createProperty.confirmDeleteTitle',
      ),
      message: this.translocoService.translate(
        'condominium.createProperty.confirmDeleteMessage',
        { number: property.number },
      ),
      buttons: [
        {
          text: this.translocoService.translate('common.cancel'),
          role: 'cancel',
        },
        {
          text: this.translocoService.translate('common.delete'),
          cssClass: 'text-danger',
          role: 'destructive',
          handler: () => {
            this.wizardService.deletePropertyFromStructure(
              structureName,
              property.number,
            );
            try {
              this.telemetry.track(TelemetryEvents.PROPERTY_DELETED, {
                structure_name: structureName,
              });
            } catch {
              // Telemetry must never break wizard flow
            }
          },
        },
      ],
    });
    await alert.present();
  }
}
