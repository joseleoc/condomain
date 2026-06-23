import {
  Component,
  computed,
  inject,
  OnDestroy,
  OnInit,
  signal,
  viewChild,
} from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import {
  IonInput,
  IonNote,
  IonIcon,
  IonChip,
  IonButton,
  IonItem,
  IonHeader,
  IonModal,
  IonToolbar,
  IonTitle,
  IonButtons,
  IonContent,
  IonFooter,
} from '@ionic/angular/standalone';
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';
import { Subscription } from 'rxjs';
import { Wizard } from '../../services/wizard/wizard';
import { PropertyFormComponent } from '@shared/components/property-form/property-form.component';
import { StructuresPropertiesAccordionComponent } from '../structures-properties-accordion/structures-properties-accordion.component';
import {
  PropertyPatternBuilderComponent,
  PatternPart,
} from '../property-pattern-builder/property-pattern-builder.component';
import { PropertyPreviewComponent } from '../property-preview/property-preview.component';
import { Toast } from '@core/services/toast/toast';
import { PropertyWithStructure } from '@features/create-condominium/create-condominium.types';
import { TelemetryService } from '@core/services/telemetry';
import { TelemetryEvents } from '@core/services/telemetry/telemetry.types';

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
    IonNote,
    IonIcon,
    IonChip,
    IonButton,
    IonItem,
    IonHeader,
    IonModal,
    IonToolbar,
    IonTitle,
    IonButtons,
    IonContent,
    IonFooter,
    TranslocoPipe,
    PropertyFormComponent,
    StructuresPropertiesAccordionComponent,
    PropertyPatternBuilderComponent,
    PropertyPreviewComponent,
  ],
})
export class MassivePropertyCreationComponent implements OnInit, OnDestroy {
  private wizardService = inject(Wizard);
  private toast = inject(Toast);
  private translocoService = inject(TranslocoService);
  private telemetry = inject(TelemetryService);
  private nextSubscription!: Subscription;
  private backSubscription!: Subscription;

  propertyFormComponent = viewChild(PropertyFormComponent);

  isEditModalOpen = signal(false);
  isAdding = signal(false);

  digits = signal(2);
  countPerStructure = signal(2);
  fee = signal(0);
  startAtNum = signal(1);
  startAtLetter = signal(1);
  splitEqually = signal(true);

  patternOrder = signal<PatternPart[]>(['short', 'num']);
  customSeparator = signal('');
  prefix = signal('');
  suffix = signal('');
  customWord = signal('');

  includeName = computed(() => this.patternOrder().includes('name'));
  includeFirstWord = computed(() => this.patternOrder().includes('firstword'));
  includeShort = computed(() => this.patternOrder().includes('short'));
  includeFirstLetter = computed(() =>
    this.patternOrder().includes('firstletter'),
  );
  includeLastLetter = computed(() =>
    this.patternOrder().includes('lastletter'),
  );
  includeCustom = computed(() => this.patternOrder().includes('custom'));
  includeNum = computed(() => this.patternOrder().includes('num'));
  includeLetter = computed(() => this.patternOrder().includes('letter'));

  nameTemplate = computed(() => {
    const parts = this.patternOrder().map((p) => `{${p}}`);
    const joined = parts.join(this.customSeparator());
    const p = this.prefix();
    const s = this.suffix();
    return (
      (p ? p + this.customSeparator() : '') +
      joined +
      (s ? this.customSeparator() + s : '')
    );
  });

  hasPattern = computed(() => this.patternOrder().length > 0);

  displayPattern = computed(() => {
    const structures = this.structures();
    const name = structures.length > 0 ? structures[0].name : 'Estructura';
    return this.generateNames(name)[0] || '';
  });

  existingTotalFee = computed(() => {
    const totalFee = this.structures().reduce((total, s) => {
      return total + s.properties.reduce((sum, p) => sum + (p.fee || 0), 0);
    }, 0);
    return parseFloat(totalFee.toFixed(4));
  });

