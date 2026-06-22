import { Component, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  IonList,
  IonItem,
  IonLabel,
  IonButtons,
  IonButton,
  IonIcon,
  IonSkeletonText,
  IonRefresher,
  IonRefresherContent,
} from '@ionic/angular/standalone';
import { TranslocoModule } from '@jsverse/transloco';
import { home, trash } from 'ionicons/icons';
import type { Property } from '@app-types/property';

@Component({
  selector: 'app-properties-list',
  templateUrl: './properties-list.component.html',
  styleUrls: ['./properties-list.component.scss'],
  standalone: true,
  imports: [
    CommonModule,
    IonList,
    IonItem,
    IonLabel,
    IonButtons,
    IonButton,
    IonIcon,
    IonSkeletonText,
    IonRefresher,
    IonRefresherContent,
    TranslocoModule,
  ],
})
export class PropertiesListComponent {
  // --- Icons ---
  homeIcon = home;
  trashIcon = trash;

  // --- Inputs ---
  properties = input<Property[]>([]);
  isLoading = input(false);
  error = input<Error | null>(null);
  isAdmin = input(false);
  isOnline = input(true);
  structureNameMap = input<Map<string, string>>(new Map());

  // --- Outputs ---
  deleteProperty = output<Property>();
  refresh = output<Event>();

  // --- Handlers ---
  onDelete(property: Property) {
    this.deleteProperty.emit(property);
  }

  onRefresh(event: Event) {
    this.refresh.emit(event);
  }

  getStructureName(structureId: string): string {
    return this.structureNameMap().get(structureId) ?? '—';
  }
}
