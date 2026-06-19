import {
  Component,
  computed,
  inject,
  OnDestroy,
  OnInit,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import {
  IonInput,
  IonLabel,
  IonNote,
  IonIcon,
  IonChip,
  IonButton,
  IonItem,
} from '@ionic/angular/standalone';
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';
import { Subscription } from 'rxjs';
import { Wizard } from '../../services/wizard/wizard';
import { StructuresPropertiesAccordionComponent } from '../structures-properties-accordion/structures-properties-accordion.component';
import { PropertyPatternBuilderComponent } from '../property-pattern-builder/property-pattern-builder.component';
import { PropertyEnumeratorConfigComponent } from '../property-enumerator-config/property-enumerator-config.component';
import { PropertyPreviewComponent } from '../property-preview/property-preview.component';
import type { EnumeratorType } from '@features/create-condominium/create-condominium.types';
import { Toast } from '@core/services/toast/toast';

interface PropertyPreviewGroup {
  structureName: string;
  names: string[];
  fee: number;
}

@Component({
  selector: 'app-massive-property-creation',
  templateUrl: './massive-property-creation.component.html',
  styleUrls: ['./massive-property-creation.component.scss'],
  standalone: true,
  imports: [
    FormsModule,
    IonInput,
    IonLabel,
    IonNote,
    IonIcon,
    IonChip,
    IonButton,
    IonItem,
    TranslocoPipe,
    StructuresPropertiesAccordionComponent,
    PropertyPatternBuilderComponent,
    PropertyEnumeratorConfigComponent,
    PropertyPreviewComponent,
  ],
})
export class MassivePropertyCreationComponent implements OnInit, OnDestroy {
  private wizardService = inject(Wizard);
  private toast = inject(Toast);
  private translocoService = inject(TranslocoService);
  private nextSubscription!: Subscription;

  enumeratorType = signal<EnumeratorType>('number');
  digits = signal(2);
  countPerStructure = signal(2);
  fee = signal(0);
  startAt = signal(1);

  includeName = signal(false);
  includeShort = signal(true);
  includeNum = signal(true);
  customSeparator = signal('');

  nameTemplate = computed(() => {
    const parts: string[] = [];
    if (this.includeName()) parts.push('{name}');
    if (this.includeShort()) parts.push('{short}');
    if (this.includeNum()) parts.push('{num}');
    return parts.join(this.customSeparator());
  });

  hasPart = computed(() => ({
    name: this.includeName(),
    short: this.includeShort(),
    num: this.includeNum(),
  }));

  displayPattern = computed(() => {
    const labels: string[] = [];
    if (this.includeName()) labels.push('...');
    if (this.includeShort()) labels.push('---');
    if (this.includeNum()) labels.push('#');
    return labels.join(this.customSeparator() || ' + ');
  });

  structures = computed(() => this.wizardService.structures$.getValue());
  showingGenerator = signal(true);

  preview = computed(() => {
    const result: PropertyPreviewGroup[] = [];

    for (const structure of this.structures()) {
      const names = this.generateNames(structure.name);
      result.push({
        structureName: structure.name,
        names,
        fee: this.fee(),
      });
    }

    return result;
  });

  private getShortName(name: string): string {
    const parts = name.trim().split(/\s+/);
    return parts.length > 1 ? parts[parts.length - 1] : name;
  }

  private formatEnum(index: number): string {
    const num = this.startAt() + index;
    return this.enumeratorType() === 'letter'
      ? this.numberToLetters(num)
      : String(num).padStart(this.digits(), '0');
  }

  private numberToLetters(n: number): string {
    let label = '';
    let num = n;
    do {
      num--;
      label = String.fromCharCode(65 + (num % 26)) + label;
      num = Math.floor(num / 26);
    } while (num > 0);
    return label;
  }

  private generateNames(structureName: string): string[] {
    const names: string[] = [];
    const shortName = this.getShortName(structureName);
    const count = this.countPerStructure();

    for (let i = 0; i < count; i++) {
      const enumStr = this.formatEnum(i);
      const name = this.nameTemplate()
        .replace(/{name}/g, structureName)
        .replace(/{short}/g, shortName)
        .replace(/{num}/g, enumStr);

      names.push(name);
    }

    return names;
  }

  totalPropertyCount = computed(() => {
    return this.preview().reduce((acc, g) => acc + g.names.length, 0);
  });

  ngOnInit(): void {
    this.showingGenerator.set(!this.hasAnyProperties());

    this.nextSubscription = this.wizardService.nextStep$.subscribe(() => {
      if (this.showingGenerator()) {
        const preview = this.preview();
        const total = preview.reduce((acc, g) => acc + g.names.length, 0);

        if (total === 0) {
          this.toast.present({
            message: this.translocoService.translate(
              'condominium.massiveProperty.emptyPreview',
            ),
            dismissButton: true,
          });
          return;
        }

        for (const group of preview) {
          for (const name of group.names) {
            this.wizardService.addPropertyToStructure(group.structureName, {
              number: name,
              fee: group.fee,
              structure: group.structureName,
              ownerName: null,
              ownerEmail: null,
            });
          }
        }

        this.showingGenerator.set(false);
      } else {
        this.wizardService.createStructuresAndProperties();
      }
    });
  }

  ngOnDestroy(): void {
    this.nextSubscription?.unsubscribe();
  }

  private hasAnyProperties(): boolean {
    return this.structures().some((s) => s.properties.length > 0);
  }

  setFee(value: unknown): void {
    this.fee.set(Number(value) || 0);
  }

  setCount(value: unknown): void {
    this.countPerStructure.set(Math.max(1, Number(value) || 1));
  }

  togglePart(part: 'name' | 'short' | 'num'): void {
    switch (part) {
      case 'name':
        this.includeName.update((v) => !v);
        break;
      case 'short':
        this.includeShort.update((v) => !v);
        break;
      case 'num':
        this.includeNum.update((v) => !v);
        break;
    }
  }

  handleStartAtChange(value: unknown): void {
    this.startAt.set(Math.max(1, Number(value) || 1));
  }

  handleIncrementStartAt(): void {
    this.startAt.update((v) => v + 1);
  }

  handleDecrementStartAt(): void {
    this.startAt.update((v) => Math.max(1, v - 1));
  }

  handleDigitsChange(value: number): void {
    this.digits.set(Math.max(1, Math.min(5, value)));
  }
}
