// === signatures

/*
peding set/get impl:
	base

stopped at CSRLIN
*/

Parser.commands = {
	'auto': { signature: ['i...'], notimpl: true },	
	'beep': { signature: [], notimpl: true },
	'bload': { signature: [], notimpl: true },
	'bsave': { signature: [], notimpl: true },
	'call': { signature: [], notimpl: true },
	'circle': { signature: [], notimpl: true },	
	'clear': { method: 'cmd_clear', signature: ['v...'] },		
	'cload': { signature: [], notimpl: true },	
	'close': { signature: [], notimpl: true },
	'cls': { method: 'cmd_cls', signature: [] },	
	'color': { method: 'cmd_color', signature: ['i...'] },	
	'cont': { signature: [], notimpl: true },
	'csave': { signature: [], notimpl: true },
	'play': { signature: ['s...'], notimpl: true },
	'sound': { signature: ['i...'], notimpl: true },
	'print': { method: 'cmd_print', signature: 'parsePrint' },
	'html': { method: 'cmd_html', signature: 'parsePrint' },	
	'input': { method: 'cmd_input', signature: 'parseInput', suspend: true },
	'read': { method: 'cmd_read', signature: ['r...'] },
	'restore': { method: 'cmd_restore', signature: 'parseRestore' },
	'screen': { method: 'cmd_screen', signature: ['int', 'int?'], suspend: true },	
	'pset': { method: 'cmd_pset', signature: ['ipair', 'i...'] },
	'line': { method: 'cmd_line', signature: 'parseLine' },
	'circle': { method: 'cmd_circle', signature: ['ipair', 'int', 'n...?'] },
	'sleep': { method: 'cmd_sleep', signature: ['int'], suspend: true },
	'eval': { method: 'fn_eval', signature: ['str'] },
	'setsprite': { method: 'cmd_setsprite', signature: ['int', 'str'] },
	'put': { method: 'cmd_putsprite', signature: 'parsePut' },
	'grp': { method: 'cmd_grp', signature: 'parseGrp' },
	'poke': { method: 'cmd_poke', signature: ['int', 'int'] },
	'run': { method: 'cmd_run', signature: ['int?'] },
	'open': { signature: 'parseOpen', notimpl: true },
	'paint': { signature: ['ipair', 'int?'], notimpl: true },
	'sprite': { method: 'cmd_setsprite', signature: 'parseSprite' }
};

Parser.functions = {
	'abs': { signature: ['num'], relay: 'Math.abs' },
	'asc': { signature: ['str'], method: 'fn_asc' },	
	'atn': { signature: ['num'], relay: 'Math.atan' },
	'bin$': { signature: ['int'], method: 'fn_bin' },
	'cos': { signature: ['num'], relay: 'Math.cos' },
	'cdbl': { signature: ['val'], relay: '_float' },
	'chr$': { signature: ['int'], relay: 'String.fromCharCode' },
	'cint': { signature: ['val'], relay: '_int' },
	'csng': { signature: ['val'], notimpl: true },	
	'sin': { signature: ['num'], relay: 'Math.sin' },
	'tan': { signature: ['num'], relay: 'Math.tan' },
	'sqr': { signature: ['num'], relay: 'Math.sqrt' },
	'sgn': { signature: ['num'], method: 'fn_sgn' },	
	'rnd': { signature: ['i...'], method: 'fn_rnd' },
	'int': { signature: ['val'], relay: '_int' },
	'string$': { signature: ['int', 'str'], method: 'fn_string' },
	'tab': { signature: ['int'], method: 'fn_tab' },
	'str$': { signature: ['val'], method: 'fn_str' },	
	'left$': { signature: ['str', 'int'], method: 'fn_left' },	
	'right$': { signature: ['str', 'int'], method: 'fn_right' },	
	'mid$': { signature: 'parseMid', method: 'fn_mid' },
	'len' : { signature: ['ref'], method: 'fn_len' },
	'val': { signature: ['str'], method: 'fn_val' },
	'inkey$': { signature: [], method: 'fn_inkey' },
	'stick': { signature: ['int'], method: 'fn_stick' },
	'strig': { signature: ['int'], method: 'fn_strig' },	
	'eval': { signature: ['str'], method: 'fn_eval' },
	'play': { signature: ['int'], method: 'fn_play' }
};

// === parsing

Parser.prototype.parseRestore = function() {
	var label = '';
	if (!this.isSep()) {
		label = "'" + this.expression() + "'";
	}
	return [label];
}

