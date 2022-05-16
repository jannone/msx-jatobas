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

import { charMap } from "./charMap";

function toHex(v: number) {
	var htab = "0123456789ABCDEF";
	var r = htab.substr(v & 15, 1);
	v >>= 4;
	r = htab.substr(v & 15, 1) + r;
	return r;
}

export class ScreenCanvas {
	size: number;
	mask: number[];
	attrs: number[];
	dirty: boolean[];
	changed: boolean;
	color: number;
	back: number;
	border: number;
	palette: string[];
	mode: number = 0;
	ctx?: CanvasRenderingContext2D;
	canvas?: HTMLCanvasElement;
	el?: HTMLCanvasElement;

	constructor() {
		this.size = 256 * 24;

		this.mask = new Array(this.size);
		this.attrs = new Array(this.size);
		this.dirty = new Array(32 * 24);
		this.changed = false;

		this.color = 15;
		this.back = 1;
		this.border = 1;
		
		this.palette = new Array(16);	
		this.setPalette(0,0,0,0);
		this.setPalette(1,0,0,0);
		this.setPalette(2,33,200,66);
		this.setPalette(3,94,220,120);
		this.setPalette(4,84,85,237);
		this.setPalette(5,125,118,252);
		this.setPalette(6,212,82,77);
		this.setPalette(7,66,235,245);
		this.setPalette(8,252,85,84);
		this.setPalette(9,255,121,120);
		this.setPalette(10,212,193,84);
		this.setPalette(11,230,206,128);
		this.setPalette(12,33,176,59);
		this.setPalette(13,201,91,186);
		this.setPalette(14,204,204,204);
		this.setPalette(15,255,255,255);
	}

	init () {
		var canvas = document.createElement('canvas');
		canvas.width = 256 * 2;
		canvas.height = 192 * 2;
		canvas.style.backgroundColor = 'black';
		this.ctx = canvas.getContext("2d") || undefined;	
		this.el = this.canvas = canvas;
	}

	appendTo (parent: Node) {
		parent = parent || document.body;
		parent.appendChild(this.el as Node);
	}

	setMode (mode: number) {
		this.mode = mode;
		this.fillAttribute((this.color << 4) | this.back);
		this.fillMask(0);
		this.invalidate();
	}

	getMode () {
		return this.mode;
	}

	setAttribute (addr: number, value: number) {
		this.attrs[addr] = value;
		this.dirty[addr >> 3] = true;
	}

	setMask (addr: number, value: number) {
		this.mask[addr] = value;
		this.dirty[addr >> 3] = true;	
	}

	invalidate () {
		var dirty = this.dirty;
		var len = dirty.length;
		for (var i = 0; i < len; i++)
			dirty[i] = true;
		this.changed = true;
	}

	fillAttribute (value: number) {
		var attrs = this.attrs;
		var len = attrs.length;
		for (var i = 0; i < len; i++)
			attrs[i] = value;
	}

	fillMask (value: number) {
		var mask = this.mask;
		var len = mask.length;
		for (var i = 0; i < len; i++)
			mask[i] = value;
	}

	setColors (fg: number, bg: number, border: number) {
		if (typeof(fg) === 'number') {
			this.color = fg;
		}
		if (typeof(bg) === 'number') {
			this.back = bg;
		}
		if (typeof(border) === 'number') {
			this.border = border;
		}
	}

	/*
		var bdy = y >> 3;
		var bmy = y & 7;
		var bl = bdy * 256 + bmy;
		var bdx = x & 248;
		var bmx = x & 7;
		var bit = 128 >> bmx;
	*/
	pset (x: number, y: number, c: number) {
		var addr = (y >> 3) * 256 + (y & 7) + (x & 248); //bl + bdx;
		var bg = this.attrs[addr] & 15;
		if (c == bg) {
			this.mask[addr] &= ~(128 >> (x & 7)); // bit
		} else {
			this.mask[addr] |= 128 >> (x & 7); // bit
			this.attrs[addr] = (c << 4) | bg;
		}
		if (this.mask[addr] == 255) {
			this.mask[addr] = 0;
			var bg = this.attrs[addr];
			this.attrs[addr] = (((bg >> 4) & 15) | ((bg & 15) << 4));
		}
		this.dirty[addr >> 3] = true;
		this.changed = true;
	}

	rect (x1: number, y1: number, x2: number, y2: number, c: number) {
		this.line(x1, y1, x2, y1, c);
		this.line(x1, y1, x1, y2, c);
		this.line(x2, y1, x2, y2, c);
		this.line(x1, y2, x2, y2, c);			
	}

	fillRect (x1: number, y1: number, x2: number, y2: number, c: number) {
		for (var y = y1; y <= y2; y++) {
			for (var x = x1; x <= x2; x++) {
				this.pset(x, y, c);
			}
		}
	}

	line (x1: number, y1: number, x2: number, y2: number, c: number) {
		var swap, error;
		var x = x1;
		var y = y1;
		var dx = Math.abs(x2 - x1);
		var dy = Math.abs(y2 - y1);
		var s1 = (x2 > x1) ? 1 : ((x2 < x1) ? -1 : 0);
		var s2 = (y2 > y1) ? 1 : ((y2 < y1) ? -1 : 0);	
		if (dy > dx) {
			var temp = dx;
			dx = dy;
			dy = temp;
			swap = true;
		}
		var d2x = 2*dx;	
		var d2y = 2*dy;
		error = d2y - dx;
		if (swap) {
			for (var i = 1; i <= dx; i++) {
				this.pset(x, y, c);
				while (error >= 0) {
					x += s1;
					error -= d2x;
				}
				y += s2;
				error += d2y;
			}	
		} else {
			for (var i = 1; i <= dx; i++) {
				this.pset(x, y, c);
				while (error >= 0) {
					y += s2;
					error -= d2x;
				}
				x += s1;
				error += d2y;
			}	
		}
	}

