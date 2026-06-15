import { Component, computed, inject, signal, viewChild } from '@angular/core';
import {
  TranslocoModule,
  TranslocoPipe,
  TranslocoService,
} from '@jsverse/transloco';
import {
  IonContent,
  IonHeader,
  IonToolbar,
  IonButtons,
  IonBackButton,
  IonProgressBar,
  IonText,
  IonTitle,
  IonButton,
  IonFooter,
  IonSpinner,
  ToastController,
} from '@ionic/angular/standalone';
import { Condominium } from '@core/services/condominium/condominium';
import { CreateCondominiumData } from '@core/services/condominium/condominium.types';
import { CreateCondominiumFormComponent } from './components/create-condominium-form/create-condominium-form.component';
import { Location } from '@angular/common';

const MAX_STEPS = 4;

@Component({
  selector: 'app-create-condominium',
  templateUrl: './create-condominium.page.html',
  styleUrls: ['./create-condominium.page.scss'],
  standalone: true,
  imports: [
    CreateCondominiumFormComponent,
    TranslocoModule,
    IonContent,
    IonHeader,
    IonToolbar,
    IonButtons,
    IonBackButton,
    IonProgressBar,
    TranslocoPipe,
    IonText,
    IonTitle,
    IonButton,
    IonFooter,
    IonSpinner,
  ],
})
export class CreateCondominiumPage {
  // --- Dependencies ---
  private condominiumService = inject(Condominium);
  private location = inject(Location);
  private toastController = inject(ToastController);
  private translocoService = inject(TranslocoService);

  // --- Components ---
  createCondominiumForm = viewChild(CreateCondominiumFormComponent);

  // --- Properties ---
  /** Progress percentage for the creation process from 0 to 1 */
  step = signal(1);
  progressPercentage = computed(() => this.step() / MAX_STEPS);
  stepLabel = signal('condominium.createForm.newCondominium');
  loading = signal(false);

  // --- Methods ---
  async createCondominium(data: CreateCondominiumData) {
    try {
      this.loading.set(true);
      const res = await this.condominiumService.createCondominium(data);
      if (res) {
        const toast = await this.toastController.create({
          message: this.translocoService.translate(
            'condominium.createForm.createSuccessfully',
          ),
          duration: 2000,
        });
        toast.present();
      }
    } catch (error) {
      const toast = await this.toastController.create({
        message: this.translocoService.translate(
          'condominium.createForm.createError',
        ),
        duration: 2000,
      });
      toast.present();
      throw error;
    } finally {
      this.loading.set(false);
    }
  }

  goBack() {
    if (this.step() > 1) {
      this.step.update((value) => value - 1);
      return;
    }
    this.location.back();
  }

  async handleNextStep() {
    let canContinue = false;

    if (this.step() === 1) {
      const formData = this.createCondominiumForm()?.onSubmit();
      if (formData) {
        await this.createCondominium(formData);
        canContinue = true;
      }
    }

    if (canContinue && this.step() < MAX_STEPS) {
      this.step.update((value) => value + 1);
    }
  }
}
