import { Component, inject } from '@angular/core';
import { Auth } from '@core/services/auth/auth';
import { MainLayoutComponent } from '@shared/components/layout/main-layout/main-layout.component';
import { IonButton } from '@ionic/angular/standalone';
import { Condominium } from '@core/services/condominium/condominium';

@Component({
  selector: 'app-home',
  templateUrl: 'home.page.html',
  styleUrls: ['home.page.scss'],
  imports: [MainLayoutComponent, IonButton],
})
export class HomePage {
  private authService = inject(Auth);
  private condominiumService = inject(Condominium);
  constructor() {
    this.condominiumService.fetchUserCondominiums({
      userId: this.authService.session$.getValue()?.user.id || '',
    });
  }

  logOut() {
    this.authService.signOut();
  }
}
