import { Component, input } from '@angular/core';
import {
  IonContent,
  IonHeader,
  IonToolbar,
  IonBackButton,
  IonButtons,
} from '@ionic/angular/standalone';
import { languageSelectorComponent } from '@shared/components/language-selector/language-selector.component';

@Component({
  selector: 'app-auth-layout',
  templateUrl: './auth-layout.component.html',
  styleUrls: ['./auth-layout.component.scss'],
  imports: [
    IonContent,
    IonHeader,
    IonToolbar,
    IonBackButton,
    IonButtons,
    languageSelectorComponent,
  ],
})
export class AuthLayoutComponent {
  // --- Inputs ---
  showBackButton = input<boolean>(true);
}
