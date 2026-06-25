import { Component, inject, signal, effect } from '@angular/core';
import {
  IonContent,
  IonHeader,
  IonToolbar,
  IonButtons,
  IonBackButton,
  IonIcon,
  IonButton,
  IonTitle,
  IonAlert,
  IonToast,
  IonSkeletonText,
} from '@ionic/angular/standalone';
import { TranslocoModule, TranslocoService } from '@jsverse/transloco';
import { ContextService } from '@core/services/context/context.service';
import { Structures } from '@core/services/structures/structures';
import { Properties } from '@core/services/properties/properties';
import { NetworkStatusService } from '@core/services/network-status.service';
import { CondominiumJoinRequest } from '@core/services/condominium-join-request/condominium-join-request';
import {
  injectQuery,
  injectMutation,
  QueryClient,
} from '@tanstack/angular-query-experimental';
import { toSignal } from '@angular/core/rxjs-interop';
import type { Structure } from '@app-types/structures';
import type { Property } from '@app-types/property';
import {
  ContextStatusComponent,
  CondominiumSelectorComponent,
  CondoDashboardCardComponent,
  HubStructuresAccordionComponent,
  StructureFormModalComponent,
  PropertyFormModalComponent,
  QrCodeModalComponent,
} from './components';
import { CondominiumInvitationCode } from '@app-types/index';

@Component({
  selector: 'app-condominium-hub',
  templateUrl: './condominium-hub.page.html',
  styleUrls: ['./condominium-hub.page.scss'],
  standalone: true,
  imports: [
    IonContent,
    IonHeader,
    IonToolbar,
    IonButtons,
    IonBackButton,
    IonIcon,
    IonButton,
    TranslocoModule,
    IonTitle,
    ContextStatusComponent,
    CondominiumSelectorComponent,
    CondoDashboardCardComponent,
    HubStructuresAccordionComponent,
    StructureFormModalComponent,
    PropertyFormModalComponent,
    QrCodeModalComponent,
    IonAlert,
    IonToast,
    IonSkeletonText,
  ],
})
export class CondominiumHubPage {
  // --- Dependencies ---
  private contextService = inject(ContextService);
  private structuresService = inject(Structures);
  private propertiesService = inject(Properties);
  private networkStatus = inject(NetworkStatusService);
  private queryClient = inject(QueryClient);
  private transloco = inject(TranslocoService);
  private joinRequestService = inject(CondominiumJoinRequest);

  // --- Context signals ---
  activeCondominium = this.contextService.activeCondominium;
  isAdmin = this.contextService.isAdmin;
  isReady = this.contextService.isReady;

  userCondominiums = this.contextService.userCondominiums;
  isOnline = this.networkStatus.isOnline;
  condominiumInvitationCode = signal<CondominiumInvitationCode | null>(null);

  // --- Reactive join requests from service ---
  pendingRequestsCount = toSignal(this.joinRequestService.pendingRequestsCount$, {
    initialValue: 0,
  });
  // --- UI state ---
  isSwitchingContext = signal(false);

  // --- Modal state ---
  isStructureFormModalOpen = signal(false);
  structureToEdit = signal<Structure | null>(null);
  isPropertyFormModalOpen = signal(false);
  propertyToEdit = signal<Property | null>(null);
  preSelectedStructureId = signal<string | null>(null);
  isQrModalOpen = signal(false);

  // --- Delete confirmation state ---
  deleteTarget = signal<{
    type: 'structure' | 'property';
    item: Structure | Property;
  } | null>(null);
  #toastText = signal('');
  showToast = signal(false);

  // --- TanStack Query: Structures ---
  structuresQuery = injectQuery(() => {
    const condoId = this.activeCondominium()?.id;
    return {
      queryKey: ['structures', condoId] as const,
      queryFn: async (): Promise<Structure[]> => {
        if (!condoId) return [];
        return this.structuresService.fetchByCondominium(condoId);
      },
      enabled: !!condoId,
      staleTime: 1000 * 60 * 5, // 5 minutes
    };
  });

  // --- TanStack Query: Properties ---
  propertiesQuery = injectQuery(() => {
    const condoId = this.activeCondominium()?.id;
    return {
      queryKey: ['properties', condoId] as const,
      queryFn: async (): Promise<Property[]> => {
        if (!condoId) return [];
        return this.propertiesService.fetchByCondominium(condoId);
      },
      enabled: !!condoId,
      staleTime: 1000 * 60 * 5, // 5 minutes
    };
  });

  // --- TanStack Query: Invitation Code (admin only) ---
  invitationCodeQuery = injectQuery(() => {
    const condoId = this.activeCondominium()?.id;
    const isAdmin = this.isAdmin();
    return {
      queryKey: ['invitation-code', condoId] as const,
      queryFn: async () => {
        if (!condoId) return null;
        const data =
          await this.joinRequestService.getActiveInvitationCode(condoId);
        console.log('Fetched invitation code:', data);
        this.condominiumInvitationCode.set(data);
        return data;
      },
      enabled: !!condoId && isAdmin,
      staleTime: 1000 * 60 * 5, // 5 minutes
    };
  });

