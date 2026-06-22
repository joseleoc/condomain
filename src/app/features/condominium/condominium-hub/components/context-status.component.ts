import { Component, input } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  IonChip,
  IonBadge,
} from '@ionic/angular/standalone';
import { TranslocoModule } from '@jsverse/transloco';

@Component({
  selector: 'app-context-status',
  templateUrl: './context-status.component.html',
  standalone: true,
  imports: [
    CommonModule,
    IonChip,
    IonBadge,
    TranslocoModule,
  ],
})
export class ContextStatusComponent {
  // --- Inputs ---
  isAdmin = input(true);
  isOnline = input(true);
}
