import { Injectable } from '@angular/core';
import { type Structure as TStructure } from '@app-types/structures';
import { LocalStructure } from '@features/create-condominium/create-condominium.types';
import { BehaviorSubject } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class Structures {
  // --- Properties ---
  private structures$ = new BehaviorSubject<LocalStructure[]>([]);

  // --- Methods ---
  saveStructureLocally(structure: LocalStructure) {
    const currentStructures = this.structures$.getValue();
    this.structures$.next([...currentStructures, structure]);
  }
}
