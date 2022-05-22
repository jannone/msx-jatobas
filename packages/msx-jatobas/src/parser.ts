import { CommandDecl, FunctionDecl, ParserBase } from "./parserBase";

/*
peding set/get impl:
	base

stopped at CSRLIN
*/


export class Parser extends ParserBase {
  static commands: {[cmd: string]: CommandDecl} = {
    'auto': { signature: ['i...'], notimpl: true },	
    'beep': { signature: [], notimpl: true },
    'bload': { signature: [], notimpl: true },
    'bsave': { signature: [], notimpl: true },
    'call': { signature: [], notimpl: true },
    // 'circle': { signature: [], notimpl: true },	
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
    // 'eval': { method: 'fn_eval', signature: ['str'] },
    'setsprite': { method: 'cmd_setsprite', signature: ['int', 'str'] },
    'put': { method: 'cmd_putsprite', signature: 'parsePut' },
    'grp': { method: 'cmd_grp', signature: 'parseGrp' },
    'poke': { method: 'cmd_poke', signature: ['int', 'int'] },
    'run': { method: 'cmd_run', signature: ['int?'] },
    'open': { signature: 'parseOpen', notimpl: true },
    'paint': { signature: ['ipair', 'int?'], notimpl: true },
    'sprite': { method: 'cmd_setsprite', signature: 'parseSprite' }
  };
  
  static functions: {[fn: string]: FunctionDecl} = {
    'abs': { signature: ['num'], relay: 'Math.abs' },
    'asc': { signature: ['str'], method: 'fn_asc' },	
    'atn': { signature: ['num'], relay: 'Math.atan' },
    'bin$': { signature: ['int'], method: 'fn_bin' },
    'cos': { signature: ['num'], relay: 'Math.cos' },
    'cdbl': { signature: ['val'], relay: 'parseFloat' },
    'chr$': { signature: ['int'], relay: 'String.fromCharCode' },
    'cint': { signature: ['val'], method: '_int' },
    'csng': { signature: ['val'], notimpl: true },	
    'sin': { signature: ['num'], relay: 'Math.sin' },
    'tan': { signature: ['num'], relay: 'Math.tan' },
    'sqr': { signature: ['num'], relay: 'Math.sqrt' },
    'sgn': { signature: ['num'], method: 'fn_sgn' },	
    'rnd': { signature: ['i...'], method: 'fn_rnd' },
    'int': { signature: ['val'], method: '_int' },
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
    // 'eval': { signature: ['str'], method: 'fn_eval' },
    'play': { signature: ['int'], method: 'fn_play' }
  };

  constructor() {
    super();
    for (var k in Parser.commands)
      this.keywords.push(k);
    for (var k in Parser.functions)
      this.keywords.push(k);
  }
  
  getCommand(cmd: string): CommandDecl {
    return Parser.commands[cmd];
  }

  getFunction(fn: string): FunctionDecl {
    return Parser.functions[fn];
  }

  protected parseRestore() {
    var label = '';
    if (!this.isSep()) {
      label = "'" + this.expression() + "'";
    }
    return [label];
  }
  
  protected parseMid() {
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
  
  protected parsePrint() {
    var args = [];
    var newline = true;
    var file = null;
    if (this.ttk == 'file') {
      file = this.tval;
      if (this.next() != ',') {
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
  
  protected parseInput(stats: never, mark?: string) {
    mark = (mark === undefined) ? '?' : mark;
    var title = mark;
    if (this.ttk == 'string') {
      title = this.tk?.matches?.[1] + mark;
      this.next();
      this.eat(';');
    }
    var refs = this.commandArguments(['r...'], true, ';');
    return [ '"' + title + '"', '[' + refs + ']' ];
  }
  
  protected parseLine(stats: never) {
    if (this.ttk == 'input') {
      this.next();
      return { method: 'cmd_input', args: this.parseInput(stats, ''), suspend: true };
    }
    var sig = ['seg', 'int?', 'id?'];
    return this.commandArguments(sig);
  }
  
  protected parsePut(stats: never) {	
    if (this.ttk == 'sprite') {
      this.next();
      var sig = ['int', 'ipair?', 'int', 'int'];
      return this.commandArguments(sig);
    }
  }
  
  protected parseGrp() {
    var args = [];
    var pair = this.pair();
    args.push('[I._int(' + pair[0] + '),I._int(' + pair[1] + ')]');
    this.eat(',');
    var pargs = this.parsePrint();
    pargs.shift();
    return args.concat(pargs);
  }
  
  protected parseOpen() {
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
  
  protected parseSprite() {
    this.eat('$');
    var matrix = this.getMatrix();
    this.eat('=');
    var value = this.expression();
    return [ matrix?.[0], value ];	
  }  
}
