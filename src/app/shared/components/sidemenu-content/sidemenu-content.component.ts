import { Component, inject } from '@angular/core';
import {
  IonContent,
  IonSkeletonText,
  IonButton,
} from '@ionic/angular/standalone';
import { AvatarComponent } from '../avatar/avatar.component';
import { Condominium } from '@core/services/condominium/condominium';
import { toSignal } from '@angular/core/rxjs-interop';
import { IonIcon, IonText } from '@ionic/angular/standalone';

@Component({
  selector: 'app-sidemenu-content',
  templateUrl: './sidemenu-content.component.html',
  styleUrls: ['./sidemenu-content.component.scss'],
  imports: [IonContent, AvatarComponent, IonSkeletonText, IonButton, IonIcon],
})
export class SidemenuContentComponent {
  // --- Dependencies ---
  private condominiumService = inject(Condominium);

  // --- Properties ---
  activeCondominium = toSignal(this.condominiumService.activeCondominium$);
  loadingCondominiums = toSignal(this.condominiumService.loadingCondominiums$);
}
