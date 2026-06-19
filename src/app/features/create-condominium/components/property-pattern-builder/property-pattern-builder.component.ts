import { Component, input, output, signal, computed } from '@angular/core';
import {
  IonLabel,
  IonNote,
  IonIcon,
  IonChip,
  IonInput,
  IonItem,
} from '@ionic/angular/standalone';
import { TranslocoPipe } from '@jsverse/transloco';
import { FormsModule } from '@angular/forms';

export type PatternPart = 'name' | 'firstword' | 'short' | 'firstletter' | 'lastletter' | 'custom' | 'num' | 'letter';

const VISIBLE_CHIP_COUNT = 4;

const CHIP_DEFS: { part: PatternPart; labelKey: string }[] = [
  { part: 'name', labelKey: 'condominium.massiveProperty.componentName' },
  { part: 'firstword', labelKey: 'condominium.massiveProperty.componentFirstWord' },
  { part: 'short', labelKey: 'condominium.massiveProperty.componentShort' },
  { part: 'firstletter', labelKey: 'condominium.massiveProperty.componentFirstLetter' },
  { part: 'lastletter', labelKey: 'condominium.massiveProperty.componentLastLetter' },
  { part: 'num', labelKey: 'condominium.massiveProperty.componentSequenceNum' },
  { part: 'letter', labelKey: 'condominium.massiveProperty.componentSequenceLetter' },
  { part: 'custom', labelKey: 'condominium.massiveProperty.componentCustom' },
];

@Component({
  selector: 'app-property-pattern-builder',
  templateUrl: './property-pattern-builder.component.html',
  styleUrls: ['./property-pattern-builder.component.scss'],
  standalone: true,
  imports: [IonLabel, IonNote, IonIcon, IonChip, IonInput, IonItem, TranslocoPipe, FormsModule],
})
export class PropertyPatternBuilderComponent {
  readonly includeName = input(false);
  readonly includeFirstWord = input(false);
  readonly includeShort = input(true);
  readonly includeFirstLetter = input(false);
  readonly includeLastLetter = input(false);
  readonly includeCustom = input(false);
  readonly includeNum = input(true);
  readonly includeLetter = input(false);
  readonly customSeparator = input('');
  readonly displayPattern = input('');
  readonly prefix = input('');
  readonly suffix = input('');
  readonly customWord = input('');
  readonly selectedParts = input<PatternPart[]>([]);

  readonly togglePart = output<PatternPart>();
  readonly separatorChange = output<string>();
  readonly prefixChange = output<string>();
  readonly suffixChange = output<string>();
  readonly customWordChange = output<string>();

  readonly expanded = signal(false);

  readonly sortedChips = computed(() => {
    const order = this.selectedParts();
    const selected: typeof CHIP_DEFS = [];
    const unselected: typeof CHIP_DEFS = [];

    for (const chip of CHIP_DEFS) {
      if (order.includes(chip.part)) {
        selected.push(chip);
      } else {
        unselected.push(chip);
      }
    }

    selected.sort((a, b) => order.indexOf(a.part) - order.indexOf(b.part));
    unselected.sort((a, b) => a.part.localeCompare(b.part));

    return [...selected, ...unselected];
  });

  readonly visibleChips = computed(() =>
    this.expanded() ? this.sortedChips() : this.sortedChips().slice(0, VISIBLE_CHIP_COUNT),
  );

  readonly hasHidden = computed(() => this.sortedChips().length > VISIBLE_CHIP_COUNT);

  includeForPart(part: PatternPart): boolean {
    switch (part) {
      case 'name': return this.includeName();
      case 'firstword': return this.includeFirstWord();
      case 'short': return this.includeShort();
      case 'firstletter': return this.includeFirstLetter();
      case 'lastletter': return this.includeLastLetter();
      case 'custom': return this.includeCustom();
      case 'num': return this.includeNum();
      case 'letter': return this.includeLetter();
    }
  }

  toggleExpanded(): void {
    this.expanded.update((v) => !v);
  }
}