	circle (x: number, y: number, rad: number, c: number) {
		//@todo: implement arcs, elipses
		var d = 3 - (2 * rad);
		var px = 0;
		var py = rad;
		for (;;) {
			this.pset(x + px, y + py, c);
			this.pset(x + px, y - py, c);
			this.pset(x - px, y + py, c);
			this.pset(x - px, y - py, c);
			this.pset(x + py, y + px, c);
			this.pset(x + py, y - px, c);
			this.pset(x - py, y + px, c);
			this.pset(x - py, y - px, c);
			if (px >= py)
				break;
			if (d < 0) {
				d += (4 * px) + 6;
			} else {
				--py;
				d += 4 * (px - py) + 10;
				
			}
			++px;
		}
	}

	blitChar (x: number, y: number, asc: number) {
		var c = this.color;
		var base = asc * 8;
		for (var i = base; i < base + 8; i++, y++) {
			var mask = charMap[i];
			if (mask & 128) this.pset(x + 0, y, c);
			if (mask &  64) this.pset(x + 1, y, c);
			if (mask &  32) this.pset(x + 2, y, c);
			if (mask &  16) this.pset(x + 3, y, c);
			if (mask &   8) this.pset(x + 4, y, c);
			if (mask &   4) this.pset(x + 5, y, c);
			if (mask &   2) this.pset(x + 6, y, c);
			if (mask &   1) this.pset(x + 7, y, c);
		}
	}

	setPalette (color: number, r: number, g: number, b: number) {
		this.palette[color] = 'rgb(' + [r,g,b].join(',') + ')';
	}

	update (blk: number) {
		var cv = this.ctx;
		if (!cv) {
			return;
		}
		var i = blk << 3;
		var e = i + 8; // end
		var pal = this.palette;
		var fg, bg, attr, mask;
		var x = ((blk & 31) << 4);
		var y = ((blk >> 5) << 4);
		while (i < e) {
			attr = this.attrs[i];
			mask = this.mask[i];
			fg = attr >> 4;
			bg = attr & 15;
			cv.fillStyle = pal[bg];
			cv.fillRect(x, y, 16, 2);
			cv.fillStyle = pal[fg];
			if (mask & 128) cv.fillRect( x+0, y, 2, 2);
			if (mask &  64) cv.fillRect( x+2, y, 2, 2);
			if (mask &  32) cv.fillRect( x+4, y, 2, 2);
			if (mask &  16) cv.fillRect( x+6, y, 2, 2);
			if (mask &   8) cv.fillRect( x+8, y, 2, 2);
			if (mask &   4) cv.fillRect(x+10, y, 2, 2);
			if (mask &   2) cv.fillRect(x+12, y, 2, 2);
			if (mask &   1) cv.fillRect(x+14, y, 2, 2);
			y += 2;		
			++i;
		}
	}

	updateDirty () {
		if (!this.changed)
			return;
		var dirty = this.dirty;
		var len = dirty.length;
		for (var i = 0; i < len; i++) {
			if (dirty[i]) {
				this.update(i);
				dirty[i] = false;
			}
		}
	}
}
// CanvasTbl - a canvas that uses HTML tables (bad performance)

// function CanvasTbl() {}

// CanvasTbl.prototype = new ScreenCanvas();

// CanvasTbl.prototype.init = function() {
// 	this._init();
// 	this.cells = new Array(this.size);

// 	this.imgsrc = [];
// 	this.preload = [];
// 	for (var color=0; color<16; color++) {
// 		this.preload[color] = new Image();
// 		this.preload[color].src = 'pix/' + color + '.gif';
// 		this.imgsrc[color] = 'url("pix/' + color + '.gif")';
// 	}
	
// 	var table = document.createElement('table');
// 	for (var y=0; y<192; y++) {
// 		var row = table.insertRow(y);
// 		var cell;
// 		var bdy = y >> 3;
// 		var bmy = y & 7;
// 		var bl = bdy * 256 + bmy;
// 		for (var x=0; x<32; x++) {
// 			cell = row.insertCell(x);
// 			cell.className = 'byt';
// 			this.cells[bl + (x << 3)] = cell;
// 		}
// 	}
	
// 	table.setAttribute('cellspacing', 0);
// 	table.setAttribute('cellpadding', 0);	
// 	table.setAttribute('border', 0);
// 	table.style.backgroundColor = 'black';
// 	this.el = this.table = table;	
// }

// CanvasTbl.prototype.setPalette = function(color, r, g, b) {
// 	this.palette[color] = '#' + toHex(r) + toHex(g) + toHex(b);
// }

// CanvasTbl.prototype.update = function(from, to) {
// 	to = to || from + 1;
// 	while (from < to) {
// 		var attr = this.attrs[from];
// 		var mask = this.mask[from];
// 		var fg = attr >> 4;
// 		var bg = attr & 15;
// 		var cell = this.cells[from];
// 		cell.style.background = this.imgsrc[fg];
// 		cell.style.backgroundPosition = -(mask << 4);
// 		cell.style.backgroundColor = (bg) ? this.palette[bg] : '';
// 		from++;
// 	};
// }

// CanvasTbl.prototype.updateDirty = function() {
// 	if (!this.changed)
// 		return;
// 	var addr = 0;
// 	var dirty = this.dirty;
// 	var len = dirty.length;
// 	for (var i = 0; i < len; i++, addr += 8) {
// 		if (dirty[i]) {
// 			this.update(addr, addr + 8);
// 			dirty[i] = false;
// 		}
// 	}
// }
