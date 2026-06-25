import { Component, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { TranslocoPipe } from '@jsverse/transloco';
import {
  IonContent,
  IonCard,
  IonCardHeader,
  IonCardTitle,
  IonCardContent,
  IonIcon,
  IonButton,
  IonRadioGroup,
  IonRadio,
} from '@ionic/angular/standalone';
import { MainLayoutComponent } from '@shared/components/layout/main-layout/main-layout.component';
import { IonicModule } from "@ionic/angular";
import { TelemetryService } from '@core/services/telemetry/telemetry.service';
import { TelemetryEvents } from '@core/services/telemetry/telemetry.types';

type OnboardingRole = 'admin' | 'owner';

@Component({
  selector: 'app-onboarding',
  templateUrl: 'onboarding.page.html',
  styleUrls: ['onboarding.page.scss'],
  imports: [
    TranslocoPipe,
    IonContent,
    IonCard,
    IonCardHeader,
    IonCardTitle,
    IonCardContent,
    IonIcon,
    IonButton,
    MainLayoutComponent,
    IonRadioGroup,
    IonRadio,
],
})
export class OnboardingPage {
  private router = inject(Router);
  private telemetry = inject(TelemetryService);

  selectedRole = signal<OnboardingRole | null>(null);

  selectRole(role: OnboardingRole): void {
    this.selectedRole.set(role);
    try {
      this.telemetry.track(TelemetryEvents.ONBOARDING_ROLE_SELECTED, { role });
    } catch (error) {
      // Telemetry should never break the app
    }
  }

  handleContinue(): void {
    const role = this.selectedRole();
    if (!role) return;

    if (role === 'admin') {
      this.router.navigate(['/create-condominium']);
    } else if (role === 'owner') {
      this.router.navigate(['/onboarding/join-condominium']);
    }
  }
  
}
