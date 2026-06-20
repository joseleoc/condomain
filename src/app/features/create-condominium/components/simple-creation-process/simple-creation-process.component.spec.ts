import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';
import { IonicModule } from '@ionic/angular';
import { BehaviorSubject } from 'rxjs';
import { Wizard } from '@features/create-condominium/services/wizard/wizard';
import { TelemetryService } from '@core/services/telemetry';
import { TelemetryEvents } from '@core/services/telemetry/telemetry.types';

import { SimpleCreationProcessComponent } from './simple-creation-process.component';

describe('SimpleCreationProcessComponent', () => {
  let component: SimpleCreationProcessComponent;
  let fixture: ComponentFixture<SimpleCreationProcessComponent>;
  let wizardMock: jasmine.SpyObj<Wizard>;
  let telemetryMock: jasmine.SpyObj<TelemetryService>;

  beforeEach(waitForAsync(() => {
    wizardMock = jasmine.createSpyObj('Wizard', ['saveStructureLocally', 'selectedStructure'], {
      structures$: new BehaviorSubject([]),
    });
    wizardMock.saveStructureLocally.and.returnValue(true);
    telemetryMock = jasmine.createSpyObj('TelemetryService', ['track']);

    TestBed.configureTestingModule({
      imports: [IonicModule.forRoot(), SimpleCreationProcessComponent],
      providers: [
        { provide: Wizard, useValue: wizardMock },
        { provide: TelemetryService, useValue: telemetryMock },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(SimpleCreationProcessComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }));

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should track structure_added when submitAddStructureForm succeeds', () => {
    wizardMock.structures$.next([{ name: 'Tower A', description: '', properties: [] }]);

    component.submitAddStructureForm();

    expect(telemetryMock.track).toHaveBeenCalledWith(
      TelemetryEvents.STRUCTURE_ADDED,
      jasmine.objectContaining({ mode: 'simple' }),
    );
  });
});
