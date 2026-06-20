import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';
import { IonicModule } from '@ionic/angular';
import { BehaviorSubject } from 'rxjs';
import { Wizard } from '@features/create-condominium/services/wizard/wizard';
import { TelemetryService } from '@core/services/telemetry';
import { TelemetryEvents } from '@core/services/telemetry/telemetry.types';

import { Step3Component } from './step-3.component';

describe('Step3Component', () => {
  let component: Step3Component;
  let fixture: ComponentFixture<Step3Component>;
  let wizardMock: jasmine.SpyObj<Wizard>;
  let telemetryMock: jasmine.SpyObj<TelemetryService>;

  beforeEach(waitForAsync(() => {
    wizardMock = jasmine.createSpyObj('Wizard', [
      'addPropertyToStructure',
      'editPropertyInStructure',
      'createStructuresAndProperties',
      'selectedStructure',
      'selectedProperty',
    ], {
      nextStep$: new BehaviorSubject<void>(undefined),
      structures$: new BehaviorSubject([]),
      creationProcessSelected: () => 'simple',
      selectedStructure: () => null,
      selectedProperty: () => null,
    });
    wizardMock.addPropertyToStructure.and.returnValue(true);
    telemetryMock = jasmine.createSpyObj('TelemetryService', ['track']);

    TestBed.configureTestingModule({
      imports: [IonicModule.forRoot(), Step3Component],
      providers: [
        { provide: Wizard, useValue: wizardMock },
        { provide: TelemetryService, useValue: telemetryMock },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(Step3Component);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }));

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
