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
import { ParsedProgram } from './parserBase';
import { SpriteCanvas } from './sprites';

export class Jatobas {
	screenCanvas: ScreenCanvas;
	spriteCanvas: SpriteCanvas;
	output: HTMLDivElement;
	interp?: Interp;

	onTranspiled?: (program: ParsedProgram) => void;
	onRun?: () => void;
	onStop?: () => void;
	onChangeMode?: (mode: number) => void;

	constructor({
		parentScreen,
		parentOutput,
	}: {
		parentScreen: Node,
		parentOutput: Node,
	}) {
		var canvas;
		canvas = new ScreenCanvas();
		canvas.getElement().style.position = 'absolute';
		canvas.appendTo(parentScreen);
		this.screenCanvas = canvas;
	
		var spriteCanvas;
		spriteCanvas = new SpriteCanvas();
		spriteCanvas.getElement().style.position = 'absolute';
		spriteCanvas.appendTo(parentScreen);
		this.spriteCanvas = spriteCanvas;
	
		var output = document.createElement('div');
		output.id = "output";
		output.style.color = 'white';
		parentOutput.appendChild(output);
		this.output = output;
		
		// spriteCanvas.getElement().style.top = `${canvas.getElement().offsetTop}px`;
		// spriteCanvas.getElement().style.left = `${canvas.getElement().offsetLeft}px`;			
		// output.style.position = 'absolute';		
		// output.style.top = `${canvas.getElement().offsetTop}px`;
		// output.style.left = `${canvas.getElement().offsetLeft}px`;		
	}

	run(code: string) {
		var interp = new Interp({
			canvas: this.screenCanvas,
			spriteCanvas: this.spriteCanvas,
			output: this.output,
		});
		this.interp = interp;

		interp.onRun = () => this.onRun?.();
		interp.onStop = () => this.onStop?.();
		interp.onChangeMode = (mode) => this.onChangeMode?.(mode);
	
		var parser = new Parser();
		const program = parser.start(code);
		this.onTranspiled?.(program);
		interp.run(program);
		return interp;	
	}

	halt() {
		this.interp?.halt();
	}

	print(text: string) {
		this.interp?.cmd_print({}, text, "\n");
	}
}
