import { inject } from '@angular/core';
import { CanActivateFn } from '@angular/router';
import { PendingInvitation } from '@core/services/pending-invitation/pending-invitation';

export const captureInvitationCodeGuard: CanActivateFn = (route) => {
  const pendingInvitation = inject(PendingInvitation);
  const code = route.queryParamMap.get('code');

  if (code) {
    pendingInvitation.saveCode(code);
  }

  return true;
};
