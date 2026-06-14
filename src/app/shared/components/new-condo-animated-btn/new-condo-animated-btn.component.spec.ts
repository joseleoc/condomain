import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';
import { IonicModule } from '@ionic/angular';

import { NewCondoAnimatedBtnComponent } from './new-condo-animated-btn.component';

describe('NewCondoAnimatedBtnComponent', () => {
  let component: NewCondoAnimatedBtnComponent;
  let fixture: ComponentFixture<NewCondoAnimatedBtnComponent>;

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      declarations: [ NewCondoAnimatedBtnComponent ],
      imports: [IonicModule.forRoot()]
    }).compileComponents();

    fixture = TestBed.createComponent(NewCondoAnimatedBtnComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }));

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