  remainingFee = computed(() => Math.max(0, 100 - this.existingTotalFee()));

  maxFee = computed(() => {
    const count = this.totalPropertyCount();
    if (count === 0) return 100;
    return Math.floor(this.remainingFee() / count);
  });

  structures = toSignal(this.wizardService.structures$, { initialValue: [] });
  firstStructureName = computed(() => this.structures()[0]?.name ?? null);
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

  totalPropertyCount = computed(() => {
    return this.preview().reduce((acc, g) => acc + g.names.length, 0);
  });

  ngOnInit(): void {
    this.showingGenerator.set(!this.hasAnyProperties());

    this.nextSubscription = this.wizardService.nextStep$.subscribe(() => {
      if (this.showingGenerator()) {
        const preview = this.preview();
        const total = preview.reduce((acc, g) => acc + g.names.length, 0);

        if (!this.hasPattern() || total === 0) {
          this.toast.present({
            message: this.translocoService.translate(
              'condominium.massiveProperty.emptyPreview',
            ),
            dismissButton: true,
          });
          return;
        }

        if (this.splitEqually()) {
          this.createPropertiesWithEqualFee(preview, total);
        } else {
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
        }

        try {
          const totalGenerated = preview.reduce(
            (acc, g) => acc + g.names.length,
            0,
          );
          this.telemetry.track(TelemetryEvents.PROPERTY_GENERATION_COMPLETED, {
            count: totalGenerated,
            mode: 'massive',
          });
        } catch {
          // Telemetry must never break wizard flow
        }

        this.showingGenerator.set(false);
      } else {
        this.wizardService.createStructuresAndProperties();
      }
    });

    this.backSubscription = this.wizardService.backStep$.subscribe(() => {
      if (!this.showingGenerator()) {
        this.showingGenerator.set(true);
        this.wizardService.markBackHandled();
      }
    });
  }

  ngOnDestroy(): void {
    this.nextSubscription?.unsubscribe();
    this.backSubscription?.unsubscribe();
  }

  private hasAnyProperties(): boolean {
    return this.structures().some((s) => s.properties.length > 0);
  }

  private createPropertiesWithEqualFee(
    preview: PropertyPreviewGroup[],
    totalProperties: number,
  ): void {
    const baseFee = 100 / totalProperties;
    for (const group of preview) {
      for (const name of group.names) {
        const fee = baseFee;
        this.wizardService.addPropertyToStructure(group.structureName, {
          number: name,
          fee,
          structure: group.structureName,
          ownerName: null,
          ownerEmail: null,
        });
      }
    }
  }

