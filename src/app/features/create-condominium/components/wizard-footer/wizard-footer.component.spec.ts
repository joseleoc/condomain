import { ComponentFixture, TestBed } from '@angular/core/testing';
import { IonicModule } from '@ionic/angular';
import { SharedTestingModule } from '@testing/shared-testing.module';

import { WizardFooterComponent } from './wizard-footer.component';

describe('WizardFooterComponent', () => {
  let component: WizardFooterComponent;
  let fixture: ComponentFixture<WizardFooterComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SharedTestingModule, IonicModule.forRoot(), WizardFooterComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(WizardFooterComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
