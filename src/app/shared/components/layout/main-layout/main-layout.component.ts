import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  IonContent,
  IonHeader,
  IonTitle,
  IonToolbar,
  IonMenu,
  IonButtons,
  IonMenuButton,
  IonIcon,
  IonFooter,
} from '@ionic/angular/standalone';
import { languageSelectorComponent } from '@shared/components/language-selector/language-selector.component';
import { SidemenuContentComponent } from '@shared/components/sidemenu-content/sidemenu-content.component';

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
    IonFooter,
    languageSelectorComponent,
    SidemenuContentComponent,
  ],
})
export class MainLayoutComponent {}
