import { Component, inject, OnInit, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';
import {
  IonContent,
  IonButton,
  IonInput,
  IonText,
  IonSpinner,
  AlertController,
} from '@ionic/angular/standalone';
import { MainLayoutComponent } from '@shared/components/layout/main-layout/main-layout.component';
import { CondominiumJoinRequest } from '@core/services/condominium-join-request/condominium-join-request';
import { PendingInvitation } from '@core/services/pending-invitation/pending-invitation';
import { TelemetryService } from '@core/services/telemetry/telemetry.service';
import { TelemetryEvents } from '@core/services/telemetry/telemetry.types';
import { firstValueFrom } from 'rxjs';

@Component({
  selector: 'app-join-condominium',
  templateUrl: 'join-condominium.page.html',
  styleUrls: ['join-condominium.page.scss'],
  imports: [
    TranslocoPipe,
    IonContent,
    IonButton,
    IonInput,
    IonText,
    IonSpinner,
    MainLayoutComponent,
  ],
})
export class JoinCondominiumPage implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private joinRequestService = inject(CondominiumJoinRequest);
  private pendingInvitation = inject(PendingInvitation);
  private alertController = inject(AlertController);
  private translocoService = inject(TranslocoService);
  private telemetry = inject(TelemetryService);

  invitationCode = signal('');
  loading = signal(false);
  error = signal<string | null>(null);

  ngOnInit(): void {
    // Check URL param first, then localStorage
    const urlCode = this.route.snapshot.queryParamMap.get('code');
    const storedCode = this.pendingInvitation.getCode();
    const code = urlCode || storedCode;

    if (code) {
      this.invitationCode.set(code);
      // Auto-submit if we have a valid code
      this.handleSubmit();
    }
  }

  async handleSubmit(): Promise<void> {
    const code = this.invitationCode().trim();
    
    if (code.length !== 6) {
      this.error.set('join.invalidCode');
      return;
    }

    this.loading.set(true);
    this.error.set(null);

    try {
      const result = await this.joinRequestService.submitJoinRequest(code);

      if (!result.success) {
        const errorKey = this.mapErrorToTranslationKey(result.error);
        this.error.set(errorKey);
        this.loading.set(false);
        return;
      }

      // Clear pending invitation after success
      this.pendingInvitation.clearCode();

      try {
        this.telemetry.track(TelemetryEvents.JOIN_REQUEST_SUBMITTED, {
          code: code.substring(0, 3) + '***', // Partial code for privacy
        });
      } catch (error) {
        // Telemetry should never break the app
      }

      await this.showSuccessAlert();
      this.router.navigate(['/home']);
    } catch (err) {
      console.error('Error creating join request:', err);
      this.error.set('join.error');
    } finally {
      this.loading.set(false);
    }
  }

  private mapErrorToTranslationKey(error?: string): string {
    switch (error) {
      case 'not_found':
        return 'join.notFound';
      case 'already_requested':
        return 'join.alreadyRequested';
      default:
        return 'join.error';
    }
  }

  private async showSuccessAlert(): Promise<void> {
    const [header, message, ok] = await Promise.all([
      firstValueFrom(this.translocoService.selectTranslate('join.successTitle')),
      firstValueFrom(this.translocoService.selectTranslate('join.successMessage')),
      firstValueFrom(this.translocoService.selectTranslate('common.ok')),
    ]);

    const alert = await this.alertController.create({
      header,
      message,
      buttons: [ok],
    });
    await alert.present();
  }
}
