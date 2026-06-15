import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { TranslocoModule, TranslocoPipe } from '@jsverse/transloco';
import {
  IonContent,
  IonHeader,
  IonToolbar,
  IonButtons,
  IonBackButton,
  IonCard,
  IonCardContent,
  IonCardHeader,
  ToastController,
  IonProgressBar,
  IonText,
  IonTitle,
  IonButton,
} from '@ionic/angular/standalone';
import { Condominium } from '@core/services/condominium/condominium';
import { CreateCondominiumData } from '@core/services/condominium/condominium.types';
import { Router } from '@angular/router';
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
    IonCard,
    IonCardContent,
    IonCardHeader,
    IonProgressBar,
    TranslocoPipe,
    IonText,
    IonTitle,
    IonButton,
  ],
})
export class CreateCondominiumPage {
  // --- Dependencies ---

  private condominiumService = inject(Condominium);
  private router = inject(Router);
  private location = inject(Location);
  private toastController = inject(ToastController);

  // --- Properties ---
  /** Progress percentage for the creation process from 0 to 1 */
  step = signal(1);
  progressPercentage = computed(() => this.step() / MAX_STEPS);
  stepLabel = signal('condominium.createForm.newCondominium');

  // --- Methods ---
  async createCondominium(data: CreateCondominiumData) {
    try {
      const res = await this.condominiumService.createCondominium(data);
    } catch (error) {
      throw error;
    }
  }

  goBack() {
    this.location.back();
  }
}
