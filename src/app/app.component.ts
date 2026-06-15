import { Component } from '@angular/core';
import { IonApp, IonRouterOutlet } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  add,
  businessOutline,
  cameraOutline,
  chevronForward,
  languageOutline,
} from 'ionicons/icons';

@Component({
  selector: 'app-root',
  templateUrl: 'app.component.html',
  imports: [IonApp, IonRouterOutlet],
})
export class AppComponent {
  constructor() {
    addIcons({
      languageOutline,
      chevronForward,
      add,
      cameraOutline,
      businessOutline,
    });
  }
}
