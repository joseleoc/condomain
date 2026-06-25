import { TestBed } from '@angular/core/testing';
import { SharedTestingModule } from '@testing/shared-testing.module';
import { CondominiumJoinRequest } from './condominium-join-request';
import { Supabase } from '../supabase/supabase';
import { Profile } from '../profile/profile';
import { Roles } from '../roles/roles';
import { of, throwError } from 'rxjs';
import type { JoinRequestStatus } from '@app-types/join-request';

describe('CondominiumJoinRequest', () => {
  let service: CondominiumJoinRequest;
  let supabaseMock: any;
  let profileMock: any;
  let rolesMock: any;

  beforeEach(() => {
    supabaseMock = {
      client: {
        from: jasmine.createSpy('from').and.returnValue({
          select: jasmine.createSpy('select').and.returnValue({
            eq: jasmine.createSpy('eq').and.returnValue({
              is: jasmine.createSpy('is').and.returnValue({
                single: jasmine.createSpy('single').and.returnValue(Promise.resolve({ data: null, error: null })),
                maybeSingle: jasmine.createSpy('maybeSingle').and.returnValue(Promise.resolve({ data: null, error: null })),
              }),
              single: jasmine.createSpy('single').and.returnValue(Promise.resolve({ data: null, error: null })),
              maybeSingle: jasmine.createSpy('maybeSingle').and.returnValue(Promise.resolve({ data: null, error: null })),
            }),
          }),
          insert: jasmine.createSpy('insert').and.returnValue(Promise.resolve({ error: null })),
          update: jasmine.createSpy('update').and.returnValue({
            eq: jasmine.createSpy('eq').and.returnValue(Promise.resolve({ error: null })),
          }),
          rpc: jasmine.createSpy('rpc').and.returnValue(Promise.resolve({ error: null })),
        }),
      },
    };

    profileMock = {
      profile$: of({ id: 'test-profile-id', name: 'Test User', email: 'test@example.com' }),
    };

    rolesMock = {
      getRoleIdByName: jasmine.createSpy('getRoleIdByName').and.returnValue('test-role-id'),
    };

    TestBed.configureTestingModule({
      imports: [SharedTestingModule],
      providers: [
        { provide: Supabase, useValue: supabaseMock },
        { provide: Profile, useValue: profileMock },
        { provide: Roles, useValue: rolesMock },
      ],
    });

    service = TestBed.inject(CondominiumJoinRequest);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('submitJoinRequest', () => {
    it('should submit a join request successfully', async () => {
      const mockInvitation = {
        id: 'invitation-id',
        condominium_id: 'condo-id',
        max_uses: null,
        uses_count: 0,
        expires_at: null,
        active: true,
      };

      supabaseMock.client.from = jasmine.createSpy('from').and.callFake((table: string) => {
        if (table === 'condominium_invitation_codes') {
          return {
            select: jasmine.createSpy('select').and.returnValue({
              eq: jasmine.createSpy('eq').and.callFake((field: string, value: string) => {
                if (field === 'code') {
                  return {
                    is: jasmine.createSpy('is').and.returnValue({
                      eq: jasmine.createSpy('eq').and.returnValue({
                        single: jasmine.createSpy('single').and.returnValue(
                          Promise.resolve({ data: mockInvitation, error: null })
                        ),
                      }),
                    }),
                  };
                }
                return {
                  single: jasmine.createSpy('single').and.returnValue(
                    Promise.resolve({ data: null, error: null })
                  ),
                };
              }),
            }),
          };
        }
        if (table === 'condominium_join_requests') {
          return {
            select: jasmine.createSpy('select').and.returnValue({
              eq: jasmine.createSpy('eq').and.returnValue({
                eq: jasmine.createSpy('eq').and.returnValue({
                  eq: jasmine.createSpy('eq').and.returnValue({
                    maybeSingle: jasmine.createSpy('maybeSingle').and.returnValue(
                      Promise.resolve({ data: null, error: null })
                    ),
                  }),
                }),
              }),
            }),
            insert: jasmine.createSpy('insert').and.returnValue(Promise.resolve({ error: null })),
          };
        }
        return { select: jasmine.createSpy('select').and.returnValue({}) };
      });

      const result = await service.submitJoinRequest('123456');
      expect(result.success).toBeTrue();
    });

    it('should return error when invitation code not found', async () => {
      supabaseMock.client.from = jasmine.createSpy('from').and.callFake((table: string) => {
        if (table === 'condominium_invitation_codes') {
          return {
            select: jasmine.createSpy('select').and.returnValue({
              eq: jasmine.createSpy('eq').and.returnValue({
                is: jasmine.createSpy('is').and.returnValue({
                  eq: jasmine.createSpy('eq').and.returnValue({
                    single: jasmine.createSpy('single').and.returnValue(
                      Promise.resolve({ data: null, error: { message: 'Not found' } })
                    ),
                  }),
                }),
              }),
            }),
          };
        }
        return { select: jasmine.createSpy('select').and.returnValue({}) };
      });

      const result = await service.submitJoinRequest('999999');
      expect(result.success).toBeFalse();
      expect(result.error).toBe('not_found');
    });

    it('should return error when invitation has expired', async () => {
      const expiredInvitation = {
        id: 'invitation-id',
        condominium_id: 'condo-id',
        max_uses: null,
        uses_count: 0,
        expires_at: new Date(Date.now() - 86400000).toISOString(), // Yesterday
        active: true,
      };

      supabaseMock.client.from = jasmine.createSpy('from').and.callFake((table: string) => {
        if (table === 'condominium_invitation_codes') {
          return {
            select: jasmine.createSpy('select').and.returnValue({
              eq: jasmine.createSpy('eq').and.returnValue({
                is: jasmine.createSpy('is').and.returnValue({
                  eq: jasmine.createSpy('eq').and.returnValue({
                    single: jasmine.createSpy('single').and.returnValue(
                      Promise.resolve({ data: expiredInvitation, error: null })
                    ),
                  }),
                }),
              }),
            }),
          };
        }
        return { select: jasmine.createSpy('select').and.returnValue({}) };
      });

      const result = await service.submitJoinRequest('123456');
      expect(result.success).toBeFalse();
      expect(result.error).toBe('not_found');
    });

    it('should return error when max uses reached', async () => {
      const maxedOutInvitation = {
        id: 'invitation-id',
        condominium_id: 'condo-id',
        max_uses: 5,
        uses_count: 5,
        expires_at: null,
        active: true,
      };

      supabaseMock.client.from = jasmine.createSpy('from').and.callFake((table: string) => {
        if (table === 'condominium_invitation_codes') {
          return {
            select: jasmine.createSpy('select').and.returnValue({
              eq: jasmine.createSpy('eq').and.returnValue({
                is: jasmine.createSpy('is').and.returnValue({
                  eq: jasmine.createSpy('eq').and.returnValue({
                    single: jasmine.createSpy('single').and.returnValue(
                      Promise.resolve({ data: maxedOutInvitation, error: null })
                    ),
                  }),
                }),
              }),
            }),
          };
        }
        return { select: jasmine.createSpy('select').and.returnValue({}) };
      });

      const result = await service.submitJoinRequest('123456');
      expect(result.success).toBeFalse();
      expect(result.error).toBe('not_found');
    });

    it('should return error when pending request already exists', async () => {
      const mockInvitation = {
        id: 'invitation-id',
        condominium_id: 'condo-id',
        max_uses: null,
        uses_count: 0,
        expires_at: null,
        active: true,
      };

      supabaseMock.client.from = jasmine.createSpy('from').and.callFake((table: string) => {
        if (table === 'condominium_invitation_codes') {
          return {
            select: jasmine.createSpy('select').and.returnValue({
              eq: jasmine.createSpy('eq').and.returnValue({
                is: jasmine.createSpy('is').and.returnValue({
                  eq: jasmine.createSpy('eq').and.returnValue({
                    single: jasmine.createSpy('single').and.returnValue(
                      Promise.resolve({ data: mockInvitation, error: null })
                    ),
                  }),
                }),
              }),
            }),
          };
        }
        if (table === 'condominium_join_requests') {
          return {
            select: jasmine.createSpy('select').and.returnValue({
              eq: jasmine.createSpy('eq').and.returnValue({
                eq: jasmine.createSpy('eq').and.returnValue({
                  eq: jasmine.createSpy('eq').and.returnValue({
                    maybeSingle: jasmine.createSpy('maybeSingle').and.returnValue(
                      Promise.resolve({ data: { id: 'existing-request-id' }, error: null })
                    ),
                  }),
                }),
              }),
            }),
          };
        }
        return { select: jasmine.createSpy('select').and.returnValue({}) };
      });

      const result = await service.submitJoinRequest('123456');
      expect(result.success).toBeFalse();
      expect(result.error).toBe('already_requested');
    });
  });

  describe('fetchPendingRequests', () => {
    it('should fetch pending requests successfully', async () => {
      const mockRequests = [
        {
          id: 'request-1',
          condominium_id: 'condo-id',
          profile_id: 'profile-1',
          invitation_code: '123456',
          status: 'pending' as JoinRequestStatus,
          reviewed_by: null,
          reviewed_at: null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          profiles: {
            id: 'profile-1',
            name: 'John Doe',
            email: 'john@example.com',
            avatar: null,
          },
        },
      ];

      supabaseMock.client.from = jasmine.createSpy('from').and.returnValue({
        select: jasmine.createSpy('select').and.returnValue({
          eq: jasmine.createSpy('eq').and.returnValue({
            eq: jasmine.createSpy('eq').and.returnValue({
              order: jasmine.createSpy('order').and.returnValue(
                Promise.resolve({ data: mockRequests, error: null })
              ),
            }),
          }),
        }),
      });

      const result = await service.fetchPendingRequests('condo-id');
      expect(result).toEqual(mockRequests);
    });

    it('should return empty array on error', async () => {
      supabaseMock.client.from = jasmine.createSpy('from').and.returnValue({
        select: jasmine.createSpy('select').and.returnValue({
          eq: jasmine.createSpy('eq').and.returnValue({
            eq: jasmine.createSpy('eq').and.returnValue({
              order: jasmine.createSpy('order').and.returnValue(
                Promise.resolve({ data: null, error: { message: 'Error' } })
              ),
            }),
          }),
        }),
      });

      const result = await service.fetchPendingRequests('condo-id');
      expect(result).toEqual([]);
    });
  });

  describe('countPendingRequests', () => {
    it('should count pending requests successfully', async () => {
      supabaseMock.client.from = jasmine.createSpy('from').and.returnValue({
        select: jasmine.createSpy('select').and.returnValue({
          eq: jasmine.createSpy('eq').and.returnValue({
            eq: jasmine.createSpy('eq').and.returnValue(
              Promise.resolve({ count: 5, error: null })
            ),
          }),
        }),
      });

      const result = await service.countPendingRequests('condo-id');
      expect(result).toBe(5);
    });

    it('should return 0 on error', async () => {
      supabaseMock.client.from = jasmine.createSpy('from').and.returnValue({
        select: jasmine.createSpy('select').and.returnValue({
          eq: jasmine.createSpy('eq').and.returnValue({
            eq: jasmine.createSpy('eq').and.returnValue(
              Promise.resolve({ count: null, error: { message: 'Error' } })
            ),
          }),
        }),
      });

      const result = await service.countPendingRequests('condo-id');
      expect(result).toBe(0);
    });
  });

  describe('approveRequest', () => {
    it('should approve request successfully', async () => {
      const mockRequest = {
        condominium_id: 'condo-id',
        profile_id: 'profile-id',
        invitation_id: 'invitation-id',
        condominium_invitation_codes: {
          code: '123456'
        }
      };

      supabaseMock.client.from = jasmine.createSpy('from').and.callFake((table: string) => {
        if (table === 'condominium_join_requests') {
          return {
            select: jasmine.createSpy('select').and.returnValue({
              eq: jasmine.createSpy('eq').and.returnValue({
                single: jasmine.createSpy('single').and.returnValue(
                  Promise.resolve({ data: mockRequest, error: null })
                ),
              }),
            }),
            update: jasmine.createSpy('update').and.returnValue({
              eq: jasmine.createSpy('eq').and.returnValue(Promise.resolve({ error: null })),
            }),
          };
        }
        if (table === 'profile_condominiums') {
          return {
            insert: jasmine.createSpy('insert').and.returnValue(Promise.resolve({ error: null })),
          };
        }
        return { select: jasmine.createSpy('select').and.returnValue({}) };
      });

      const result = await service.approveRequest('request-id');
      expect(result).toBeTrue();
    });

    it('should return false on error', async () => {
      supabaseMock.client.from = jasmine.createSpy('from').and.returnValue({
        select: jasmine.createSpy('select').and.returnValue({
          eq: jasmine.createSpy('eq').and.returnValue({
            single: jasmine.createSpy('single').and.returnValue(
              Promise.resolve({ data: null, error: { message: 'Error' } })
            ),
          }),
        }),
      });

      const result = await service.approveRequest('request-id');
      expect(result).toBeFalse();
    });
  });

  describe('declineRequest', () => {
    it('should decline request successfully', async () => {
      supabaseMock.client.from = jasmine.createSpy('from').and.returnValue({
        update: jasmine.createSpy('update').and.returnValue({
          eq: jasmine.createSpy('eq').and.returnValue(Promise.resolve({ error: null })),
        }),
      });

      const result = await service.declineRequest('request-id');
      expect(result).toBeTrue();
    });

    it('should return false on error', async () => {
      supabaseMock.client.from = jasmine.createSpy('from').and.returnValue({
        update: jasmine.createSpy('update').and.returnValue({
          eq: jasmine.createSpy('eq').and.returnValue(
            Promise.resolve({ error: { message: 'Error' } })
          ),
        }),
      });

      const result = await service.declineRequest('request-id');
      expect(result).toBeFalse();
    });
  });

  describe('getActiveInvitationCode', () => {
    it('should get active invitation code successfully', async () => {
      const mockCode = {
        id: 'code-id',
        condominium_id: 'condo-id',
        code: '123456',
        max_uses: null,
        uses_count: 0,
        expires_at: null,
        active: true,
        created_by: 'user-id',
        version: 1,
        idempotency_key: 'key',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        deleted_at: null,
      };

      supabaseMock.client.from = jasmine.createSpy('from').and.returnValue({
        select: jasmine.createSpy('select').and.returnValue({
          eq: jasmine.createSpy('eq').and.returnValue({
            eq: jasmine.createSpy('eq').and.returnValue({
              is: jasmine.createSpy('is').and.returnValue({
                order: jasmine.createSpy('order').and.returnValue({
                  limit: jasmine.createSpy('limit').and.returnValue({
                    maybeSingle: jasmine.createSpy('maybeSingle').and.returnValue(
                      Promise.resolve({ data: mockCode, error: null })
                    ),
                  }),
                }),
              }),
            }),
          }),
        }),
      });

      const result = await service.getActiveInvitationCode('condo-id');
      expect(result).toEqual(mockCode);
    });

    it('should return null on error', async () => {
      supabaseMock.client.from = jasmine.createSpy('from').and.returnValue({
        select: jasmine.createSpy('select').and.returnValue({
          eq: jasmine.createSpy('eq').and.returnValue({
            eq: jasmine.createSpy('eq').and.returnValue({
              is: jasmine.createSpy('is').and.returnValue({
                order: jasmine.createSpy('order').and.returnValue({
                  limit: jasmine.createSpy('limit').and.returnValue({
                    maybeSingle: jasmine.createSpy('maybeSingle').and.returnValue(
                      Promise.resolve({ data: null, error: { message: 'Error' } })
                    ),
                  }),
                }),
              }),
            }),
          }),
        }),
      });

      const result = await service.getActiveInvitationCode('condo-id');
      expect(result).toBeNull();
    });
  });
});
