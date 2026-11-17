import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { AvisoModal } from './shared/components/aviso-modal/aviso-modal';

@Component({
  imports: [RouterOutlet, AvisoModal],
  selector: 'app-root',
  styleUrl: './app.css',
  templateUrl: './app.html',
})
export class App {}
