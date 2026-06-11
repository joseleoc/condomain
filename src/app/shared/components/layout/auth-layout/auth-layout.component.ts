import { Component, input } from '@angular/core';
import {
  IonContent,
  IonHeader,
  IonToolbar,
  IonBackButton,
  IonButtons,
} from '@ionic/angular/standalone';

@Component({
  selector: 'app-auth-layout',
  templateUrl: './auth-layout.component.html',
  styleUrls: ['./auth-layout.component.scss'],
  imports: [IonContent, IonHeader, IonToolbar, IonBackButton, IonButtons],
})
export class AuthLayoutComponent {
  // --- Inputs ---
  showBackButton = input<boolean>(true);
}
