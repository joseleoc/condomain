import { Component, input } from '@angular/core';
import { IonChip } from '@ionic/angular/standalone';
import { TranslocoModule } from '@jsverse/transloco';

@Component({
  selector: 'app-context-status',
  templateUrl: './context-status.component.html',
  standalone: true,
  imports: [IonChip, TranslocoModule],
})
export class ContextStatusComponent {
  // --- Inputs ---
  isAdmin = input(true);
  isOnline = input(true);
  hasActiveCondominium = input(false);
}
