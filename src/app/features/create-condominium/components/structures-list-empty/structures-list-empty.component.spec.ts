import { ComponentFixture, TestBed } from '@angular/core/testing';
import { IonicModule } from '@ionic/angular';
import { SharedTestingModule } from '@testing/shared-testing.module';

import { StructuresListEmptyComponent } from './structures-list-empty.component';

describe('StructuresListEmptyComponent', () => {
  let component: StructuresListEmptyComponent;
  let fixture: ComponentFixture<StructuresListEmptyComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SharedTestingModule, IonicModule.forRoot(), StructuresListEmptyComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(StructuresListEmptyComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
