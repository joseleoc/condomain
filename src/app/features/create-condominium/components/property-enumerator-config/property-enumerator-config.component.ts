import { Component, input, output } from '@angular/core';
import {
  IonLabel,
  IonNote,
  IonIcon,
  IonChip,
  IonItem,
  IonInput,
} from '@ionic/angular/standalone';
import { TranslocoPipe } from '@jsverse/transloco';
import type { EnumeratorType } from '@features/create-condominium/create-condominium.types';

@Component({
  selector: 'app-property-enumerator-config',
  templateUrl: './property-enumerator-config.component.html',
  styleUrls: ['./property-enumerator-config.component.scss'],
  standalone: true,
  imports: [IonLabel, IonNote, IonIcon, IonChip, IonItem, IonInput, TranslocoPipe],
})
export class PropertyEnumeratorConfigComponent {
  readonly enumeratorType = input<EnumeratorType>('number');
  readonly digits = input(2);
  readonly startAt = input(1);

  readonly enumeratorTypeChange = output<EnumeratorType>();
  readonly digitsChange = output<number>();
  readonly startAtChange = output<string>();
  readonly incrementStartAt = output<void>();
  readonly decrementStartAt = output<void>();
}
