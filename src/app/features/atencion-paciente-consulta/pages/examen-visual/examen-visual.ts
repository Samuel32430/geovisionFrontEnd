import { Component } from '@angular/core';
import { DatePipe } from '@angular/common';
import { ReactiveFormsModule } from '@angular/forms';
import { CabeceraPagina } from '../../../../shared/components/cabecera-pagina/cabecera-pagina';
import { MedidasForm } from '../../components/medidas-form/medidas-form';
import { RegistroClinicoBase } from '../registro-clinico-base';

@Component({
  selector: 'app-examen-visual',
  imports: [CabeceraPagina, MedidasForm, ReactiveFormsModule, DatePipe],
  templateUrl: './examen-visual.html',
  styleUrl: '../../styles/registro-clinico.css',
})
export class ExamenVisual extends RegistroClinicoBase {}
