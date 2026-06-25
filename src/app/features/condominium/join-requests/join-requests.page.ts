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
import { TelemetryService } from '@core/services/telemetry/telemetry.service';
import { TelemetryEvents } from '@core/services/telemetry/telemetry.types';
import { toSignal } from '@angular/core/rxjs-interop';
import type { JoinRequestWithProfile } from '@app-types/join-request';
import type { Property } from '@app-types/property';
import { firstValueFrom } from 'rxjs';
import { AssignPropertyModalComponent } from './components/assign-property-modal/assign-property-modal.component';

@Component({
  selector: 'app-join-requests',
  templateUrl: 'join-requests.page.html',
  styleUrls: ['join-requests.page.scss'],
  imports: [
    TranslocoPipe,
    DatePipe,
    IonContent,
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
    AssignPropertyModalComponent,
  ],
})
export class JoinRequestsPage implements OnInit {
  private router = inject(Router);
  private joinRequestService = inject(CondominiumJoinRequest);
  contextService = inject(ContextService);
  private translocoService = inject(TranslocoService);
  private telemetry = inject(TelemetryService);

  // Reactive requests from service
  requests = toSignal(this.joinRequestService.pendingRequests$, {
    initialValue: [] as JoinRequestWithProfile[],
  });
  
  loading = signal(true);
  processingId = signal<string | null>(null);
  alertOpen = signal(false);
  alertData = signal<{
    header: string;
    message: string;
    requestId: string;
  } | null>(null);
  toastOpen = signal(false);
  toastMessage = signal('');
  assignPropertyModalOpen = signal(false);
  pendingApprovalRequest = signal<JoinRequestWithProfile | null>(null);

  get alertButtons() {
    return [
      {
        text: this.translocoService.translate('common.cancel'),
        role: 'cancel',
        handler: () => this.handleAlertCancel(),
      },
      {
        text: this.translocoService.translate('joinRequests.decline'),
        role: 'confirm',
        handler: () => this.handleAlertConfirm('decline'),
      },
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
    await this.joinRequestService.loadPendingRequests(condoId);
    this.loading.set(false);
  }

  async confirmAction(
    requestId: string,
    action: 'approve' | 'decline',
  ): Promise<void> {
    const request = this.requests().find((r) => r.id === requestId);
    if (!request) return;

    if (action === 'approve') {
      // Show assign property modal for approval
      this.pendingApprovalRequest.set(request);
      this.assignPropertyModalOpen.set(true);
      return;
    }

    // For decline, show confirmation alert
    const userName =
      request.profiles?.name || request.profiles?.email || 'Unknown';

    const [header, message] = await Promise.all([
      firstValueFrom(
        this.translocoService.selectTranslate('joinRequests.declineTitle'),
      ),
      firstValueFrom(
        this.translocoService.selectTranslate(
          'joinRequests.declineMessage',
          { name: userName },
        ),
      ),
    ]);

    this.alertData.set({
      header,
      message,
      requestId: `${requestId}:decline`,
    });
    this.alertOpen.set(true);
  }

  async handlePropertyAssigned(property: Property): Promise<void> {
    const request = this.pendingApprovalRequest();
    if (!request) return;

    this.assignPropertyModalOpen.set(false);
    this.processingId.set(request.id);

    const success = await this.joinRequestService.approveRequestWithProperty(
      request.id,
      property.id,
    );

    this.processingId.set(null);
    this.pendingApprovalRequest.set(null);

    if (success) {
      try {
        this.telemetry.track(TelemetryEvents.JOIN_REQUEST_APPROVED, {
          request_id: request.id,
          property_id: property.id,
        });
        this.telemetry.track(TelemetryEvents.JOIN_REQUEST_PROPERTY_ASSIGNED, {
          request_id: request.id,
          property_id: property.id,
        });
      } catch (error) {
        // Telemetry should never break the app
      }

      const message = await firstValueFrom(
        this.translocoService.selectTranslate('joinRequests.approvedSuccess'),
      );
      this.toastMessage.set(message);
      this.toastOpen.set(true);
    } else {
      const message = await firstValueFrom(
        this.translocoService.selectTranslate('joinRequests.actionError'),
      );
      this.toastMessage.set(message);
      this.toastOpen.set(true);
    }
  }

  handleAssignPropertyCancelled(): void {
    this.assignPropertyModalOpen.set(false);
    this.pendingApprovalRequest.set(null);
  }

  async handleAlertConfirm(action: 'decline'): Promise<void> {
    const data = this.alertData();
    if (!data) return;

    const [requestId, confirmedAction] = data.requestId.split(':');
    if (confirmedAction !== action) return;

    this.alertOpen.set(false);
    this.processingId.set(requestId);

    const success = await this.joinRequestService.declineRequest(requestId);

    this.processingId.set(null);

    if (success) {
      try {
        this.telemetry.track(TelemetryEvents.JOIN_REQUEST_DECLINED, {
          request_id: requestId,
        });
      } catch (error) {
        // Telemetry should never break the app
      }

      const message = await firstValueFrom(
        this.translocoService.selectTranslate('joinRequests.declinedSuccess'),
      );
      this.toastMessage.set(message);
      this.toastOpen.set(true);
    } else {
      const message = await firstValueFrom(
        this.translocoService.selectTranslate('joinRequests.actionError'),
      );
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
