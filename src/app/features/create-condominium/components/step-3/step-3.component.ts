import { Component, OnInit } from '@angular/core';
import { StructuresPropertiesAccordionComponent } from '../structures-properties-accordion/structures-properties-accordion.component';
import { CreatePropertyFormComponent } from '../create-property-form/create-property-form.component';
import {
  IonCard,
  IonCardContent,
  IonCardHeader,
  IonCardTitle,
} from '@ionic/angular/standalone';
import { TranslocoPipe } from '@jsverse/transloco';

@Component({
  selector: 'app-step-3',
  templateUrl: './step-3.component.html',
  styleUrls: ['./step-3.component.scss'],
  imports: [
    StructuresPropertiesAccordionComponent,
    CreatePropertyFormComponent,
    IonCard,
    IonCardContent,
    IonCardHeader,
    IonCardTitle,
    TranslocoPipe,
  ],
})
export class Step3Component implements OnInit {
  constructor() {}

  ngOnInit() {}
}
