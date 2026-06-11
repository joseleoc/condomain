import { inject, Injectable, OnDestroy } from '@angular/core';
import { Supabase } from '@core/services/supabase/supabase';
import { Session } from '@supabase/supabase-js';
import { BehaviorSubject } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class Auth implements OnDestroy {
  // --- Properties ---
  private client = inject(Supabase).client;

  // --- Properties ---
  session = new BehaviorSubject<Session | null>(null);

  // --- Constructor ---
  constructor() {}

  // --- Lifecycle Hooks ---
  ngOnDestroy(): void {
    this.session.complete();
  }

  // --- Methods ---
  async signUpWithEmailAndPassword(email: string, password: string) {
    try {
      const { data, error } = await this.client.auth.signUp({
        email,
        password,
      });
      if (error) {
        throw error;
      }
      this.session.next(data.session);
      return data;
    } catch (error) {
      console.log(error);
      this.session.next(null);
      throw error;
    }
  }

  async signIn(email: string, password: string) {
    try {
      const { data, error } = await this.client.auth.signInWithPassword({
        email,
        password,
      });
      if (error) {
        throw error;
      }
      this.session.next(data.session);
      return data;
    } catch (error) {
      console.log(error);

      this.session.next(null);
      throw error;
    }
  }

  async signOut() {
    try {
      const { error } = await this.client.auth.signOut();
      if (error) {
        throw error;
      }
      this.session.next(null);
    } catch (error) {
      console.log(error);

      throw error;
    }
  }
}
