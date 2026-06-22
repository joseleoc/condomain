import { Component, inject, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { NetworkStatusService } from '@core/services/network-status.service';

/**
 * Small, reusable component that shows online/offline status.
 * Displays a subtle warning banner at the top of the screen when offline.
 *
 * Usage:
 *   <app-offline-indicator />
 */
@Component({
  selector: 'app-offline-indicator',
  standalone: true,
  imports: [CommonModule, IonicModule],
  templateUrl: './offline-indicator.component.html',
  styleUrls: ['./offline-indicator.component.scss'],
})
export class OfflineIndicatorComponent {
  #networkStatus = inject(NetworkStatusService);

  /**
   * Computed signal that is true only when the device is offline.
   */
  readonly isOffline = computed(() => !this.#networkStatus.isOnline());
}