Parser.prototype.parseMid = function() {
	var args = [];
	args.push(this.expression());
	this.eat(',');
	args.push(this.expression() + '-1');	
	if (this.ttk == ',') {
		this.next();
		args.push(this.expression());
	}
	return args;
}

Parser.prototype.parsePrint = function() {
	var args = [];
	var newline = true;
	var file = null;
	if (this.ttk == 'file') {
		file = this.tval;
		this.next();
		if (this.ttk != ',') {
			throw "Expecting ',', got " + this.tval;
		}
		this.next();
	}
	var using = null;
	if (this.ttk == 'using') {
		this.next();
		using = this.expression();
		//args.push('('+ expr + ').toString()');
		this.eat(';');
	}
	args.push('{' +
		'file:' + ((file) ? '"' + file + '"' : 'null') + 
		', ' +
		'using: ' + ((using) ? '(' + using + ').toString()' : 'null') +
		'}'
	);

	while (!this.isSep()) {
		newline = true;
		if (this.ttk == ',') {
			args.push('"\\t"');
			this.next();
		} else
		if (this.ttk == ';') {
			newline = false;
			this.next();			
		} else {
			args.push(this.expression());			
		}
	}
	if (newline)
		args.push('"\\n"');
	return args;
}

Parser.prototype.parseInput = function(stats, mark) {
	mark = (mark == null) ? '?' : mark;
	var title = mark;
	if (this.ttk == 'string') {
		title = this.tk.matches[1] + mark;
		this.next();
		this.eat(';');
	}
	var refs = this.commandArguments(['r...'], true, ';');
	return [ '"' + title + '"', '[' + refs + ']' ];
}

Parser.prototype.parseLine = function(stats) {
	if (this.ttk == 'input') {
		this.next();
		return { method: 'cmd_input', args: this.parseInput(stats, ''), suspend: true };
	}
	var sig = ['seg', 'int?', 'id?'];
	return this.commandArguments(sig);
}

Parser.prototype.parsePut = function(stats) {	
	if (this.ttk == 'sprite') {
		this.next();
		var sig = ['int', 'ipair?', 'int', 'int'];
		return this.commandArguments(sig);
	}
}

Parser.prototype.parseGrp = function() {
	var args = [];
	var pair = this.pair();
	args.push('[_int(' + pair[0] + '),_int(' + pair[1] + ')]');
	this.eat(',');
	var pargs = this.parsePrint();
	pargs.shift();
	return args.concat(pargs);
}

Parser.prototype.parseOpen = function() {
	/**@todo */
	//OPEN"GRP:"FOROUTPUTAS#1
	while (!this.isSep() && this.ttk && this.ttk != 'file') {
		this.next();
	}
	if (this.ttk == 'file') {
		this.next();
	}
	return [];
}

Parser.prototype.parseSprite = function() {
	this.eat('$');
	var matrix = this.getMatrix();
	this.eat('=');
	var value = this.expression();
	return [ matrix[0], value ];	
}

// === runtime

Interp.prototype.fn_asc = function(v) {
	return v.charCodeAt(0);
}