  // --- Effect: Load pending join requests when condominium changes (admin only) ---
  loadPendingRequestsEffect = effect(() => {
    const condoId = this.activeCondominium()?.id;
    const isAdmin = this.isAdmin();
    
    if (condoId && isAdmin) {
      this.joinRequestService.loadPendingRequests(condoId);
    }
  });

  // --- TanStack Mutation: Delete Structure ---
  deleteStructureMutation = injectMutation(() => ({
    mutationFn: async (id: string) => {
      await this.structuresService.deleteStructure(id);
    },
    onSuccess: () => {
      this.queryClient.invalidateQueries({ queryKey: ['structures'] });
      this.#showToast('structure_deleted');
    },
    onError: (error) => {
      console.error('Failed to delete structure:', error);
      this.#showToast('delete_error');
    },
  }));

  // --- TanStack Mutation: Delete Property ---
  deletePropertyMutation = injectMutation(() => ({
    mutationFn: async (id: string) => {
      await this.propertiesService.deleteProperty(id);
    },
    onSuccess: () => {
      this.queryClient.invalidateQueries({ queryKey: ['properties'] });
      this.#showToast('property_deleted');
    },
    onError: (error) => {
      console.error('Failed to delete property:', error);
      this.#showToast('delete_error');
    },
  }));

  // --- React to context ready ---
  contextReadyEffect = effect(() => {
    if (this.isReady()) {
      console.log('Context ready - isAdmin:', this.isAdmin());
    }
  });

  // --- Event Handlers ---

  async onCondominiumChange(condominiumId: string) {
    if (!condominiumId || condominiumId === this.activeCondominium()?.id)
      return;

    this.isSwitchingContext.set(true);
    try {
      await this.contextService.setActiveCondominium(condominiumId);
    } catch (error) {
      console.error('Failed to switch condominium:', error);
      this.#showToast('context_switch_error');
    } finally {
      this.isSwitchingContext.set(false);
    }
  }

  async onRefresh(event: Event) {
    await this.#invalidateAndPrefetch();
    (event as any).target?.complete?.();
  }

  async #invalidateAndPrefetch() {
    const condoId = this.activeCondominium()?.id;
    if (!condoId) return;

    try {
      this.queryClient.invalidateQueries({ queryKey: ['structures', condoId] });
      this.queryClient.invalidateQueries({ queryKey: ['properties', condoId] });
    } catch (error) {
      console.error('Failed to refresh:', error);
    }
  }

  // --- Structure Form Modal ---

  openAddStructureModal() {
    this.structureToEdit.set(null);
    this.isStructureFormModalOpen.set(true);
  }

  openEditStructureModal(structure: Structure) {
    this.structureToEdit.set(structure);
    this.isStructureFormModalOpen.set(true);
  }

  closeStructureFormModal() {
    this.isStructureFormModalOpen.set(false);
    this.structureToEdit.set(null);
  }

  // --- Property Form Modal ---

  openAddPropertyModal(structureId: string) {
    this.propertyToEdit.set(null);
    this.preSelectedStructureId.set(structureId);
    this.isPropertyFormModalOpen.set(true);
  }

  openEditPropertyModal(property: Property) {
    this.propertyToEdit.set(property);
    this.preSelectedStructureId.set(null);
    this.isPropertyFormModalOpen.set(true);
  }

  closePropertyFormModal() {
    this.isPropertyFormModalOpen.set(false);
    this.propertyToEdit.set(null);
    this.preSelectedStructureId.set(null);
  }

  // --- QR Modal ---

  openQrModal() {
    this.isQrModalOpen.set(true);
  }

  closeQrModal() {
    this.isQrModalOpen.set(false);
  }

  // --- Delete flow ---

  confirmDeleteStructure(structure: Structure) {
    this.deleteTarget.set({ type: 'structure', item: structure });
  }

  confirmDeleteProperty(property: Property) {
    this.deleteTarget.set({ type: 'property', item: property });
  }

  executeDelete() {
    const target = this.deleteTarget();
    if (!target) return;

    if (target.type === 'structure') {
      this.deleteStructureMutation.mutate(target.item.id);
    } else {
      this.deletePropertyMutation.mutate(target.item.id);
    }

    this.deleteTarget.set(null);
  }

  // --- Toast ---

  #showToast(key: string): void {
    const i18nKey = `condominium.hub.toast.${key}`;
    const message = this.transloco.translate(i18nKey);
    this.#toastText.set(message);
    this.showToast.set(true);
  }

  /** Exposed for template binding */
  get toastMessage(): string {
    return this.#toastText();
  }
}
