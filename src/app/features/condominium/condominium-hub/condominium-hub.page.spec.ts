import { ComponentFixture, TestBed } from '@angular/core/testing';
import { CondominiumHubPage } from './condominium-hub.page';

describe('CondominiumHubPage', () => {
  let component: CondominiumHubPage;
  let fixture: ComponentFixture<CondominiumHubPage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(CondominiumHubPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
