import { Component, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslocoPipe } from '@jsverse/transloco';
import {
  IonModal,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonButtons,
  IonButton,
  IonIcon,
  IonContent,
} from '@ionic/angular/standalone';
import { AssignPropertyFormComponent } from '../assign-property-form/assign-property-form.component';
import type { Property } from '@app-types/property';

@Component({
  selector: 'app-assign-property-modal',
  standalone: true,
  imports: [
    CommonModule,
    TranslocoPipe,
    IonModal,
    IonHeader,
    IonToolbar,
    IonTitle,
    IonButtons,
    IonButton,
    IonIcon,
    IonContent,
    AssignPropertyFormComponent,
  ],
  templateUrl: './assign-property-modal.component.html',
  styleUrls: ['./assign-property-modal.component.scss'],
})
export class AssignPropertyModalComponent {
  isOpen = input(false);
  condominiumId = input.required<string>();
  userProfile = input<{ name: string | null; email: string | null }>();

  propertyAssigned = output<Property>();
  cancelled = output<void>();

  onPropertyAssigned(property: Property): void {
    this.propertyAssigned.emit(property);
  }

  onCancel(): void {
    this.cancelled.emit();
  }
}
