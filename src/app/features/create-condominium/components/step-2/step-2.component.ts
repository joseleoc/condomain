import { Component, OnInit } from '@angular/core';
import { StructuresListEmptyComponent } from '../structures-list-empty/structures-list-empty.component';

@Component({
  selector: 'app-step-2',
  templateUrl: './step-2.component.html',
  styleUrls: ['./step-2.component.scss'],
  imports: [StructuresListEmptyComponent],
})
export class Step2Component implements OnInit {
  constructor() {}

  ngOnInit() {}
}
