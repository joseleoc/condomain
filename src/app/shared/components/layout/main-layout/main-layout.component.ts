import { Component, input, signal } from '@angular/core';
import { CommonModule, NgOptimizedImage } from '@angular/common';
import {
  IonContent,
  IonHeader,
  IonTitle,
  IonToolbar,
  IonMenu,
  IonButtons,
  IonMenuButton,
  IonIcon,
} from '@ionic/angular/standalone';

@Component({
  selector: 'app-main-layout',
  templateUrl: './main-layout.component.html',
  styleUrls: ['./main-layout.component.scss'],
  standalone: true,
  imports: [
    IonContent,
    IonHeader,
    IonTitle,
    IonToolbar,
    CommonModule,
    IonMenu,
    IonButtons,
    IonMenuButton,
    IonIcon,
  ],
})
export class MainLayoutComponent {
  // -- Inputs ---
  readonly title = input.required<string>();
}
