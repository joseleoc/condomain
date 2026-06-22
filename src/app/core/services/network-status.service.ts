import { Injectable, signal, Signal } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class NetworkStatusService {
  #isOnline = signal<boolean>(navigator.onLine);

  /**
   * Reactive signal indicating whether the device is currently online.
   * Returns `true` when connected, `false` when offline.
   */
  readonly isOnline: Signal<boolean> = this.#isOnline.asReadonly();

  constructor() {
    this.#initWebListeners();
  }

  #initWebListeners(): void {
    window.addEventListener('online', () => this.#isOnline.set(true));
    window.addEventListener('offline', () => this.#isOnline.set(false));
  }
}
