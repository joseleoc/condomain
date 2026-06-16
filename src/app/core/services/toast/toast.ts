import { inject, Injectable } from '@angular/core';
import { ToastController, ToastButton } from '@ionic/angular/standalone';
import { TranslocoService } from '@jsverse/transloco';

@Injectable({
  providedIn: 'root',
})
export class Toast {
  private translocoService = inject(TranslocoService);
  private toastController = inject(ToastController);

  async present(options: {
    message: string;
    duration?: number;
    position?: 'top' | 'bottom' | 'middle';
    color?: string;
    buttons?: ToastButton[];
    dismissButton?: boolean;
  }) {
    const {
      message,
      duration = 2000,
      position = 'bottom',
      color,
      buttons,
      dismissButton = true,
    } = options;
    const toast = await this.toastController.create({
      message,
      duration,
      position,
      color,
      buttons: dismissButton
        ? [
            {
              text: this.translocoService.translate('Dismiss'),
              role: 'cancel',
            },
            ...(buttons ?? []),
          ]
        : buttons,
    });
    await toast.present();
  }
}
