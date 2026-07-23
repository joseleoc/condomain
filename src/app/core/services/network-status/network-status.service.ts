import { Injectable, signal, Signal } from '@angular/core';
import { Network } from '@capacitor/network';
import type { ConnectionStatus } from '@capacitor/network';

@Injectable({ providedIn: 'root' })
export class NetworkStatusService {
  #isOnline = signal<boolean>(navigator.onLine);

  /**
   * Reactive signal indicating whether the device is currently online.
   * Returns `true` when connected, `false` when offline.
   */
  readonly isOnline: Signal<boolean> = this.#isOnline.asReadonly();

  constructor() {
    this.#initListeners();
  }

  async #initListeners(): Promise<void> {
    // Get initial status via Capacitor (works on both native and web)
    try {
      const status: ConnectionStatus = await Network.getStatus();
      this.#isOnline.set(status.connected);
    } catch {
      // Fallback to browser API if Capacitor is not available
      this.#isOnline.set(navigator.onLine);
    }

    // Listen for network status changes via Capacitor
    try {
      Network.addListener('networkStatusChange', (status: ConnectionStatus) => {
        this.#isOnline.set(status.connected);
      });
    } catch {
      // Fallback to browser events if Capacitor is not available
      window.addEventListener('online', () => this.#isOnline.set(true));
      window.addEventListener('offline', () => this.#isOnline.set(false));
    }
  }
}
