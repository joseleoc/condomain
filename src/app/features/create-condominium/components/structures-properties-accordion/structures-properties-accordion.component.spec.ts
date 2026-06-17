import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';
import { IonicModule } from '@ionic/angular';

import { StructuresPropertiesAccordionComponent } from './structures-properties-accordion.component';

describe('StructuresPropertiesAccordionComponent', () => {
  let component: StructuresPropertiesAccordionComponent;
  let fixture: ComponentFixture<StructuresPropertiesAccordionComponent>;

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      declarations: [ StructuresPropertiesAccordionComponent ],
      imports: [IonicModule.forRoot()]
    }).compileComponents();

    fixture = TestBed.createComponent(StructuresPropertiesAccordionComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }));

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
