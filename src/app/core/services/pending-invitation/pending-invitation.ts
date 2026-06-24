import { inject, Injectable } from '@angular/core';
import { Router } from '@angular/router';
import { Auth } from '../auth/auth';
import { filter, take } from 'rxjs';

const PENDING_INVITATION_KEY = 'pending_invitation_code';

@Injectable({
  providedIn: 'root',
})
export class PendingInvitation {
  // --- Dependencies ---
  private router = inject(Router);
  private authService = inject(Auth);

  // --- Constructor ---
  constructor() {
    this.subscribeToAuthChanges();
  }

  // --- Private Methods ---
  private subscribeToAuthChanges(): void {
    this.authService.session$
      .pipe(
        filter((session) => session !== null),
        take(1),
      )
      .subscribe(() => {
        this.handlePostAuthRedirect();
      });
  }

  private handlePostAuthRedirect(): void {
    const code = this.getCode();
    if (code) {
      this.clearCode();
      this.router.navigate(['/onboarding/join-condominium'], {
        queryParams: { code },
      });
    }
  }

  // --- Public Methods ---
  saveCode(code: string): void {
    localStorage.setItem(PENDING_INVITATION_KEY, code);
  }

  getCode(): string | null {
    return localStorage.getItem(PENDING_INVITATION_KEY);
  }

  clearCode(): void {
    localStorage.removeItem(PENDING_INVITATION_KEY);
  }
}