Interp.prototype.fn_bin = function(n) {
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

Interp.prototype.fn_rnd = function() {
	return Math.random();
}

Interp.prototype.fn_string = function(times, str) {
	var r = '';
	while (times--)
		r += str;
	return r;
}

Interp.prototype.fn_tab = function(n) {
	return this.fn_string(n, "\t");
}

Interp.prototype.fn_val = function(str) {
	//@todo: implement more conversions
	if (str.substr(0, 2).toUpperCase() == '&H') {
		str = '0x' + str.substr(2);
	}
	var v = parseInt(str);
	return (isNaN(v)) ? 0 : v;
}

Interp.prototype.fn_str = function(val) {
	return val.toString();
}

Interp.prototype.fn_mid = function(str, idx, len) {
	return str.toString().substr(idx, len);
}

Interp.prototype.fn_left = function(str, len) {
	return str.toString().substr(0, len);
}

Interp.prototype.fn_right = function(str, len) {
	return str.toString().substr(-len);
}

Interp.prototype.fn_len = function(ref) {
	return this.getVar(ref).toString().length;
}

Interp.prototype.fn_inkey = function() {
	return Interp.pressed;
}

Interp.prototype.fn_stick = function(stick) {
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

Interp.prototype.fn_strig = function(stick) {
	if (stick == 0) {
		return Interp.stick0[32] ? -1 : 0;
	}
	return 0;
}

Interp.prototype.fn_eval = function(js) {
	return eval(js);
}

Interp.prototype.fn_play = function() {
	return 0;
}

Interp.prototype.fn_sgn = function(v) {
	return (v == 0) ? 0 : ((v < 0) ? -1 : 1);
}

Interp.prototype.cmd_clear = function() {
	this.vars = {};
}

Interp.prototype.cmd_print = function() {
	/**@todo implement "USING" format mask */
	if (arguments[0].file == null && !this.output) {
		return;
	}
	var output = [];
	for (var i = 1; i < arguments.length; i++) {
		output.push(arguments[i]);
	}
	if (arguments[0].file == null) {
		var el = document.createElement('pre');
		el.innerHTML = output.join('').replace('<', '&lt;').replace("\n", '<br />');
		this.output.appendChild(el);
	} else {
		this.blitChars(null, output.join(''));
	}
}

Interp.prototype.cmd_html = function() {
	if (!this.output)
		return;
	var output = [];
	for (var i = 1; i < arguments.length; i++) {
		output.push(arguments[i]);
	}
	var el = document.createElement('pre');
	el.innerHTML = output.join('');
	this.output.appendChild(el);
}

Interp.prototype.cmd_input = function(title, refs, idx) {
	var I = this;
	
	this.suspend();
	idx = idx || 0;
	
	if (idx == refs.length) {
		this.resume();
	} else {
		var ref = refs[idx];
		var input = document.createElement('input');
		this.cmd_print(title);
		this.output.appendChild(input);
		input.onkeypress = function(e) {
			e = e || window.event;
			if (e.keyCode == 13) {
				var v = input.value;
				I.setVar(ref, v);
				I.output.removeChild(input);
				I.cmd_print(v, "\n");
				I.cmd_input(title, refs, idx + 1);
			}
		}
		input.focus();
	}
}

Interp.prototype.cmd_read = function() {
	for (var i = 0; i < arguments.length; i++) {
		var arg = arguments[i];
		var v = this.parser.data[this.dataIdx++];
		this.setVar(arg, v);
	}
}

Interp.prototype.cmd_restore = function(label) {
	this.dataIdx = (label) ? this.parser.dataLabels[label] : 0;
}

Interp.prototype.cmd_cls = function() {
	if (this.output) {
		this.output.innerHTML = '';		
	}
}

Interp.prototype.cmd_screen = function(mode, submode) {
	this.suspend();
	this.curPos = [0,0];
	(this.onChangeMode) && (this.onChangeMode(mode));
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

Interp.prototype.cmd_color = function(fg, bg, border) {
	this.canvas.setColors(fg, bg, border);
}

Interp.prototype.cmd_pset = function(pair, c) {
	if (c === null) {
		c = this.canvas.color;
	}
	this.canvas.pset(_int(pair[0]), _int(pair[1]), c);
	this.curPos = pair;
}

Interp.prototype.cmd_line = function(seg, c, type) {
	if (c === null) {
		c = this.canvas.color;
	}
	var src = seg[0] || this.curPos;
	var dest = seg[1] || this.curPos;
	if (!type) {
		this.canvas.line(_int(src[0]), _int(src[1]), _int(dest[0]), _int(dest[1]), c);
	} else
	if (type == 'b' || type == 'B') {
		this.canvas.rect(_int(src[0]), _int(src[1]), _int(dest[0]), _int(dest[1]), c);
	} else
	if (type == 'bf' || type == 'BF') {
		this.canvas.fillRect(_int(src[0]), _int(src[1]), _int(dest[0]), _int(dest[1]), c);
	}	
	this.curPos = dest;
}

Interp.prototype.cmd_circle = function(src, rad, c) {
	if (c === null) {
		c = this.canvas.color;
	}
	this.canvas.circle(_int(src[0]), _int(src[1]), rad, c);
}

Interp.prototype.cmd_sleep = function(tim) {
	var I = this;
	this.suspend();
	setTimeout(function() { I.resume(); }, tim);
}

Interp.prototype.cmd_setsprite = function(idx, data) {
	this.spriteCanvas.setSprite(idx, data);
}

Interp.prototype.cmd_putsprite = function(idx, coord, color, pat) {
	var x = coord ? coord[0] : null;
	var y = coord ? coord[1] : null;	
	this.spriteCanvas.putSprite(idx, x, y, color, pat);
}

Interp.prototype.cmd_grp = function(coord) {
	if (!this.canvas)
		return;
	var output = [];
	for (var i = 1; i < arguments.length; i++) {
		output.push(arguments[i]);
	}
	var txt = output.join('');
	this.blitChars(coord, txt);
}

Interp.prototype.cmd_poke = function(address, value) {
	this.ram[address] = value;
}

Interp.prototype.cmd_run = function(line) {
	this.clear();
	if (line) {
		this.jump(line);
	}
}

