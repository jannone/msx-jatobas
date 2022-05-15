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

function toNumber(v) {
	if (typeof v != 'number') {
		v = (v.indexOf('.') >= 0) ? parseFloat(v) : parseInt(v);
		if (v.toString == 'NaN')
			throw ('Invalid cast to number');		
	}
	return v;
}

var _int = Math.floor;
var _float = parseFloat;
var _notimpl = function() {
	throw("Not implemented");
}

// Interpreter

function Interp(parser) {
	this.onRun = null;
	this.onStop = null;
	this.onChangeMode = null;
	this.curPos = [0,0];
};

Interp.pressed = '';
Interp.stick0 = [];

Interp.keydown = function(e) {
	e = e || window.event;
	if (e.keyCode) {
		var bDir = (e.keyCode >= 37 && e.keyCode <= 40);
		if (bDir || e.keyCode == 32) {
			// directional keys + space
			Interp.stick0[e.keyCode] = true;
		}
		if (!bDir) {
			// all the rest + space
			Interp.pressed = String.fromCharCode(e.keyCode);
		}
	}	
}

Interp.keyup = function(e) {
	e = e || window.event;
	Interp.pressed = '';
	if (e.keyCode) {
		var bDir = (e.keyCode >= 37 && e.keyCode <= 40);
		if (bDir || e.keyCode == 32) {
			// directional keys + space
			Interp.stick0[e.keyCode] = false;
		}
	}
}

Interp.installHooks = function() {
	window.addEventListener('keydown', Interp.keydown, false);
	window.addEventListener('keyup', Interp.keyup, false);
	// keypress will catch keys even when there's already a key pressed
	// FIXME: can we remove keydown?
	window.addEventListener('keypress', Interp.keydown, false);	
	Interp.hooked = true;
}

Interp.prototype.clear = function() {
	if (!Interp.hooked)
		Interp.installHooks();
	this.parser = parser;
	this.vars = {};
	this.handleOn = {};
	this.forStack = [];
	this.gosubStack = [];
	this.ram = {};
	this.currLabel = null;
	this.currFunc = null;	
	this.dataIdx = 0;
	this.stop = false;
	this.ip = 0;
}

Interp.prototype.run = function(parser) {
	this.clear();
	(this.onRun) && (this.onRun());
	this.resume();
}

Interp.prototype.suspend = function() {
	this.suspended = true;
}

Interp.prototype.halt = function() {
	this.stop = true;
	if (this.suspended)
		(this.onStop) && (this.onStop());
}

Interp.prototype.jump = function(label) {
	var ip = this.parser.labels[label];
	if (typeof ip == 'undefined')
		throw('Invalid line number ' + label);
	if (label && label.toString().charAt(0) != '_')
		this.currLabel = label;
	this.ip = ip;
}

Interp.prototype.resume = function() {
	var dt = new Date();
	var st = dt.getTime();
	var len = this.parser.funcs.length;
	var cyc = 0;
	var canvas = this.canvas;
		
	this.suspended = false;
	
	//try {
	
	while (this.ip < len && !this.stop && !this.suspended) {
		if (cyc++ & 128) {
			cyc = 0;
			if (new Date().getTime() - st > 250)
				break;
		}
		var f = this.parser.funcs[this.ip];
		this.currFunc = f;
		var label = null;
		try {
			label = f(this, this.vars);
		} catch (e) {
			console.log(this.currLabel, f);
			throw(e);
		}
		if (label == -1) {
			this.ip = len;
			break;
		}
		if (label) {
			this.jump(label);
		} else {
			this.ip++;
		}
	}

	/*
	} catch (e) {

		alert(e + ' in line ' + this.currLabel); // + "\n" + this.currFunc 
		(this.onStop) && (this.onStop());
		
		return;
	}
	*/
	
	if (canvas)
		canvas.updateDirty();
		
	if (this.spriteCanvas)
		this.spriteCanvas.update();
	
	if (this.suspended)
		return;
	
	if (this.stop)
		this.ip = len;
	else
	if (this.ip != len) {
		var I = this;
		setTimeout(function() { I.resume(); }, 1);
		return;
	}
	(this.onStop) && (this.onStop());
}

Interp.prototype.setOn = function(type, jump) {
	this.handleOn[type] = this.handleOn[type] || {}; 
	this.handleOn[type].jump = jump;
}

Interp.prototype.activateOn = function(type, active) {
	/**@todo */
}

Interp.prototype.pgosub = function(line, back) {
	this.gosubStack.unshift(back);
	return line;
}

Interp.prototype.preturn = function() {
	var to = this.gosubStack.shift();
	if (!to)
		throw("RETURN without GOSUB");
	return to;
}

Interp.prototype.pfor = function(varname, label, limit, step) {
	step = toNumber(step);
	limit = toNumber(limit);
	var el = {name: varname, label: label, limit: limit, step: step};
	this.forStack.unshift(el);
}

Interp.prototype.pnext = function(varname) {
	var stack = this.forStack;
	var el = null;
	// find requested varname in stack
	for (var i = 0; i < stack.length; i++) {
		var s = stack[i];
		if (varname == null || s.name == varname) {
			el = s;
			varname = s.name;
			break;
		}
	}
	if (el) {
		// if found, eliminate part of the stack that was "skipped" by varname
		if (i > 0) {
			this.forStack = this.forStack.slice(i);
		}
	} else {
		throw('NEXT without FOR');
	}
	this.vars[varname] += el.step;
	v = this.vars[varname]; 
	if ((el.step > 0 && v > el.limit) || (el.step < 0 && v < el.limit)) {
		this.forStack.shift();
		return null;
	}
	return el.label;
}

Interp.prototype.subdim = function(a, i, dimensions, d) {
	a[i] = new Array(dimensions[d] + 1);
	d++;
	if (d < dimensions.length) {
		for (var q = 0; q < a.length; q++) {
			this.subdim(a[i], q, dimensions, d);
		}
	}
}

Interp.prototype.dim = function(v, dimensions) {
	var sz = dimensions[0] + 1;
	var a = new Array(sz);
	this.vars[v] = a;
	dimensions.shift();
	if (dimensions.length) {
		for (var i = 0; i < a.length; i++) {
			this.subdim(a, i, dimensions, 0);
		}
	}
}

Interp.prototype.setVar = function(ref, value) {
	if (typeof ref == 'string') {
		this.vars[ref] = value;
		return;
	}
	if (!ref.ref)
		throw "Subscript out of Range";
	ref.ref[ref.idx] = value;	
}

Interp.prototype.getVar = function(ref) {
	if (typeof ref == 'string') {
		return this.vars[ref];
	}
	return ref.ref[ref.idx];
}

Interp.prototype.blitChars = function(coord, txt) {
	if (!this.canvas)
		return;
		
	coord = coord || this.curPos;
	var output = [];
	var x = coord[0];
	var y = coord[1];
	var ox = x;
	for (var i = 0; i < txt.length; i++) {
		var asc = txt.charCodeAt(i);
		if (asc == 10) {
			x = ox;
			y += 8;
		} else {
			this.canvas.blitChar(x, y, asc);
			x += 8;
		}
	}
	this.curPos = [x, y];
}

module.exports = {
	Parser,
	Interp
};
