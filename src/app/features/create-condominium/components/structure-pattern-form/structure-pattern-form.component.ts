import { Component, input, output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import {
  IonInput,
  IonLabel,
  IonChip,
  IonItem,
} from '@ionic/angular/standalone';
import { TranslocoPipe } from '@jsverse/transloco';
import type { EnumeratorType } from '@features/create-condominium/create-condominium.types';

@Component({
  selector: 'app-structure-pattern-form',
  templateUrl: './structure-pattern-form.component.html',
  styleUrls: ['./structure-pattern-form.component.scss'],
  standalone: true,
  imports: [FormsModule, IonInput, IonLabel, IonChip, IonItem, TranslocoPipe],
})
export class StructurePatternFormComponent {
  readonly prefix = input('');
  readonly enumerator = input<EnumeratorType>('letter');
  readonly suffix = input('');
  readonly count = input(5);

  readonly prefixChange = output<string>();
  readonly enumeratorChange = output<EnumeratorType>();
  readonly suffixChange = output<string>();
  readonly countChange = output<string>();
}
