import { Component, inject, OnInit } from '@angular/core';
import { IonContent, IonHeader, IonAvatar } from '@ionic/angular/standalone';
import { AvatarComponent } from '../avatar/avatar.component';
import { Condominium } from '@core/services/condominium/condominium';
import { toSignal } from '@angular/core/rxjs-interop';

@Component({
  selector: 'app-sidemenu-content',
  templateUrl: './sidemenu-content.component.html',
  styleUrls: ['./sidemenu-content.component.scss'],
  imports: [IonContent, IonHeader, IonAvatar, AvatarComponent],
})
export class SidemenuContentComponent {
  // --- Dependencies ---
  private condominiumService = inject(Condominium);

  // --- Properties ---
  activeCondominium = toSignal(this.condominiumService.activeCondominium$);
}
