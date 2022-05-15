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

import { Parser } from './parser';

function Jatobas() {}

Jatobas.run = function(code, parent) {
	parent = parent || document.body;
	
	var canvas;
	try {
		canvas = new Canvas();
		canvas.init();
		canvas.appendTo(parent);
	} catch(e) {};

	var spriteCanvas;
	try {
		spriteCanvas = new SpriteCanvas();
		spriteCanvas.el.style.position = 'absolute';
		spriteCanvas.appendTo(parent);
	} catch (e) {};

	var output = document.createElement('div');
	output.id = "output";
	output.style.color = 'white';
	parent.appendChild(output);
	
	if (canvas) {
		if (spriteCanvas) {
			spriteCanvas.el.style.top = canvas.el.offsetTop;
			spriteCanvas.el.style.left = canvas.el.offsetLeft;			
		}
		output.style.position = 'absolute';		
		output.style.top = canvas.el.offsetTop;
		output.style.left = canvas.el.offsetLeft;		
	}
	
	var interp = new Interp();
	var parser = new Parser();

	interp.canvas = canvas;
	interp.spriteCanvas = spriteCanvas;
	interp.output = output;

	var ok = false;
	try {
		parser.start(code.toString());
		ok = true;
	} catch (e) {

		// DEBUG
		throw(e);

		alert(e + ', in line ' + parser.currLabel + "\n>>" + parser.lex.line + "\n(rule " + parser.rule + ")");
	}
	if (ok) {
		interp.run(parser);
	}
		
	return interp;
}

String.prototype.trim = function() {
	return this.replace(/^\s+/g, '').replace(/\s+$/g, '');
}

module.exports = {
	Parser,
	Interp
};
