import { Component } from '@angular/core';
import { IonApp, IonRouterOutlet } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  add,
  addCircleOutline,
  businessOutline,
  cameraOutline,
  chatbubblesOutline,
  chevronForward,
  documentOutline,
  helpCircleOutline,
  languageOutline,
  menu,
  personOutline,
  remove,
  trashOutline,
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
      chatbubblesOutline,
      personOutline,
      documentOutline,
      trashOutline,
      menu,
      addCircleOutline,
      remove,
      helpCircleOutline,
    });
  }
}
