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

const defaultPalette = [
	[0,0,0],
	[0,0,0],
	[33,200,66],
	[94,220,120],
	[84,85,237],
	[125,118,252],
	[212,82,77],
	[66,235,245],
	[252,85,84],
	[255,121,120],
	[212,193,84],
	[230,206,128],
	[33,176,59],
	[201,91,186],
	[204,204,204],
	[255,255,255],
];

interface Sprite {
	x: number,
	y: number,
	c: number,
	pat: number,
}

export class SpriteCanvas {
	palette: string[] = new Array(16);
	canvasCtx: CanvasRenderingContext2D | null;
	canvas: HTMLCanvasElement;
	changed: boolean = true;
	sprites: {[idx: number]: Sprite} = {};
	spriteData: {[idx: number]: string} = {};
	mode: number = 0;

	constructor() {
		defaultPalette.forEach((color: number[], index) =>
			this.setPalette(index, color[0], color[1], color[2])
		)

		this.clear();
	
		var canvas = document.createElement('canvas');
		canvas.width = 256 * 2;
		canvas.height = 192 * 2;
		this.canvasCtx = canvas.getContext("2d");	
		this.canvas = canvas;	
	}

	appendTo(parent: Node) {
		parent = parent || document.body;
		parent.appendChild(this.canvas);
	}
	
	clear() {
		this.changed = true;
		this.sprites = {};
		this.spriteData = {};
	}
	
	clearPatterns() {
		this.changed = true;
		this.spriteData = {};
	}
	
	clearSprites() {
		this.changed = true;
		this.sprites = {};
	}
	
	setMode(mode: number) {
		this.changed = true;
		this.mode = mode;
	}
	
	setPalette(color: number, r: number, g: number, b: number) {
		this.palette[color] = 'rgba(' + [r,g,b,255].join(',') + ')';
	}
	
	setSprite(idx: number, data: string) {
		//console.log('set sprite', idx, data);
	
		this.spriteData[idx] = data;
		this.changed = true;
	}
	
	putSprite(idx: number, x: number, y: number, c: number, pat: number) {	
		var oldX, oldY, oldC, oldPat;
		if (this.sprites[idx]) {
			oldX = this.sprites[idx].x;
			oldY = this.sprites[idx].y;
			oldC = this.sprites[idx].c;
			oldPat = this.sprites[idx].pat;
		} else {
			oldPat = idx;
		}
		
		x = (typeof(x) === 'number') ? x : (oldX || 0);
		y = (typeof(y) === 'number') ? y : (oldY || 0);
		c = (typeof(c) === 'number') ? c : (oldC || 0);
		pat = (typeof(pat) === 'number') ? pat : oldPat;
		this.sprites[idx] = {x: x, y: y, c: c, pat: pat};
	
		this.changed = true;	
	}
	
	update() {
		if (!this.changed)
			return;
			
		var cv = this.canvasCtx;
		cv?.clearRect(0,0, 512, 384);
		for (var i in this.sprites) {
			var sp = this.sprites[i];
			if (sp && sp.c) {
				if (this.mode % 2) {
					this.drawSpriteZoom(sp);
				} else {
					this.drawSprite(sp);
				}
			}
		}
		this.changed = false;	
	}
	
	drawSprite(sp: Sprite) {
		var cv = this.canvasCtx;
		if (!cv) return;
		var data = this.spriteData[sp.pat] || "";
		
		var x = sp.x * 2;
		var y = sp.y * 2;
		
		cv.fillStyle = this.palette[sp.c];
		for (var i=0; i < data.length; i++, y += 2) {
			var mask = data.charCodeAt(i);
			if (i == 16) {
				x += 16;
				y -= 32;
			}
			if (mask & 128) cv.fillRect( x+0, y, 2, 2);
			if (mask &  64) cv.fillRect( x+2, y, 2, 2);
			if (mask &  32) cv.fillRect( x+4, y, 2, 2);
			if (mask &  16) cv.fillRect( x+6, y, 2, 2);
			if (mask &   8) cv.fillRect( x+8, y, 2, 2);
			if (mask &   4) cv.fillRect(x+10, y, 2, 2);
			if (mask &   2) cv.fillRect(x+12, y, 2, 2);
			if (mask &   1) cv.fillRect(x+14, y, 2, 2);		
		}
	}
	
	drawSpriteZoom(sp: Sprite) {
		var cv = this.canvasCtx;
		if (!cv) return;
		var data = this.spriteData[sp.pat] || "";
		
		var x = sp.x * 2;
		var y = sp.y * 2;
		
		cv.fillStyle = this.palette[sp.c];
		for (var i=0; i < data.length; i++, y += 4) {
			var mask = data.charCodeAt(i);
			if (i == 16) {
				x += 32;
				y -= 64;
			}
			if (mask & 128) cv.fillRect( x+0, y, 4, 4);
			if (mask &  64) cv.fillRect( x+4, y, 4, 4);
			if (mask &  32) cv.fillRect( x+8, y, 4, 4);
			if (mask &  16) cv.fillRect(x+12, y, 4, 4);
			if (mask &   8) cv.fillRect(x+16, y, 4, 4);
			if (mask &   4) cv.fillRect(x+20, y, 4, 4);
			if (mask &   2) cv.fillRect(x+24, y, 4, 4);
			if (mask &   1) cv.fillRect(x+28, y, 4, 4);		
		}
	}	
}

