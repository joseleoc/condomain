import { Injectable } from '@angular/core';
import { Subject, Observable } from 'rxjs';

/**
 * Types of financial events that can be emitted.
 */
export type FinancialEventType = 
  | 'transaction:created'
  | 'transaction:updated'
  | 'transaction:deleted'
  | 'transaction:status-changed';

/**
 * Payload for financial events.
 */
export interface FinancialEvent {
  type: FinancialEventType;
  condominiumId: string;
  accountId?: string;
  transactionId?: string;
  timestamp: Date;
}

/**
 * Service for emitting and subscribing to financial domain events.
 * 
 * This enables loose coupling between services. For example, when a transaction
 * is created, FinancialTransactions emits an event, and CondominiumAccounts
 * can listen to it and refresh wallet balances without direct dependency.
 * 
 * Usage:
 * - Emit: financialEvents.emit({ type: 'transaction:created', condominiumId: '...', ... })
 * - Subscribe: financialEvents.on('transaction:created').subscribe(event => ...)
 */
@Injectable({ providedIn: 'root' })
export class FinancialEventsService {
  private events$ = new Subject<FinancialEvent>();

  /**
   * Emit a financial event.
   */
  emit(event: FinancialEvent): void {
    this.events$.next(event);
  }

  /**
   * Subscribe to all financial events.
   */
  onAll(): Observable<FinancialEvent> {
    return this.events$.asObservable();
  }

  /**
   * Subscribe to specific event types.
   */
  on(type: FinancialEventType): Observable<FinancialEvent> {
    return new Observable<FinancialEvent>((subscriber) => {
      const subscription = this.events$.subscribe((event) => {
        if (event.type === type) {
          subscriber.next(event);
        }
      });
      return () => subscription.unsubscribe();
    });
  }

  /**
   * Subscribe to events for a specific condominium.
   */
  onCondominium(condominiumId: string): Observable<FinancialEvent> {
    return new Observable<FinancialEvent>((subscriber) => {
      const subscription = this.events$.subscribe((event) => {
        if (event.condominiumId === condominiumId) {
          subscriber.next(event);
        }
      });
      return () => subscription.unsubscribe();
    });
  }

  /**
   * Subscribe to specific event types for a specific condominium.
   */
  onCondominiumEvent(
    condominiumId: string,
    type: FinancialEventType,
  ): Observable<FinancialEvent> {
    return new Observable<FinancialEvent>((subscriber) => {
      const subscription = this.events$.subscribe((event) => {
        if (event.condominiumId === condominiumId && event.type === type) {
          subscriber.next(event);
        }
      });
      return () => subscription.unsubscribe();
    });
  }
}
