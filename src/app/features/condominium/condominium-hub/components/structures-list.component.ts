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
import { business, trash } from 'ionicons/icons';
import type { Structure } from '@app-types/structures';

@Component({
  selector: 'app-structures-list',
  templateUrl: './structures-list.component.html',
  styleUrls: ['./structures-list.component.scss'],
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
export class StructuresListComponent {
  // --- Icons ---
  buildingIcon = business;
  trashIcon = trash;

  // --- Inputs ---
  structures = input<Structure[]>([]);
  isLoading = input(false);
  error = input<Error | null>(null);
  isAdmin = input(false);
  isOnline = input(true);

  // --- Outputs ---
  deleteStructure = output<Structure>();
  refresh = output<Event>();

  // --- Handlers ---
  onDelete(structure: Structure) {
    this.deleteStructure.emit(structure);
  }

  onRefresh(event: Event) {
    this.refresh.emit(event);
  }
}
