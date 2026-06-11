import { inject, Injectable, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';
import { Supabase } from '@core/services/supabase/supabase';
import { Session, Subscription } from '@supabase/supabase-js';
import { BehaviorSubject, map } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class Auth implements OnDestroy {
  // --- Properties ---
  private client = inject(Supabase).client;
  private router = inject(Router);
  private authStateSubscription: Subscription;

  // --- Properties ---
  session = new BehaviorSubject<Session | null>(null);
  isAuthenticated$ = this.session.asObservable().pipe(map((session) => !!session));

  // --- Constructor ---
  constructor() {
    this.client.auth.getSession().then(({ data }) => {
      this.session.next(data.session);
    });

    this.authStateSubscription = this.client.auth.onAuthStateChange(
      (_event, session) => {
        this.session.next(session);
      },
    ).data.subscription;
  }

  // --- Lifecycle Hooks ---
  ngOnDestroy(): void {
    this.authStateSubscription.unsubscribe();
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

  async signInWithEmailAndPassword(email: string, password: string) {
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
      await this.router.navigate(['/auth/sign-in'], { replaceUrl: true });
    } catch (error) {
      console.log(error);

      throw error;
    }
  }
}
