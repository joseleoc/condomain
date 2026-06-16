import { computed, inject, Injectable, signal } from '@angular/core';
import { Condominium } from '@core/services/condominium/condominium';
import { ToastController } from '@ionic/angular/standalone';
import { TranslocoService } from '@jsverse/transloco';
import { Condominium as TCondominium } from '@app-types/condominium';
import { CreateCondominiumData } from '@core/services/condominium/condominium.types';
import { MAX_STEPS } from '@features/create-condominium/create-condominium.constants';
import { Location } from '@angular/common';
import { Subject } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class Wizard {
  // --- Dependencies ---
  private location = inject(Location);
  private condominiumService = inject(Condominium);
  private toastController = inject(ToastController);
  private translocoService = inject(TranslocoService);

  // --- Private Properties ---
  private nextStepSource = new Subject<void>();
  private backStepSource = new Subject<void>();

  // --- Properties ---
  nextStep$ = this.nextStepSource.asObservable();
  backStep$ = this.backStepSource.asObservable();

  step = signal(2);
  loading = signal(false);
  createdCondominium = signal<TCondominium | null>(null);
  updatedFileAvatar = signal<File | null>(null);
  progressPercentage = computed(() => this.step() / MAX_STEPS);
  buttonLabel = signal('common.next');
  backLabel = signal('common.back');

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

  triggerNextStep() {
    if (!this.loading()) {
      this.nextStepSource.next();
    }
  }

  triggerBackStep() {
    if (!this.loading()) {
      this.backStepSource.next();
    }
  }

  goBack() {
    if (this.step() > 1) {
      this.step.update((value) => value - 1);
      return;
    }
    this.location.back();
  }
}
