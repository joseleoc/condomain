import { Component, input, OnInit } from '@angular/core';
import {
  IonHeader,
  IonToolbar,
  IonTitle,
  IonContent,
} from '@ionic/angular/standalone';

@Component({
  selector: 'app-auth-layout',
  templateUrl: './auth-layout.component.html',
  styleUrls: ['./auth-layout.component.scss'],
  imports: [IonHeader, IonToolbar, IonTitle, IonContent],
})
export class AuthLayoutComponent {
  // -- Inputs ---
  readonly title = input.required<string>();
}
