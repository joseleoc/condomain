import { Component, signal } from '@angular/core';
import { CreationProcessSelectorComponent } from '../creation-process-selector/creation-process-selector.component';
import { CreateCondominiumProcessOptions } from '@features/create-condominium/create-condominium.types';
import { SimpleCreationProcessComponent } from '../simple-creation-process/simple-creation-process.component';
import { MassiveCreationProcessComponent } from '../massive-creation-process/massive-creation-process.component';
import { AiCreationProcessComponent } from '../ai-creation-process/ai-creation-process.component';

@Component({
  selector: 'app-step-2',
  templateUrl: './step-2.component.html',
  styleUrls: ['./step-2.component.scss'],
  imports: [
    CreationProcessSelectorComponent,
    SimpleCreationProcessComponent,
    MassiveCreationProcessComponent,
    AiCreationProcessComponent,
  ],
})
export class Step2Component {
  // --- Properties ---
  creationProcessSelected = signal<CreateCondominiumProcessOptions | null>(
    null,
  );
}
