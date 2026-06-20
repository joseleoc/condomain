import { ComponentFixture, TestBed } from '@angular/core/testing';
import { IonicModule } from '@ionic/angular';
import { SharedTestingModule } from '@testing/shared-testing.module';

import { NewCondoAnimatedBtnComponent } from './new-condo-animated-btn.component';

describe('NewCondoAnimatedBtnComponent', () => {
  let component: NewCondoAnimatedBtnComponent;
  let fixture: ComponentFixture<NewCondoAnimatedBtnComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SharedTestingModule, IonicModule.forRoot(), NewCondoAnimatedBtnComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(NewCondoAnimatedBtnComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
