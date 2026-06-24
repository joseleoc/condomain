import { Component, input } from '@angular/core';
import { IonCard, IonCardHeader, IonCardTitle, IonCardSubtitle, IonCardContent, IonIcon, IonItem, IonLabel } from '@ionic/angular/standalone';
import { TranslocoModule } from '@jsverse/transloco';
import type { CondominiumWithRole } from '@app-types/condominium';

@Component({
  selector: 'app-condo-dashboard-card',
  templateUrl: './condo-dashboard-card.component.html',
  styleUrls: ['./condo-dashboard-card.component.scss'],
  standalone: true,
  imports: [
    IonCard,
    IonCardHeader,
    IonCardTitle,
    IonCardSubtitle,
    IonCardContent,
    IonIcon,
    IonItem,
    IonLabel,
    TranslocoModule,
  ],
})
export class CondoDashboardCardComponent {
  // --- Inputs ---
  condominium = input.required<CondominiumWithRole>();
  structureCount = input.required<number>();
  propertyCount = input.required<number>();
  pendingRequestsCount = input<number>(0);
}
