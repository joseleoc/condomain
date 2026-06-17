import { Component, computed, inject, output } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';
import { AlertController } from '@ionic/angular/standalone';
import {
  IonList,
  IonItem,
  IonIcon,
  IonButton,
} from '@ionic/angular/standalone';
import { Wizard } from '@features/create-condominium/services/wizard/wizard';

@Component({
  selector: 'app-structures-list',
  templateUrl: './structures-list.component.html',
  styleUrls: ['./structures-list.component.scss'],
  imports: [TranslocoPipe, IonList, IonItem, IonIcon, IonButton, TranslocoPipe],
})
export class StructuresListComponent {
  // --- Dependencies ---
  private wizardService = inject(Wizard);
  private alertController = inject(AlertController);
  private translocoService = inject(TranslocoService);

  // --- Outputs ---
  addStructure = output<void>();

  // --- Properties ---
  structures = computed(toSignal(this.wizardService.structures$));

  // --- Private Methods ---
  private confirmDeleteStructure(structureName: string) {
    const currentStructures = this.wizardService.structures$.getValue();
    const updatedStructures = currentStructures.filter(
      (s) => s.name !== structureName,
    );
    this.wizardService.structures$.next(updatedStructures);
  }

  // --- Methods ---
  deleteStructure(structureName: string) {
    this.alertController
      .create({
        message: this.translocoService.translate(
          'condominium.createStructure.deleteStructureAlertMessage',
          { name: structureName },
        ),
        buttons: [
          {
            text: this.translocoService.translate('common.cancel'),
            role: 'cancel',
          },
          {
            text: this.translocoService.translate('common.delete'),
            role: 'destructive',
            handler: () => {
              this.confirmDeleteStructure(structureName);
            },
          },
        ],
      })
      .then((alert) => alert.present());
  }
}
