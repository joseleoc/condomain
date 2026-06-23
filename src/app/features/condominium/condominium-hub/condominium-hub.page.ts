import { Component, inject, OnInit, signal, computed } from '@angular/core';
import {
  IonContent,
  IonHeader,
  IonToolbar,
  IonButtons,
  IonBackButton,
  IonIcon,
  IonButton,
  IonTitle,
  IonSegment,
  IonSegmentButton,
  IonLabel,
  IonAlert,
  IonToast,
  IonSkeletonText,
} from '@ionic/angular/standalone';
import { TranslocoModule, TranslocoService } from '@jsverse/transloco';
import { ContextService } from '@core/services/context/context.service';
import { Structures } from '@core/services/structures/structures';
import { Properties } from '@core/services/properties/properties';
import { NetworkStatusService } from '@core/services/network-status.service';
import {
  injectQuery,
  injectMutation,
  QueryClient,
} from '@tanstack/angular-query-experimental';
import type { Structure } from '@app-types/structures';
import type { Property } from '@app-types/property';
import {
  ContextStatusComponent,
  CondominiumSelectorComponent,
  StructuresListComponent,
  PropertiesListComponent,
} from './components';

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
    IonSegment,
    IonSegmentButton,
    IonLabel,
    StructuresListComponent,
    PropertiesListComponent,
    IonAlert,
    IonToast,
    IonSkeletonText,
  ],
})
export class CondominiumHubPage implements OnInit {
  // --- Dependencies ---
  private contextService = inject(ContextService);
  private structuresService = inject(Structures);
  private propertiesService = inject(Properties);
  private networkStatus = inject(NetworkStatusService);
  private queryClient = inject(QueryClient);
  private transloco = inject(TranslocoService);

  // --- Context signals ---
  activeCondominium = this.contextService.activeCondominium;
  isAdmin = this.contextService.isAdmin;

  userCondominiums = this.contextService.userCondominiums;
  isOnline = this.networkStatus.isOnline;

  // --- UI state ---
  activeTab = signal<'structures' | 'properties'>('structures');
  isSwitchingContext = signal(false);

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

  // --- Computed: Structure name lookup for properties ---
  structureNameMap = computed(() => {
    const map = new Map<string, string>();
    const structures = this.structuresQuery.data() ?? [];
    for (const structure of structures) {
      map.set(structure.id, structure.name);
    }
    return map;
  });

  constructor() {}

  ngOnInit() {
    console.log(this.isAdmin());
  }

  // --- Event Handlers ---

  onTabChange(event: any) {
    const value = event.detail.value;
    if (value === 'structures' || value === 'properties') {
      this.activeTab.set(value);
    }
  }

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

  async onStructuresRefresh(event: Event) {
    await this.#invalidateAndPrefetch();
    (event as any).target?.complete?.();
  }

  async onPropertiesRefresh(event: Event) {
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
