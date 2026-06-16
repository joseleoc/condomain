import { Component } from '@angular/core';
import { CreationProcessSelectorComponent } from '../creation-process-selector/creation-process-selector.component';

@Component({
  selector: 'app-step-2',
  templateUrl: './step-2.component.html',
  styleUrls: ['./step-2.component.scss'],
  imports: [CreationProcessSelectorComponent],
})
export class Step2Component {}
