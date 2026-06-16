import { Component, OnInit } from '@angular/core';
import { StructuresPropertiesAccordionComponent } from '../structures-properties-accordion/structures-properties-accordion.component';

@Component({
  selector: 'app-step-3',
  templateUrl: './step-3.component.html',
  styleUrls: ['./step-3.component.scss'],
  imports: [StructuresPropertiesAccordionComponent],
})
export class Step3Component implements OnInit {
  constructor() {}

  ngOnInit() {}
}
