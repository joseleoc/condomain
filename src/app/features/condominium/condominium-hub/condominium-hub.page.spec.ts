import { ComponentFixture, TestBed } from '@angular/core/testing';
import { SharedTestingModule } from '@testing/shared-testing.module';
import { CondominiumHubPage } from './condominium-hub.page';
import { ContextService } from '@core/services/context/context.service';
import { Structures } from '@core/services/structures/structures';
import { Properties } from '@core/services/properties/properties';
import { Condominium } from '@core/services/condominium/condominium';
import { NetworkStatusService } from '@core/services/network-status.service';
import { QueryClient } from '@tanstack/angular-query-experimental';
import { signal, Signal } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

function createMockContextService() {
  return {
    activeCondominium: signal(null) as Signal<unknown>,
    isAdmin: signal(false) as Signal<boolean>,
    userCondominiums: signal([]) as Signal<unknown[]>,
    isLoading: signal(false) as Signal<boolean>,
    roleName: signal(null) as Signal<unknown>,
    setActiveCondominium: jasmine.createSpy('setActiveCondominium').and.returnValue(Promise.resolve()),
    getActiveContext: jasmine.createSpy('getActiveContext').and.returnValue({
      condominium: null,
      roleName: null,
      isAdmin: false,
      isLoading: false,
    }),
  };
}

function createMockStructuresService() {
  return {
    fetchByCondominium: jasmine.createSpy('fetchByCondominium').and.returnValue(Promise.resolve([])),
    getById: jasmine.createSpy('getById').and.returnValue(Promise.resolve(null)),
    createStructures: jasmine.createSpy('createStructures').and.returnValue(Promise.resolve([])),
    deleteStructure: jasmine.createSpy('deleteStructure').and.returnValue(Promise.resolve()),
  };
}

function createMockPropertiesService() {
  return {
    fetchByCondominium: jasmine.createSpy('fetchByCondominium').and.returnValue(Promise.resolve([])),
    fetchByStructure: jasmine.createSpy('fetchByStructure').and.returnValue(Promise.resolve([])),
    getById: jasmine.createSpy('getById').and.returnValue(Promise.resolve(null)),
    createProperties: jasmine.createSpy('createProperties').and.returnValue(Promise.resolve([])),
    deleteProperty: jasmine.createSpy('deleteProperty').and.returnValue(Promise.resolve()),
  };
}

function createMockCondominiumService() {
  return {
    activeCondominium$: new BehaviorSubject(null),
    userCondominiums$: new BehaviorSubject([]),
    loadingCondominiums$: new BehaviorSubject(false),
    condominiumsLoaded$: new BehaviorSubject(false),
    fetchUserCondominiums: jasmine.createSpy('fetchUserCondominiums').and.returnValue(Promise.resolve()),
  };
}

function createMockNetworkStatusService() {
  return {
    isOnline: signal(true) as Signal<boolean>,
  };
}

describe('CondominiumHubPage', () => {
  let component: CondominiumHubPage;
  let fixture: ComponentFixture<CondominiumHubPage>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SharedTestingModule, CondominiumHubPage],
      providers: [
        { provide: ContextService, useFactory: createMockContextService },
        { provide: Structures, useFactory: createMockStructuresService },
        { provide: Properties, useFactory: createMockPropertiesService },
        { provide: Condominium, useFactory: createMockCondominiumService },
        { provide: NetworkStatusService, useFactory: createMockNetworkStatusService },
        { provide: QueryClient, useValue: new QueryClient() },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(CondominiumHubPage);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
