/*

JatoBAS - A javascript MSX-BASIC translator
Copyright (C) 2006  Rafael Jannone

This library is free software; you can redistribute it and/or
modify it under the terms of the GNU Lesser General Public
License as published by the Free Software Foundation; either
version 2.1 of the License, or (at your option) any later version.

This library is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the GNU
Lesser General Public License for more details.

You should have received a copy of the GNU Lesser General Public
License along with this library; if not, write to the Free Software
Foundation, Inc., 51 Franklin St, Fifth Floor, Boston, MA  02110-1301  USA

Read the LGPL license at: 
http://www.gnu.org/copyleft/lesser.txt

Contact the author -
email: rafael AT jannone DOT org

*/

import { ScreenCanvas } from './canvas';
import { Interp } from './interp';
import { Parser } from './parser';
import { SpriteCanvas } from './sprites';

export class Jatobas {
	canvas: ScreenCanvas;
	spriteCanvas: SpriteCanvas;
	output: HTMLDivElement;

	constructor(parent?: Node) {
		parent = parent || document.body;
	
		var canvas;
		canvas = new ScreenCanvas();
		canvas.appendTo(parent);
		this.canvas = canvas;
	
		var spriteCanvas;
		spriteCanvas = new SpriteCanvas();
		spriteCanvas.getElement().style.position = 'absolute';
		spriteCanvas.appendTo(parent);
		this.spriteCanvas = spriteCanvas;
	
		var output = document.createElement('div');
		output.id = "output";
		output.style.color = 'white';
		parent.appendChild(output);
		this.output = output;
		
		spriteCanvas.getElement().style.top = `${canvas.getElement().offsetTop}px`;
		spriteCanvas.getElement().style.left = `${canvas.getElement().offsetLeft}px`;			
		output.style.position = 'absolute';		
		output.style.top = `${canvas.getElement().offsetTop}px`;
		output.style.left = `${canvas.getElement().offsetLeft}px`;		
	}

	run(code: string) {
		var interp = new Interp({
			canvas: this.canvas,
			spriteCanvas: this.spriteCanvas,
			output: this.output,
		});
		var parser = new Parser();		
		const program = parser.start(code);
		interp.run(program);
		return interp;	
	}
}
