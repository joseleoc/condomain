import { inject, Injectable, signal } from '@angular/core';
import { Condominium } from '@core/services/condominium/condominium';
import { ToastController } from '@ionic/angular/standalone';
import { TranslocoService } from '@jsverse/transloco';
import { Condominium as TCondominium } from '@app-types/condominium';
import { CreateCondominiumData } from '@core/services/condominium/condominium.types';
import { MAX_STEPS } from '@features/create-condominium/create-condominium.constants';

@Injectable({
  providedIn: 'root',
})
export class Wizard {
  // --- Dependencies ---
  private condominiumService = inject(Condominium);
  private toastController = inject(ToastController);
  private translocoService = inject(TranslocoService);

  // --- Properties ---
  step = signal(1);
  loading = signal(false);
  createdCondominium = signal<TCondominium | null>(null);
  updatedFileAvatar = signal<File | null>(null);
  progressPercentage = signal(() => this.step() / MAX_STEPS);

  // --- Methods ---

  async createCondominium(data: CreateCondominiumData) {
    try {
      this.loading.set(true);
      const res = await this.condominiumService.createCondominium(data);
      if (res) {
        this.createdCondominium.set(res);
        this.updatedFileAvatar.set(data.avatar || null);
        const toast = await this.toastController.create({
          message: this.translocoService.translate(
            'condominium.createForm.createSuccessfully',
          ),
          buttons: [
            {
              text: this.translocoService.translate('common.dismiss'),
              role: 'cancel',
            },
          ],
          duration: 2000,
        });
        toast.present();
      }
    } catch (error) {
      const toast = await this.toastController.create({
        message: this.translocoService.translate(
          'condominium.createForm.createError',
        ),
        buttons: [
          {
            text: this.translocoService.translate('common.dismiss'),
            role: 'cancel',
          },
        ],
        duration: 2000,
      });
      toast.present();
      throw error;
    } finally {
      this.loading.set(false);
    }
  }
}
