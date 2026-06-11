import { Component, inject } from '@angular/core';
import { Auth } from '@core/services/auth/auth';
import {
  IonHeader,
  IonToolbar,
  IonTitle,
  IonContent,
  IonButton,
} from '@ionic/angular/standalone';

@Component({
  selector: 'app-home',
  templateUrl: 'home.page.html',
  styleUrls: ['home.page.scss'],
  imports: [IonHeader, IonToolbar, IonTitle, IonContent, IonButton],
})
export class HomePage {
  private authService = inject(Auth);
  constructor() {}

  logOut() {
    this.authService.signOut();
  }
}
