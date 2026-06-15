import { Component, inject, OnInit } from '@angular/core';
import { CreateCondominiumFormComponent } from '../components/create-condominium-form/create-condominium-form.component';
import { TranslocoModule } from '@jsverse/transloco';
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
} from '@ionic/angular/standalone';
import { Condominium } from '@core/services/condominium/condominium';
import { CreateCondominiumData } from '@core/services/condominium/condominium.types';
import { Router } from '@angular/router';

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
  ],
})
export class CreateCondominiumPage {
  // --- Dependencies ---
  private condominiumService = inject(Condominium);
  private router = inject(Router);

  private toastController = inject(ToastController);
  // --- Methods ---
  async createCondominium(data: CreateCondominiumData) {
    try {
      const res = await this.condominiumService.createCondominium(data);
      if (res) {
        this.router.navigate(['/condominium-hub']);
      }
    } catch (error) {
      throw error;
    }
  }
}