  private getParts(name: string): {
    firstWord: string;
    lastWord: string;
    firstLetter: string;
    lastLetter: string;
  } {
    const words = name.trim().split(/\s+/);
    const trimmed = name.trim();
    return {
      firstWord: words[0],
      lastWord: words.length > 1 ? words[words.length - 1] : name,
      firstLetter: trimmed.charAt(0).toUpperCase(),
      lastLetter: trimmed.charAt(trimmed.length - 1).toUpperCase(),
    };
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

  private formatEnum(index: number): { num: string; letter: string } {
    const n = this.startAtNum() + index;
    const l = this.startAtLetter() + index;
    return {
      num: String(n).padStart(this.digits(), '0'),
      letter: this.numberToLetters(l),
    };
  }

  private generateNames(structureName: string): string[] {
    const names: string[] = [];
    const { firstWord, lastWord, firstLetter, lastLetter } =
      this.getParts(structureName);
    const count = this.countPerStructure();

    for (let i = 0; i < count; i++) {
      const { num, letter } = this.formatEnum(i);
      const name = this.nameTemplate()
        .replace(/{name}/g, structureName)
        .replace(/{firstword}/g, firstWord)
        .replace(/{short}/g, lastWord)
        .replace(/{firstletter}/g, firstLetter)
        .replace(/{lastletter}/g, lastLetter)
        .replace(/{custom}/g, this.customWord())
        .replace(/{num}/g, num)
        .replace(/{letter}/g, letter);

      names.push(name);
    }

    return names;
  }

  setFee(value: unknown): void {
    this.fee.set(Math.min(this.maxFee(), Number(value) || 0));
  }

  setCount(value: unknown): void {
    this.countPerStructure.set(Math.max(1, Number(value) || 1));
    if (this.splitEqually()) {
      this.applySplitEqually();
    }
  }

  togglePart(part: PatternPart): void {
    this.patternOrder.update((order) => {
      if (order.includes(part)) {
        return order.filter((p) => p !== part);
      }
      return [...order, part];
    });
  }

  toggleSplitEqually(): void {
    this.splitEqually.update((v) => !v);
    if (this.splitEqually()) {
      this.applySplitEqually();
    }
  }

  private applySplitEqually(): void {
    const count = Math.max(1, this.totalPropertyCount());
    const fee = Math.floor(this.remainingFee() / count);
    this.fee.set(Math.min(fee, this.maxFee()));
  }

  handleDigitsChange(value: number): void {
    this.digits.set(Math.max(1, Math.min(5, value)));
  }

  handleStartAtNumChange(value: unknown): void {
    this.startAtNum.set(Math.max(1, Number(value) || 1));
  }

  handleIncrementStartAtNum(): void {
    this.startAtNum.update((v) => v + 1);
  }

  handleDecrementStartAtNum(): void {
    this.startAtNum.update((v) => Math.max(1, v - 1));
  }

  handleStartAtLetterChange(value: unknown): void {
    this.startAtLetter.set(Math.max(1, Number(value) || 1));
  }

  handleIncrementStartAtLetter(): void {
    this.startAtLetter.update((v) => v + 1);
  }

  handleDecrementStartAtLetter(): void {
    this.startAtLetter.update((v) => Math.max(1, v - 1));
  }

  editProperty(property: PropertyWithStructure): void {
    this.isAdding.set(false);
    this.wizardService.selectedProperty.set(property);
    this.isEditModalOpen.set(true);
  }

  openAddPropertyModal(): void {
    this.isAdding.set(true);
    this.wizardService.selectedProperty.set(null);
    this.isEditModalOpen.set(true);
  }

  closeEditModal(): void {
    this.isEditModalOpen.set(false);
    this.wizardService.selectedProperty.set(null);
  }

  handleSaveProperty(): void {
    const formData = this.propertyFormComponent()?.submit();
    if (formData) {
      // Map PropertyFormValue to CreatePropertyFormData for wizard
      const createPropertyData = {
        number: formData.name,
        fee: formData.share_percentage,
        structure: formData.structure_id, // In wizard, structure_id is the structure name
        ownerName: formData.owner_name,
        ownerEmail: formData.owner_email,
      };

      if (this.isAdding()) {
        this.wizardService.addPropertyToStructure(
          formData.structure_id,
          createPropertyData,
        );
      } else {
        this.wizardService.editPropertyInStructure({
          ...createPropertyData,
          structureName: formData.structure_id,
        });
      }
      this.closeEditModal();
    }
  }

  /**
   * Maps the wizard's selectedProperty to the form's initialData format.
   */
  getPropertyInitialData() {
    const selected = this.wizardService.selectedProperty();
    if (!selected) return null;
    return {
      name: selected.number,
      share_percentage: selected.fee,
      structure_id: selected.structure, // In wizard, structure is the structure name
      owner_name: selected.ownerName,
      owner_email: selected.ownerEmail,
    };
  }

  /**
   * Maps wizard structures to StructureOption format for the dropdown.
   * In wizard context, structure name is used as the ID.
   */
  getStructureOptions() {
    const structures = this.wizardService.structures$.getValue();
    return structures.map((s) => ({
      id: s.name, // Use name as ID in wizard context
      name: s.name,
    }));
  }
}
