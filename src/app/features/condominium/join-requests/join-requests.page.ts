import { Component, inject, OnInit, signal } from '@angular/core';
import { Router } from '@angular/router';
import { DatePipe } from '@angular/common';
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';
import {
  IonContent,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonButtons,
  IonBackButton,
  IonButton,
  IonIcon,
  IonList,
  IonItem,
  IonLabel,
  IonAvatar,
  IonSpinner,
  IonAlert,
  IonToast,
} from '@ionic/angular/standalone';
import { MainLayoutComponent } from '@shared/components/layout/main-layout/main-layout.component';
import { CondominiumJoinRequest } from '@core/services/condominium-join-request/condominium-join-request';
import { ContextService } from '@core/services/context/context.service';
import type { JoinRequestWithProfile } from '@app-types/join-request';
import { firstValueFrom } from 'rxjs';

@Component({
  selector: 'app-join-requests',
  templateUrl: 'join-requests.page.html',
  styleUrls: ['join-requests.page.scss'],
  imports: [
    TranslocoPipe,
    DatePipe,
    IonContent,
    IonHeader,
    IonToolbar,
    IonTitle,
    IonButtons,
    IonBackButton,
    IonButton,
    IonIcon,
    IonList,
    IonItem,
    IonLabel,
    IonAvatar,
    IonSpinner,
    IonAlert,
    IonToast,
    MainLayoutComponent,
  ],
})
export class JoinRequestsPage implements OnInit {
  private router = inject(Router);
  private joinRequestService = inject(CondominiumJoinRequest);
  private contextService = inject(ContextService);
  private translocoService = inject(TranslocoService);

  requests = signal<JoinRequestWithProfile[]>([]);
  loading = signal(true);
  processingId = signal<string | null>(null);
  alertOpen = signal(false);
  alertData = signal<{ header: string; message: string; requestId: string } | null>(null);
  toastOpen = signal(false);
  toastMessage = signal('');

  get alertButtons() {
    return [
      { text: this.translocoService.translate('common.cancel'), role: 'cancel', handler: () => this.handleAlertCancel() },
      { text: this.translocoService.translate('joinRequests.approve'), role: 'confirm', handler: () => this.handleAlertConfirm('approve') },
      { text: this.translocoService.translate('joinRequests.decline'), role: 'decline', handler: () => this.handleAlertConfirm('decline') }
    ];
  }

  ngOnInit(): void {
    this.loadRequests();
  }

  async loadRequests(): Promise<void> {
    const condoId = this.contextService.activeCondominium()?.id;
    if (!condoId) {
      this.router.navigate(['/home']);
      return;
    }

    this.loading.set(true);
    const data = await this.joinRequestService.fetchPendingRequests(condoId);
    this.requests.set(data);
    this.loading.set(false);
  }

  async confirmAction(requestId: string, action: 'approve' | 'decline'): Promise<void> {
    const request = this.requests().find(r => r.id === requestId);
    if (!request) return;

    const userName = request.profiles?.name || request.profiles?.email || 'Unknown';
    const isApprove = action === 'approve';

    const [header, message, confirmText, cancelText] = await Promise.all([
      firstValueFrom(this.translocoService.selectTranslate(
        isApprove ? 'joinRequests.approveTitle' : 'joinRequests.declineTitle'
      )),
      firstValueFrom(this.translocoService.selectTranslate(
        isApprove ? 'joinRequests.approveMessage' : 'joinRequests.declineMessage',
        { name: userName }
      )),
      firstValueFrom(this.translocoService.selectTranslate(
        isApprove ? 'joinRequests.approve' : 'joinRequests.decline'
      )),
      firstValueFrom(this.translocoService.selectTranslate('common.cancel')),
    ]);

    this.alertData.set({ header, message, requestId: `${requestId}:${action}` });
    this.alertOpen.set(true);
  }

  async handleAlertConfirm(action: 'approve' | 'decline'): Promise<void> {
    const data = this.alertData();
    if (!data) return;

    const [requestId, confirmedAction] = data.requestId.split(':');
    if (confirmedAction !== action) return;

    this.alertOpen.set(false);
    this.processingId.set(requestId);

    let success = false;
    if (action === 'approve') {
      success = await this.joinRequestService.approveRequest(requestId);
    } else {
      success = await this.joinRequestService.declineRequest(requestId);
    }

    this.processingId.set(null);

    if (success) {
      // Remove from list
      this.requests.set(this.requests().filter(r => r.id !== requestId));
      const messageKey = action === 'approve' ? 'joinRequests.approvedSuccess' : 'joinRequests.declinedSuccess';
      const message = await firstValueFrom(this.translocoService.selectTranslate(messageKey));
      this.toastMessage.set(message);
      this.toastOpen.set(true);
    } else {
      const message = await firstValueFrom(this.translocoService.selectTranslate('joinRequests.actionError'));
      this.toastMessage.set(message);
      this.toastOpen.set(true);
    }
  }

  handleAlertCancel(): void {
    this.alertOpen.set(false);
    this.alertData.set(null);
  }

  getUserName(request: JoinRequestWithProfile): string {
    return request.profiles?.name || request.profiles?.email || 'Unknown user';
  }

  getUserEmail(request: JoinRequestWithProfile): string {
    return request.profiles?.email || '';
  }

  getUserInitials(request: JoinRequestWithProfile): string {
    const name = request.profiles?.name;
    if (!name) return '?';
    const parts = name.split(' ');
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return name[0].toUpperCase();
  }

  isProcessing(requestId: string): boolean {
    return this.processingId() === requestId;
  }
}
