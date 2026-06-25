import { Component, inject, input, output, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormGroup, FormControl, Validators } from '@angular/forms';
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';
import {
  IonItem,
  IonSelect,
  IonSelectOption,
  IonLabel,
  IonButton,
  IonSpinner,
  IonIcon,
} from '@ionic/angular/standalone';
import { Properties } from '@core/services/properties/properties';
import { Structures } from '@core/services/structures/structures';
import type { Property } from '@app-types/property';
import type { Structure } from '@app-types/structures';

@Component({
  selector: 'app-assign-property-form',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    TranslocoPipe,
    IonItem,
    IonSelect,
    IonSelectOption,
    IonLabel,
    IonButton,
    IonSpinner,
    IonIcon,
  ],
  templateUrl: './assign-property-form.component.html',
  styleUrls: ['./assign-property-form.component.scss'],
})
export class AssignPropertyFormComponent implements OnInit {
  private propertiesService = inject(Properties);
  private structuresService = inject(Structures);
  private translocoService = inject(TranslocoService);

  condominiumId = input.required<string>();
  userProfile = input<{ name: string | null; email: string | null }>();

  propertyAssigned = output<Property>();
  cancelled = output<void>();

  properties = signal<Property[]>([]);
  structures = signal<Structure[]>([]);
  loading = signal(true);

  form = new FormGroup({
    propertyId: new FormControl<string | null>(null, Validators.required),
  });

  ngOnInit(): void {
    this.loadData();
  }

  private async loadData(): Promise<void> {
    try {
      const condoId = this.condominiumId();
      const [properties, structures] = await Promise.all([
        this.propertiesService.fetchByCondominium(condoId),
        this.structuresService.fetchByCondominium(condoId),
      ]);
      this.properties.set(properties);
      this.structures.set(structures);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      this.loading.set(false);
    }
  }

  getStructureName(structureId: string): string {
    const structure = this.structures().find((s) => s.id === structureId);
    return structure?.name || '';
  }

  getPropertyDisplayName(property: Property): string {
    const structureName = this.getStructureName(property.structure_id);
    return `${structureName} - ${property.name}`;
  }

  submit(): void {
    if (this.form.valid) {
      const propertyId = this.form.value.propertyId;
      const property = this.properties().find((p) => p.id === propertyId);
      if (property) {
        this.propertyAssigned.emit(property);
      }
    }
  }

  cancel(): void {
    this.cancelled.emit();
  }
}
