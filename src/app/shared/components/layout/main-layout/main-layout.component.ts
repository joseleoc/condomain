import { Component, inject } from '@angular/core';
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
  IonButton,
} from '@ionic/angular/standalone';
import { languageSelectorComponent } from '@shared/components/language-selector/language-selector.component';
import { SidemenuContentComponent } from '@shared/components/sidemenu-content/sidemenu-content.component';
import { Auth } from '@core/services/auth/auth';
import { TranslocoPipe } from '@jsverse/transloco';

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
    IonButton,
    TranslocoPipe,
  ],
})
export class MainLayoutComponent {
  private authService = inject(Auth);

  logOut() {
    this.authService.signOut();
  }
}
