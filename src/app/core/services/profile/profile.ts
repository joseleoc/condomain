import { inject, Injectable, OnDestroy } from '@angular/core';
import { Supabase } from '../supabase/supabase';
import { Auth } from '../auth/auth';
import { Profile as ProfileType } from '@app-types/profile';
import { BehaviorSubject } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class Profile implements OnDestroy {
  // --- Dependencies ---
  private authService = inject(Auth);
  private client = inject(Supabase).client;

  // --- Properties ---
  private sessionSubscription;
  profile$ = new BehaviorSubject<ProfileType | null>(null);

  constructor() {
    this.sessionSubscription = this.authService.session$.subscribe(
      (session) => {
        if (session) {
          this.loadProfile(session.user.id).catch((error) => {
            console.error('Error loading profile:', error);
            this.profile$.next(null);
          });
        } else {
          this.profile$.next(null);
        }
      },
    );
  }

  // --- Lifecycle Hooks ---
  ngOnDestroy(): void {
    this.sessionSubscription.unsubscribe();
  }

  // --- Methods ---
  async loadProfile(profileId: string) {
    try {
      const { data, error } = await this.client
        .from('profiles')
        .select('*')
        .eq('id', profileId)
        .single();

      if (error) {
        throw error;
      }

      this.profile$.next(data);
    } catch (error) {
      throw error;
    }
  }
}
