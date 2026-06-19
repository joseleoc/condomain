import { Component, input, output } from '@angular/core';
import {
  IonLabel,
  IonNote,
  IonIcon,
  IonChip,
} from '@ionic/angular/standalone';
import { TranslocoPipe } from '@jsverse/transloco';

export type PatternPart = 'name' | 'firstword' | 'short' | 'firstletter' | 'num' | 'letter';

@Component({
  selector: 'app-property-pattern-builder',
  templateUrl: './property-pattern-builder.component.html',
  styleUrls: ['./property-pattern-builder.component.scss'],
  standalone: true,
  imports: [IonLabel, IonNote, IonIcon, IonChip, TranslocoPipe],
})
export class PropertyPatternBuilderComponent {
  readonly includeName = input(false);
  readonly includeFirstWord = input(false);
  readonly includeShort = input(true);
  readonly includeFirstLetter = input(false);
  readonly includeNum = input(true);
  readonly includeLetter = input(false);
  readonly customSeparator = input('');
  readonly displayPattern = input('');

  readonly togglePart = output<PatternPart>();
  readonly separatorChange = output<string>();
}
