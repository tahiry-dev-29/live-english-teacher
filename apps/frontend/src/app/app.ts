import { Component } from '@angular/core';
import { RouterModule } from '@angular/router';

@Component({
  imports: [RouterModule],
  selector: 'app-root',
  template: `
  
  <h1 class="text-3xl font-bold underline bg-red-300">
  Hello world!
</h1>
`,
  styles: `
  `,
})
export class App {
  protected title = 'frontend';
}
