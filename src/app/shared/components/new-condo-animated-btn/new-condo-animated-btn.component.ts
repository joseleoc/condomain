import { Component, OnInit } from '@angular/core';
import { IonButton, IonIcon } from '@ionic/angular/standalone';
import { TranslocoPipe } from '@jsverse/transloco';

@Component({
  selector: 'app-new-condo-animated-btn',
  templateUrl: './new-condo-animated-btn.component.html',
  styleUrls: ['./new-condo-animated-btn.component.scss'],
  imports: [IonButton, TranslocoPipe, IonIcon],
})
export class NewCondoAnimatedBtnComponent implements OnInit {
  constructor() {}

  ngOnInit() {}
}
