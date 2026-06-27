import {
  Component,
  input,
  output,
  OnInit,
  signal,
  effect,
  inject,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  IonModal,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonContent,
  IonButton,
  IonIcon,
  IonSpinner,
} from '@ionic/angular/standalone';
import { TranslocoModule, TranslocoService } from '@jsverse/transloco';
import QRCode from 'qrcode';
import { environment } from 'src/environments/environment';
import { Toast } from '@core/services/toast/toast';

@Component({
  selector: 'app-qr-code-modal',
  standalone: true,
  imports: [
    CommonModule,
    IonModal,
    IonHeader,
    IonToolbar,
    IonTitle,
    IonContent,
    IonButton,
    IonIcon,
    IonSpinner,
    TranslocoModule,
  ],
  templateUrl: './qr-code-modal.component.html',
  styleUrls: ['./qr-code-modal.component.scss'],
})
export class QrCodeModalComponent {
  toastService = inject(Toast);
  translocoService = inject(TranslocoService);

  isOpen = input(false);
  invitationCode = input<string | null>(null);
  closeModal = output<void>();

  qrCodeDataUrl = signal<string | null>(null);
  invitationUrl = signal<string | null>(null);

  constructor() {
    effect(() => {
      const code = this.invitationCode();
      if (code) {
        const url = `${environment.appUrl}/onboarding/join-condominium?code=${code}`;
        this.invitationUrl.set(url);
        this.generateQrCode(url);
      }
    });
  }

  async generateQrCode(url: string) {
    try {
      const dataUrl = await QRCode.toDataURL(url, {
        width: 300,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#ffffff',
        },
      });
      this.qrCodeDataUrl.set(dataUrl);
    } catch (err) {
      console.error('Error generating QR code:', err);
    }
  }

  onModalDismiss() {
    this.closeModal.emit();
  }

  copyUrlToClipboard(url: string) {
    navigator.clipboard.writeText(url).then(
      () => {
        this.toastService.present({
          message: this.translocoService.translate('common.copiedToClipboard'),
        });
      },
      (err) => {
        console.error('Error copying URL to clipboard:', err);
      },
    );
  }
}
