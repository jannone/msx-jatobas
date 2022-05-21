import { InterpBase, VarRef } from "./interpBase";

export class Interp extends InterpBase {
	fn_asc(v: string) {
		return v.charCodeAt(0);
	}
	
	fn_bin(n: number) {
		var r = '';	
		if (n < 0)
			n = 65536 + n;
		if (n < 0)
			throw ("Overflow");		
		while (n != 0) {
			r = (n & 1).toString() + r;
			n >>= 1;
		}
		return r;
	}
	
	fn_rnd() {
		return Math.random();
	}
	
	fn_string(times: number, str: string) {
		var r = '';
		while (times--)
			r += str;
		return r;
	}
	
	fn_tab(n: number) {
		return this.fn_string(n, "\t");
	}
	
	fn_val(str: string) {
		//@todo: implement more conversions
		if (str.substr(0, 2).toUpperCase() == '&H') {
			str = '0x' + str.substr(2);
		}
		var v = parseInt(str);
		return (isNaN(v)) ? 0 : v;
	}
	
	fn_str(val: any) {
		return val.toString();
	}
	
	fn_mid(str: string, idx: number, len: number) {
		return str.toString().substr(idx, len);
	}
	
	fn_left(str: string, len: number) {
		return str.toString().substr(0, len);
	}
	
	fn_right(str: string, len: number) {
		return str.toString().substr(-len);
	}
	
	fn_len(ref: VarRef) {
		return this.getVar(ref).toString().length;
	}
	
	fn_inkey() {
		return Interp.pressed;
	}
	
	fn_stick(stick: number) {
		if (stick == 0) {
			var dir = Interp.stick0;
			if (dir[37]) {
				return dir[40] ? 6 : (dir[38] ? 8 : 7);
			} else
			if (dir[38]) {
				return dir[37] ? 8 : (dir[39] ? 2 : 1);
			} else
			if (dir[39]) {
				return dir[38] ? 2 : (dir[40] ? 4 : 3);
			} else
			if (dir[40]) {
				return dir[39] ? 4 : (dir[37] ? 6 : 5);
			}
		}
		return 0;
	}
	
	fn_strig(stick: number) {
		if (stick == 0) {
			return Interp.stick0[32] ? -1 : 0;
		}
		return 0;
	}
	
	// fn_eval(js: string) {
	// 	return eval(js);
	// }
	
	fn_play() {
		return 0;
	}
	
	fn_sgn(v: number) {
		return (v == 0) ? 0 : ((v < 0) ? -1 : 1);
	}
	
	cmd_clear() {
		this.vars = {};
	}
	
	cmd_print(...args: any[]) {
		/**@todo implement "USING" format mask */
		if (args[0].file == null || !this.output) {
			return;
		}
		var output = [];
		for (var i = 1; i < args.length; i++) {
			output.push(args[i]);
		}
		if (args[0].file == null) {
			var el = document.createElement('pre');
			el.innerHTML = output.join('').replace('<', '&lt;').replace("\n", '<br />');
			this.output.appendChild(el);
		} else {
			this.blitChars(null, output.join(''));
		}
	}
	
	cmd_html(...args: any[]) {
		if (!this.output)
			return;
		var output = [];
		for (var i = 1; i < args.length; i++) {
			output.push(args[i]);
		}
		var el = document.createElement('pre');
		el.innerHTML = output.join('');
		this.output.appendChild(el);
	}
	
	cmd_input(title: string, refs: VarRef[], idx: number) {
		this.suspend();
		idx = idx || 0;
		
		if (idx == refs.length) {
			this.resume();
		} else {
			var ref = refs[idx];
			var input = document.createElement('input');
			this.cmd_print(title);
			this.output?.appendChild(input);
			input.onkeypress = (e) => {
				e = e || window.event;
				if (e.keyCode == 13) {
					var v = input.value;
					this.setVar(ref, v);
					this.output?.removeChild(input);
					this.cmd_print(v, "\n");
					this.cmd_input(title, refs, idx + 1);
				}
			}
			input.focus();
		}
	}
	
	cmd_read(...args: any[]) {
		for (var i = 0; i < args.length; i++) {
			var arg = args[i];
			var v = this.program.data[this.dataIdx++];
			this.setVar(arg, v);
		}
	}
	
	cmd_restore(label: string) {
		this.dataIdx = (label) ? this.program.dataLabels[label] : 0;
	}
	
	cmd_cls() {
		if (this.output) {
			this.output.innerHTML = '';		
		}
	}
	
	cmd_screen(mode: number, submode: number) {
		this.suspend();
		this.curPos = [0,0];
		this.onChangeMode?.(mode);
		var oldMode = this.canvas.getMode();
		this.canvas.setMode(mode);
		if (this.spriteCanvas) {
			if (typeof(submode) === 'number') {
				this.spriteCanvas.setMode(submode);
			}
			if (oldMode != mode) {
				this.spriteCanvas.clear();
			} else {
				this.spriteCanvas.clearSprites();
			}
		}
		var I = this;
		setTimeout(function() { I.resume(); }, 1000);
	}
	
	cmd_color(fg: number, bg: number, border: number) {
		this.canvas.setColors(fg, bg, border);
	}
	
	cmd_pset(pair: number[], c: number) {
		if (c === null) {
			c = this.canvas.color;
		}
		this.canvas.pset(this._int(pair[0]), this._int(pair[1]), c);
		this.curPos = pair;
	}
	
	cmd_line(seg: number[][], c: number, type: string) {
		if (c === null) {
			c = this.canvas.color;
		}
		var src = seg[0] || this.curPos;
		var dest = seg[1] || this.curPos;
		if (!type) {
			this.canvas.line(this._int(src[0]), this._int(src[1]), this._int(dest[0]), this._int(dest[1]), c);
		} else
		if (type == 'b' || type == 'B') {
			this.canvas.rect(this._int(src[0]), this._int(src[1]), this._int(dest[0]), this._int(dest[1]), c);
		} else
		if (type == 'bf' || type == 'BF') {
			this.canvas.fillRect(this._int(src[0]), this._int(src[1]), this._int(dest[0]), this._int(dest[1]), c);
		}	
		this.curPos = dest;
	}
	
	cmd_circle(src: number[], rad: number, c: number) {
		if (c === null) {
			c = this.canvas.color;
		}
		this.canvas.circle(this._int(src[0]), this._int(src[1]), rad, c);
	}
	
	cmd_sleep(tim: number) {
		var I = this;
		this.suspend();
		setTimeout(function() { I.resume(); }, tim);
	}
	
	cmd_setsprite(idx: number, data: string) {
		this.spriteCanvas.setSprite(idx, data);
	}
	
	cmd_putsprite(idx: number, coord: number[], color: number, pat: number) {
		var x = coord ? coord[0] : undefined;
		var y = coord ? coord[1] : undefined;	
		this.spriteCanvas.putSprite(idx, x, y, color, pat);
	}
	
	cmd_grp(coord: number[]) {
		if (!this.canvas)
			return;
		var output = [];
		for (var i = 1; i < arguments.length; i++) {
			output.push(arguments[i]);
		}
		var txt = output.join('');
		this.blitChars(coord, txt);
	}
	
	cmd_poke(address: number, value: number) {
		this.ram[address] = value;
	}
	
	cmd_run(line: string) {
		this.clear();
		if (line) {
			this.jump(line);
		}
	}	
}
