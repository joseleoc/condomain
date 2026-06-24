import { Component, inject } from '@angular/core';
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
  ellipsisHorizontalCircleOutline,
  helpCircleOutline,
  homeOutline,
  languageOutline,
  menu,
  personOutline,
  remove,
  trashOutline,
  shieldCheckmarkOutline,
} from 'ionicons/icons';
import { PendingInvitation } from '@core/services/pending-invitation/pending-invitation';

@Component({
  selector: 'app-root',
  templateUrl: 'app.component.html',
  imports: [IonApp, IonRouterOutlet],
})
export class AppComponent {
  // Eagerly instantiate to subscribe to auth changes for pending invitation redirect
  private pendingInvitation = inject(PendingInvitation);

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
      ellipsisHorizontalCircleOutline,
      homeOutline,
      shieldCheckmarkOutline,
    });
  }
}
