import { inject, Injectable } from '@angular/core';
import { type Structure as TStructure } from '@app-types/structures';
import { LocalStructure } from '@features/create-condominium/create-condominium.types';
import { BehaviorSubject } from 'rxjs';
import { ToastController } from '@ionic/angular/standalone';
import { TranslocoService } from '@jsverse/transloco';

@Injectable({
  providedIn: 'root',
})
export class Structures {
  // --- Dependencies ---
  private toastController = inject(ToastController);
  private translocoService = inject(TranslocoService);
  // --- Properties ---
  structures$ = new BehaviorSubject<LocalStructure[]>([]);

  // --- Methods ---
  saveStructureLocally(structure: LocalStructure): boolean {
    const currentStructures = this.structures$.getValue();
    if (currentStructures.some((s) => s.name === structure.name)) {
      this.toastController
        .create({
          message: this.translocoService.translate(
            'condominium.createStructure.structureAlreadyExists',
            { name: structure.name },
          ),
          duration: 2000,
          color: 'warning',
          buttons: [
            {
              text: this.translocoService.translate('common.ok'),
              role: 'cancel',
            },
          ],
        })
        .then((toast) => toast.present());
      return false;
    }
    this.structures$.next([...currentStructures, structure]);
    return true;
  }
}
