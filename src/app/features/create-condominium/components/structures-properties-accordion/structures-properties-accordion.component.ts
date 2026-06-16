import { Component, inject, OnInit, computed } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { Structures } from '@features/create-condominium/services/structures/structures';
import { IonAccordionGroup, IonAccordion, IonItem, IonIcon, IonList } from '@ionic/angular/standalone';

@Component({
  selector: 'app-structures-properties-accordion',
  templateUrl: './structures-properties-accordion.component.html',
  styleUrls: ['./structures-properties-accordion.component.scss'],
  imports: [IonAccordionGroup, IonAccordion, IonItem, IonIcon, IonList],
})
export class StructuresPropertiesAccordionComponent implements OnInit {
  // --- Dependencies ---
  private structuresService = inject(Structures);

  // --- Properties ---
  structures = toSignal(this.structuresService.structures$);

  constructor() {}

  ngOnInit() {}
}
