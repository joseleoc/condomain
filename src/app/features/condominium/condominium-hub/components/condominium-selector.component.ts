import { Component, input, output } from '@angular/core';
import {
  IonSelect,
  IonSelectOption,
} from '@ionic/angular/standalone';
import { TranslocoModule } from '@jsverse/transloco';
import { AvatarComponent } from '@shared/components/avatar/avatar.component';
import type { CondominiumWithRole } from '@app-types/condominium';

@Component({
  selector: 'app-condominium-selector',
  templateUrl: './condominium-selector.component.html',
  styleUrls: ['./condominium-selector.component.scss'],
  standalone: true,
  imports: [
    IonSelect,
    IonSelectOption,
    TranslocoModule,
    AvatarComponent,
  ],
})
export class CondominiumSelectorComponent {
  // --- Inputs ---
  activeCondominium = input<CondominiumWithRole | null>(null);
  userCondominiums = input<CondominiumWithRole[]>([]);
  isSwitchingContext = input(false);

  // --- Outputs ---
  condominiumChange = output<string>();

  // --- Handlers ---
  onCondominiumSelected(event: any) {
    const condominiumId = event.detail.value;
    if (condominiumId) {
      this.condominiumChange.emit(condominiumId);
    }
  }
}
