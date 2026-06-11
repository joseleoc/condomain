import { Component, input } from '@angular/core';
import { IonContent, IonIcon } from '@ionic/angular/standalone';

@Component({
  selector: 'app-auth-layout',
  templateUrl: './auth-layout.component.html',
  styleUrls: ['./auth-layout.component.scss'],
  imports: [IonContent],
})
export class AuthLayoutComponent {
  // -- Inputs ---
  readonly title = input.required<string>();
}
