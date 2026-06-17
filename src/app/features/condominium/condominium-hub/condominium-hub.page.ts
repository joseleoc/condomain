import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  IonContent,
  IonHeader,
  IonToolbar,
  IonButtons,
  IonBackButton,
  IonButton,
  IonIcon,
} from '@ionic/angular/standalone';
import { TranslocoModule } from '@jsverse/transloco';
import { Condominium } from '@core/services/condominium/condominium';
import { toSignal } from '@angular/core/rxjs-interop';
import { AvatarComponent } from '@shared/components/avatar/avatar.component';

@Component({
  selector: 'app-condominium-hub',
  templateUrl: './condominium-hub.page.html',
  styleUrls: ['./condominium-hub.page.scss'],
  standalone: true,
  imports: [
    IonContent,
    IonHeader,
    IonToolbar,
    CommonModule,
    FormsModule,
    IonButtons,
    IonBackButton,
    IonButton,
    IonIcon,
    TranslocoModule,
    AvatarComponent,
  ],
})
export class CondominiumHubPage implements OnInit {
  // --- Dependencies ---
  private condominiumService = inject(Condominium);

  // --- Properties ---
  activeCondominium = toSignal(this.condominiumService.activeCondominium$);
  constructor() {}

  ngOnInit() {}
}
