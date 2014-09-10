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

// Lexer

function Lex() {
	this.debugQueue = [];

	this.ruleChunk = {re: /^[^,:]+/, tk: 'chunk', inactive: true};

	this.dict0 = [
		{re: /^ +/, tk: 'space', ignore: true},
		{re: /^"([^"]*)"?/, tk: 'string'},
		this.ruleChunk,	
		{re: /^\'.*/i, tk: 'comment', ignore: true},	
		{re: /^\,/, tk: ','},
		{re: /^\;/, tk: ';'},
		{re: /^\(/, tk: '('},
		{re: /^\)/, tk: ')'},	
		{re: /^(\+|\-|\/|\\|\*|mod)/i, tk: 'op'},
		{re: /^(\<\=|\>\=|\<\>|\<|\>)/, tk: 'bop'},
		{re: /^:/, tk: ':'},
		{re: /^\=/, tk: '='},
		{re: /^(and|or)/i, tk: 'lop'},
		{re: /^\$/, tk: '$'}
	];

	this.dict1 = [	
		{re: /^rem.*/i, tk: 'comment', ignore: true},
		{re: /^[a-z_]+[a-z0-9_]*[%\$]?/i, tk: 'id'},
		{re: /^[0-9]*\.[0-9]+\#?/, tk: 'float'},
		{re: /^[0-9]+/, tk: 'integer'},
		{re: /^\&H[0-9A-F]+/i, tk: 'inthexa'},
		{re: /^\&B[01]+/i, tk: 'intbin'},
		{re: /^\#[0-9]+/, tk: 'file'}
	];
	
	this.keywords = [
		'restore',	
		'return',	
		'defint',	
		'defsng',	
		'gosub',
		'data',
		'step',
		'stop',
		'next',
		'then',
		'else',
		'error',
		'using',
		'sprite',
		'goto',
		'and',
		'for',
		'not',
		'end',
		'dim',	
		'not',
		'if',
		'to',
		'on',
		'or'
	];
}

Lex.prototype.registerKeywords = function(keywords) {
	this.keywords = this.keywords.concat(keywords);
}

Lex.prototype.init = function() {
	var keyRules = [];
	for (var i = 0; i < this.keywords.length; i++) {
		var kw = this.keywords[i];
		var re = new RegExp("^" + kw.replace('$', '\\$'), "i");
		keyRules.push({re: re, tk: kw});
	}
	keyRules = keyRules.sort(function(a,b) { return a.length > b.length; });
	this.dict = this.dict0.concat(keyRules).concat(this.dict1);
}

Lex.prototype.setCode = function(code) {
	this.lines = code.toString().split("\n");
	this.nline = 0;
	this.line = '';
	this.tk = null;	
}

Lex.prototype.next = function () {
	this.tk = {};
	if (this.line == '') {
		if (this.lines.length == 0)
			return this.tk;
		if (this.line = this.lines.shift())
			this.line = this.line.replace(/[\n\r]+$/, '');
		this.nline++;
		this.tk = { val: "\n", tk: 'sep' };
		return this.tk;
	}
	for (var i = 0; i < this.dict.length; i++) {
		var test = this.dict[i];
		var res = test.re.exec(this.line);
		if (res) {
			if (test.inactive)
				continue;

			// WORKAROUND FOR VAR NAMES THAT INCLUDE KEYWORDS 
			// (eg: ONXGOSUB should not be read as "XGOSUB")
			/**@todo this is bad for performance, find a way to avoid needing this */
			if (test.tk == 'id') {
				var tkid = res[0].toLowerCase();
				var limit = null;
				for (var ki=0; ki<this.keywords.length; ki++) {
					var kw = this.keywords[ki];
					var kwIndex = tkid.indexOf(kw);
					if (kwIndex > -1) {
						if (limit === null || kwIndex < limit) {
							limit = kwIndex;
						}
					}
				}
				if (limit !== null) {
					res[0] = res[0].substr(0, limit);
				}
			}
			// END OF WORKAROUND
				
			this.tk = { val: res[0], tk: test.tk, matches: res };
			
			this.debugQueue.push('' + this.nline + ' ' + this.tk.tk + ' ' + this.tk.val);
			if (this.debugQueue.length > 50) {
				this.debugQueue.shift();
			}
					
			this.line = this.line.substr(this.tk.val.length);			
			if (!test.ignore)
				return this.tk;
			return this.next();			
		}
	}
	throw ("Syntax Error, " + this.line);
	return false;
}

// Parser

function Parser() {
	this.onTranslate = null;
	this.lex = null;
	this.keywords = [];
	
	for (var k in Parser.commands)
		this.keywords.push(k);
	for (var k in Parser.functions)
		this.keywords.push(k);	
};

Parser.prototype.next = function() {
	this.tk = this.lex.next();
	if (this.tk.tk == 'id')
		this.tk.val = this.tk.val.toLowerCase();
	this.ttk = this.tk.tk;
	this.tval = this.tk.val;
	return this.tk;	
}

Parser.prototype.eat = function(token, tval) {
	if (this.ttk != token)
		throw('Expecting ' + token + ', got ' + this.ttk);
	if (tval != null && this.tval != tval)
		throw('Expecting ' + tval + ', got ' + this.tval);
	var res = {tk: this.ttk, val: this.tval};
	this.next();
	return res;
}

Parser.prototype.pushBack = function(str) {
	this.lex.line = str + this.lex.line;
}

Parser.prototype.localid = function() {
	this.gid++;
	return '_' + this.gid;
}

Parser.prototype.start = function(code) {
	this.rule = 'start';
	
	this.currLabel = null;
	this.funcs = [];
	this.labels = {};
	this.data = [];
	this.dataLabels = {};
	this.typedefs = {};
	this.gid = 0;

	this.lex = new Lex();
	this.lex.registerKeywords(this.keywords);
	this.lex.init();
	this.lex.ruleChunk.inactive = true;	
	this.lex.setCode(code.trim() + "\n");
	
	this.next();
		
	while (this.ttk) {
		if (this.ttk == 'integer')
			this.labeledLine();
		else
		if (this.ttk == 'sep')
			this.next();
		else
			this.getLine();
	}
}

Parser.prototype.labeledLine = function() {
	this.rule = 'labeledLine';
	
	this.currLabel = this.tval;
	this.next();
	var index = this.funcs.length;
	this.getLine();
	this.labels[this.currLabel] = index;
}

Parser.prototype.getLine = function() {
	this.rule = 'getLine';
	
	var stats = this.compound();
	this.eat('sep');

	var trans = '';
	while (stats.length) {
		var stat = stats.shift();
		if (stat === null) {
			continue;
		}
		if (stat.charAt(0) == '_') {
			var f = null;
			try {
				f = new Function('I', 'V', trans);
			} catch (ex) {
				throw "Parser error, generated invalid translation: " + trans;
			}
			this.funcs.push(f);
			(this.onTranslate) && (this.onTranslate(trans));
			this.labels[stat] = this.funcs.length;
			(this.onTranslate) && (this.onTranslate('', stat));
			trans = '';
		} else {
			trans += stat;			
		}
	}
	if (trans != '') {
		var f = null;
		try {
			f = new Function('I', 'V', trans);
		} catch (ex) {
			throw "Parser error, generated invalid translation: " + trans;
		}
		this.funcs.push(f);
		(this.onTranslate) && (this.onTranslate(trans));
	}	
}

Parser.prototype.compound = function() {
	this.rule = 'compound';
	
	var stats = this.getStatement();
	while (this.ttk == ':') {
		this.next();
		stats = stats.concat(this.getStatement());
	}
	return stats;
}

Parser.prototype.getStatement = function() {
	this.rule = 'getStatement ' + this.ttk;
	
	var stats = [];
	switch (this.ttk) {
		case 'defint':
		case 'defsng':
			var type = this.ttk.replace(/^def/i, '');
			this.next();

			if (this.ttk != 'id' || this.tval.length != 1) {
				throw ("Expecting letter, got " + this.ttk);
			}
			var defStart = this.tval.toLowerCase();
			this.next();
			
			if (this.ttk == 'op' && this.tval == '-') {
				this.next();

				if (this.ttk != 'id' || this.tval.length != 1) {
					throw ("Expecting letter, got " + this.ttk);
				}
				var defEnd = this.tval.toLowerCase();
				this.next();
				
				if (defEnd < defStart) {
					throw ("DEF end letter must be higher than start");
				}
				
				for (var c = defStart.charCodeAt(0); c < defEnd.charCodeAt(0); c++) {
					this.typedefs[ String.fromCharCode(c) ] = type;
				}
			}
			
			
			break;
		case 'sep':
			break;
		case ':':
			this.next();
			break;
		case 'on':
			this.next();

			var onType = this.ttk;
			if (onType == 'error' || onType == 'stop') {
				this.next();
				var type = this.ttk;
				if (type != 'goto' && type != 'gosub') {
					throw('Expecting GOTO or GOSUB, got ' + this.ttk);
				}
				this.next();

				var line = this.expression();
				if (type == 'gosub') {
					var back = this.localid();
					stats.push('I.setOn("' + onType + '", [' + 
						[line, '"' + back + '"'].join(',') + ']);');
				} else {
					stats.push('I.setOn("' + onType + '", ' + line + ');');
				}
				
			} else {
				var expr = this.expression();
				var type = this.ttk;
				if (type != 'goto' && type != 'gosub') {
					throw('Expecting GOTO or GOSUB, got ' + this.ttk);
				}
				this.next();
				var args = this.commandArguments(['v...']);
				args.unshift(null);
				args = '[' + args.join() + '][' + expr + ']';
				if (type == 'gosub') {
					var back = this.localid();
					stats.push('return I.pgosub(' + args + ', "' + back + '");', back);
					break;
				}
				stats.push('return ' + args + ';');
			}
			break;
		case 'data':
			this.lex.ruleChunk.inactive = false;
			this.next();
			var label = this.currLabel;
			if (!this.dataLabels[label])
				this.dataLabels[label] = this.data.length;
			while (!this.isSep()) {
				var chunk = '';
				if (this.ttk != ',') {
					if (this.ttk == 'chunk')
						chunk = this.tval.trim();
					else
					if (this.ttk == 'string')
						chunk = this.tk.matches[1];
					else
						throw('Syntax error');
					this.next();
					this.data.push(chunk);
					if (this.ttk == ',') {
						this.next();
						if (this.isSep())
							this.data.push('');
					}
				} else {
					this.next();
					this.data.push('');
					if (this.isSep())
						this.data.push('');
				}
			}
			this.lex.ruleChunk.inactive = true;
			break;
		case 'end':
			this.next();
			stats.push('return -1;');
			break;
		case 'dim':
			this.next();
			var name = this.varname();
			if (this.ttk != '(')
				throw('Expecting array size');
			var matrix = this.getMatrix();
			stats.push('I.dim("@' + name + '", [' + matrix.join() + ']);');
			while (this.ttk == ',') {
				this.next();
				name = this.varname();
				if (this.ttk != '(')
					throw('Expecting array size');
				var matrix = this.getMatrix();
				stats.push('I.dim("@' + name + '", [' + matrix.join() + ']);');
			}
			break;
		case 'gosub':
			this.next();
			var line = this.expression();
			var back = this.localid();
			stats.push('return I.pgosub("' + line + '", "' + back + '");', back);
			break;
		case 'return':
			this.next();
			stats.push('return I.preturn();');
			break;
		case 'for':
			var label = this.localid();
			this.next();
			var name = this.tval;
			var asg = this.assignment();
			this.eat('to');
			var limit = this.expression();
			var step = 1;
			if (this.ttk == 'step') {
				this.next();
				step = this.expression();
			}
			stats.push(asg);
			stats.push('I.pfor("' + name + '", "' + label + '", ' + limit + ', ' + step + ');', label);
			break;
		case 'next':
			this.next();
			var names = [];
			if (!this.isSep()) {
				var id = this.varname();
				names.push(id);
				while (!this.isSep()) {
					this.eat(',');
					id = this.varname();
					names.push(id);
				}
			} else
				names.push(null);
			for (var i = 0; i < names.length; i++) {
				var name = names[i];
				stats.push( (name != null) ? 'var r=I.pnext("' + name + '");' : 'var r=I.pnext();' );
				stats.push( 'if (r!=null) return r;' );
			}
			break;
		case 'if':
			this.next();
			var expr = this.expression();
			this.eat('then');
			if (this.ttk == 'integer') {
				this.pushBack('goto ' + this.tval);
				this.next();
			}
			var L1 = this.localid();			
			var condTrue = this.compound();
			stats.push('if (!(' + expr + ')) return "' + L1 + '";');
			stats = stats.concat(condTrue);
			if (this.ttk == 'else') {
				this.next();
				if (this.ttk == 'integer') {
					this.pushBack('goto ' + this.tval);
					this.next();
				}
				var L2 = this.localid();				
				stats.push('return "' + L2 + '";', L1);
				var condFalse = this.compound();
				stats = stats.concat(condFalse);
				stats.push(L2);
			} else
				stats.push(L1);
			break;
		case 'goto':
			this.next();
			var expr = this.expression();
			stats.push('return (' + expr + ');');
			break;
		case 'id':
			stats.push( this.assignment() );
			break;
		case 'stop':
			this.next();
			if (this.ttk == 'on' || this.ttk == 'off') {
				var active = (this.ttk == 'on');
				this.next();
				stats.push('I.activateOn("stop", ' + (active ? 'true' : 'false') + ');');
			}
			break;
		default:
			var cmd = Parser.commands[this.ttk];
			if (cmd) {
				if (cmd.notimpl) {
					if (this.warnNotImplemented) {
						this.warn("NOT_IMPLEMENTED", this.currLabel, this.ttk);
					} else {
						throw "Not implemented: " + this.ttk;
					}
				}
				this.rule = this.ttk;
				this.next();
				var idx = stats.length;
				stats.push(null);				
				var args = (typeof cmd.signature == 'string') ? 
					this[cmd.signature](stats) :
					this.commandArguments(cmd.signature);

				if (!cmd.notimpl) {
					if (args.method) {
						stats[idx] = 'I.' + args.method + '(' + args.args.join() + ');';
					} else {
						stats[idx] = 'I.' + cmd.method + '(' + args.join() + ');';
					}
				}
				if (cmd.suspend || args.suspend) {
					stats.push(this.localid());
				}
			} else {
				throw ("Invalid command " + this.tval);
			}
			break;
	}
	return stats;
}

Parser.prototype.getMatrix = function(dojoin, sep) {
	this.rule = 'getMatrix';

	sep = sep || ',';
	var matrix = (dojoin) ? '' : null;
	if (this.ttk == '(') {
		this.next();
		matrix = [ this.expression() ];
		while (this.ttk == sep) {
			this.next();
			matrix.push( this.expression() );
		}
		this.eat(')');
		if (dojoin)
			matrix = '[' + matrix.join('][') + ']';
	}
	return matrix;
}

Parser.prototype.assignment = function() {
	this.rule = 'assignment';

	var name = this.varname();
	var matrix = this.getMatrix();
	(matrix) && (name = '@' + name);

	this.eat('=');
	var expr = this.expression();
	/**@todo generalize special vars assignments such as "sprite$", delegate to other methods **/
	if (name == '@sprite$') {
		return 'I.cmd_setsprite(_int(' + matrix[0] + '),' + expr + ');';
	}
	matrix = (matrix) ? '[' + matrix.join('][') + ']': '';
	var firstchar = (name[0] == '@') ? name[1] : name[0];
	var lastchar = name.substr(-1);
	if (firstchar && lastchar.match(/[a-zA-Z0-9_]/)) {
		var type = this.typedefs[firstchar];
		if (type == 'int') {
			expr = '_int(' + expr + ')';
		}
	}
	return 'V["' + name + '"]' + matrix + '=' + expr + ';';	
}

Parser.prototype.commandArguments = function(signature, isfunc, sep) {
	this.rule = 'commandArguments';

	var args = [];
	var param = null;
	var isig = 0;
	sep = sep || ',';
	
	while (!this.isSep()) {
		if (isfunc && this.ttk == ')')
			break;
		var param = signature[isig];
		if (!param)
			throw('Too many arguments');
		var optional = false;
		if (param.substr(-1) == '?') {
			optional = true;
			param = param.substr(0, param.length-1);
		}
		if (optional && this.ttk == sep) {
			this.next();
			args.push('null');
			if (param.substr(-3) != '...') {
				isig++;
			}
			continue;
		}
		switch (param) {
			case 'id':
				var name = this.varname();
				args.push('"' + name + '"');
				isig++;
				break;
			case 'seg':
				var seg = this.segment();
				args.push('[' + (seg[0] ? '[' + seg[0].join(',') + ']' : 'null') + ',' +
					(seg[1] ? '[' + seg[1].join(',') + ']' : 'null') + 
					']');
				isig++;
				break;
			case 'pair':
			case 'ipair':
				var pair = this.pair();
				if (param == 'pair')
					args.push('[' + pair[0] + ',' + pair[1] + ']');
				else
					args.push('[_int(' + pair[0] + '),_int(' + pair[1] + ')]');
				isig++;
				break;
			case 'str':
			case 's...':
				var expr = this.expression();
				args.push('('+ expr + ').toString()');
				if (param == 'str')
					isig++;
				break;
			case 'num':
			case 'n...':
				var expr = this.expression();
				args.push('_float('+ expr + ')');
				if (param == 'num')
					isig++;
				break;
			case 'int':
			case 'i...':
				var expr = this.expression();
				args.push('_int('+ expr + ')');
				if (param == 'int')
					isig++;
				break;
			case 'v...':
				var expr = this.expression();
				args.push(expr);
				if (param == 'val')
					isig++;
				break;
			case 'val':
			case 'v...':
				var expr = this.expression();
				args.push(expr);
				if (param == 'val')
					isig++;
				break;
			case 'ref':
			case 'r...':
				var name = this.varname();
				var matrix = this.getMatrix(false, sep);
				var arg;
				if (matrix) {
					index = matrix.pop();
					matrix = (matrix.length) ? '[_int(' + matrix.join(')][_int(') + ')]' : '';
					arg = '{ref:V["@' + name + '"]' + matrix + ',idx:' + index + '}';
				} else {
					arg = '"' + name + '"';
				}	
				args.push(arg);			
				if (param == 'ref')
					isig++;				
				break;
			default:
				/*this.eat(param);
				isig++;*/
				throw('Bad signature member: ' + param);
				break;
		}
		if (this.ttk != sep)
			break;
		this.next();		
	}
	return args;
}

Parser.prototype.getValue = function() {
	this.rule = 'getValue';

	var value;
	if (this.ttk == 'not') {
		this.next();
		value = '!' + this.getValue();
	} else
	if (this.ttk == 'op' && this.tval == '-') {
		this.next();
		value = '-' + this.getValue();
	} else	
	if (this.ttk == '(') {
		this.next();
		var sub = this.expression();
		this.eat(')');
		value = '(' + sub + ')';
	} else
	if (this.ttk == 'integer' || this.ttk == 'float' || this.ttk == 'inthexa' || this.ttk == 'intbin') {
		if (this.ttk == 'inthexa') {
			value = this.tval.replace(/^\&H/i, '');
			value = parseInt(value, 16);
		} else
		if (this.ttk == 'intbin') {
			value = this.tval.replace(/^\&B/i, '');
			value = parseInt(value, 2);
		} else {		
			value = this.tval.replace('#','');
		}
		this.next();
	} else
	if (this.ttk == 'string') {
		value = '"' + this.tk.matches[1] + '"';
		this.next();
	} else
	if (Parser.functions[this.ttk]) {
		var fn = Parser.functions[this.ttk];
		if (fn) {
			if (fn.notimpl)
				throw "Not implemented: " + this.ttk;		
			var args = '';
			this.next();
			if (this.ttk == '(') {
				this.eat('(');
				args = (typeof fn.signature == 'string') ?
					this[fn.signature]() :
					this.commandArguments(fn.signature, true).join();
				this.eat(')');
			}
			if (fn.relay)
				value = fn.relay + '(' + args + ')';
			else
				value = 'I.' + fn.method + '(' + args + ')';
		}	
	} else
	if (this.ttk == 'id') {
		var c = this.tval.charAt(this.tval.length-1);
		var def = (c == '$') ? '""' : '0';
		value = this.tval;
		this.next();
		var matrix = this.getMatrix();
		(matrix) && (value = '@' + value);
		value = 'V["' + value + '"]';			
		matrix = (matrix) ? '[_int(' + matrix.join(')][_int(') + ')]' : '';
		value = '(' + value + matrix + '||' + def + ')';
	} else {
		throw("Missing argument");
	}
	return value;
}

Parser.prototype.mathExpression = function() {
	this.rule = 'mathExpression';
	
	var expr = this.getValue();
	while (this.ttk == 'op') {
		if (this.tval.toLowerCase() == 'mod') {
			expr += '%';
			this.next();
			expr += this.getValue();
		} else
		if (this.tval == '\\') {
			expr += '/';
			this.next();
			expr += this.getValue() + '|0';			
		} else {
			expr += this.tval;
			this.next();
			expr += this.getValue();
		}
	}
	return expr;
}

Parser.prototype.boolExpression = function() {
	this.rule = 'boolExpression';

	var found = false;
	var expr = this.mathExpression();
	if (this.ttk == 'bop' || this.ttk == '=') {
		if (this.ttk == 'bop')
			expr += (this.tval == '<>') ? '!=' : this.tval;
		else
			expr += '==';
		this.next();
		expr += this.mathExpression();
		found = true;
	}
	return (found) ? "-(" + expr + ")" : expr;
}

Parser.prototype.logExpression = function() {
	this.rule = 'logExpression';

	var found = false;
	var expr = this.boolExpression();
	while (this.ttk == 'lop') {
		//expr += (this.tval.toLowerCase() == 'or') ? ' || ' : ' && ';
		expr += (this.tval.toLowerCase() == 'or') ? ' | ' : ' & ';
		this.next();
		expr += this.boolExpression();
		found = true;
	}
	return expr; //(found) ? "-(" + expr + ")" : expr;
}

Parser.prototype.expression = function() {
	this.rule = 'expression';
	var expr = this.logExpression();
	return expr;
}

Parser.prototype.varname = function() {
	this.rule = 'varname';

	var ttk = this.ttk;
	var name = this.tval;
	this.next();
	if (ttk != 'id') {
		if (this.tval != '$') {
			throw ('Bad argument');
		} else {
			name += '$';
			this.next();
		}
	}
	return name;
}

Parser.prototype.pair = function() {
	this.eat('(');
	var x = this.expression();
	this.eat(',');
	var y = this.expression();
	this.eat(')');
	return [x,y];
}

Parser.prototype.segment = function() {
	var pfrom, pto;
	if (!(this.ttk == 'op' && this.tval == '-'))
		pfrom = this.pair();
	this.eat('op', '-');
	pto = this.pair();
	return [pfrom, pto];
}

Parser.prototype.isSep = function() {
	return (!this.ttk || this.ttk == ':' || this.ttk == 'sep' || this.ttk == 'else');
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

