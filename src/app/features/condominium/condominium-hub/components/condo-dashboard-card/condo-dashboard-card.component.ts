import { Component, input, output, inject } from '@angular/core';
import { Router } from '@angular/router';
import { DatePipe } from '@angular/common';
import { IonCard, IonCardHeader, IonCardTitle, IonCardSubtitle, IonCardContent, IonIcon, IonItem, IonLabel, IonButton } from '@ionic/angular/standalone';
import { TranslocoModule, TranslocoService } from '@jsverse/transloco';
import { Toast } from '@core/services/toast/toast';
import type { CondominiumWithRole } from '@app-types/condominium';
import type { CondominiumInvitationCode } from '@app-types/condominium-invitation-code';

@Component({
  selector: 'app-condo-dashboard-card',
  templateUrl: './condo-dashboard-card.component.html',
  styleUrls: ['./condo-dashboard-card.component.scss'],
  standalone: true,
  imports: [
    DatePipe,
    IonCard,
    IonCardHeader,
    IonCardTitle,
    IonCardSubtitle,
    IonCardContent,
    IonIcon,
    IonItem,
    IonLabel,
    IonButton,
    TranslocoModule,
  ],
})
export class CondoDashboardCardComponent {
  private router = inject(Router);
  private toast = inject(Toast);
  private transloco = inject(TranslocoService);

  // --- Inputs ---
  condominium = input.required<CondominiumWithRole>();
  structureCount = input.required<number>();
  propertyCount = input.required<number>();
  pendingRequestsCount = input<number>(0);
  invitationCode = input<CondominiumInvitationCode | null>(null);
  isAdmin = input<boolean>(false);

  // --- Outputs ---
  showQrCode = output<void>();

  // --- Methods ---
  goToPendingRequests(): void {
    this.router.navigate(['/condominium/join-requests']);
  }

  copyToClipboard(): void {
    const code = this.invitationCode();
    if (!code) return;

    navigator.clipboard.writeText(code.code).then(() => {
      this.toast.present({
        message: this.transloco.translate('condominium.hub.invitationCode.copiedToClipboard'),
        duration: 2000,
      });
    }).catch(err => {
      console.error('Failed to copy code:', err);
    });
  }
}
