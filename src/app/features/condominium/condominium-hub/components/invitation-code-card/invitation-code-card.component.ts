import { Component, inject, input, output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  IonCard,
  IonCardHeader,
  IonCardTitle,
  IonCardContent,
  IonButton,
  IonIcon,
} from '@ionic/angular/standalone';
import { TranslocoModule, TranslocoService } from '@jsverse/transloco';
import type { CondominiumInvitationCode } from '@app-types/condominium-invitation-code';
import { Toast } from '@core/services/toast/toast';

@Component({
  selector: 'app-invitation-code-card',
  standalone: true,
  imports: [
    CommonModule,
    IonCard,
    IonCardHeader,
    IonCardTitle,
    IonCardContent,
    IonButton,
    IonIcon,
    TranslocoModule,
  ],
  templateUrl: './invitation-code-card.component.html',
  styleUrls: ['./invitation-code-card.component.scss'],
})
export class InvitationCodeCardComponent {
  toastService = inject(Toast);
  translocoService = inject(TranslocoService);
  invitationCode = input<CondominiumInvitationCode | null>(null);
  showQrCode = output<void>();

  copyToClipboard(): void {
    const code = this.invitationCode();
    if (!code) return;

    navigator.clipboard
      .writeText(code.code)
      .then(() => {
        this.toastService.present({
          message: this.translocoService.translate('common.copiedToClipboard'),
          duration: 2000,
        });

        console.log('Code copied to clipboard');
      })
      .catch((err) => {
        console.error('Failed to copy code:', err);
      });
  }
}
