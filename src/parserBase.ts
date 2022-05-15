import { Lex, Token } from './lexer';

export interface CommandDecl {
  signature: string[] | string,
  method?: string,
  notimpl?: boolean,
  suspend?: boolean,
  args?: string[],
}

export interface FunctionDecl {
  signature: string[] | string,
  method?: string,
  notimpl?: boolean,
  relay?: string,
}

type ParseCommandFn = (stats: string[]) => string[] | CommandDecl;
type ParseFunctionFn = () => string;

export abstract class ParserBase {
  onTranslate?: (trans: string, stat?: string) => void;
  keywords: string[] = [];
  tk?: Token;
  ttk: string = '';
  tval: string = '';
  gid: number = 0;

  lex = new Lex();
  warnNotImplemented: boolean = true;
  currLabel: string = '';
  warn?: (...data: any[]) => void;
  data: string[] = [];
  rule: string = '';
  dataLabels: {[key: string]: number} = {};
  funcs: Function[] = [];
  labels: {[label: string]: number} = {};
  typedefs: {[char: string]: string} = {};

  private getTtk () {
    return this.ttk;
  }

  protected next () {
    this.tk = this.lex.next();
    if (this.tk.tk == 'id') {
      this.tk.val = (this.tk.val || '').toLowerCase();
    }
    this.ttk = this.tk.tk || '';
    this.tval = this.tk.val || '';
    return this.ttk;
  }
  
  protected eat (token: string, tval: string = '') {
    if (this.ttk != token)
      throw('Expecting ' + token + ', got ' + this.ttk);
    if (tval && this.tval != tval)
      throw('Expecting ' + tval + ', got ' + this.tval);
    var res = {tk: this.ttk, val: this.tval};
    this.next();
    return res;
  }
  
  private pushBack (str: string) {
    this.lex.line = str + this.lex.line;
  }
  
  private localid () {
    this.gid++;
    return '_' + this.gid;
  }
  
  public start (code: string) {
    this.rule = 'start';
    
    this.currLabel = '';
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
  
  private labeledLine () {
    this.rule = 'labeledLine';
    
    this.currLabel = this.tval;
    this.next();
    var index = this.funcs.length;
    this.getLine();
    this.labels[this.currLabel] = index;
  }
  
  private getLine () {
    this.rule = 'getLine';
    
    var stats = this.compound();
    this.eat('sep');
  
    var trans = '';
    while (stats.length) {
      var stat = stats.shift();
      if (stat === null || stat === undefined) {
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
  
  private compound () {
    this.rule = 'compound';
    
    var stats = this.getStatement();
    while (this.ttk == ':') {
      this.next();
      stats = stats.concat(this.getStatement());
    }
    return stats;
  }
  
  private getStatement () {
    this.rule = 'getStatement ' + this.ttk;
    
    var stats: string[] = [];
    switch (this.ttk) {
      case 'defint':
      case 'defsng':
        var type = this.ttk.replace(/^def/i, '');
        var ttk = this.next();
  
        if (ttk != 'id' || this.tval.length != 1) {
          throw ("Expecting letter, got " + this.ttk);
        }
        var defStart = this.tval.toLowerCase();
        ttk = this.next();
        
        if (ttk == 'op' && this.tval == '-') {
          ttk = this.next();
  
          if (ttk != 'id' || this.tval.length != 1) {
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
        var onType = this.next();
  
        if (onType == 'error' || onType == 'stop') {
          var branchType = this.next();
          if (branchType != 'goto' && branchType != 'gosub') {
            throw('Expecting GOTO or GOSUB, got ' + this.ttk);
          }
          this.next();
  
          var line = this.expression();
          if (branchType == 'gosub') {
            var back = this.localid();
            stats.push('I.setOn("' + onType + '", [' + 
              [line, '"' + back + '"'].join(',') + ']);');
          } else {
            stats.push('I.setOn("' + onType + '", ' + line + ');');
          }
          
        } else {
          var expr = this.expression();
          var branchType = this.getTtk();
          if (branchType != 'goto' && branchType != 'gosub') {
            throw('Expecting GOTO or GOSUB, got ' + this.ttk);
          }
          this.next();
          var args = this.commandArguments(['v...']);
          args.unshift('');
          var indexString = '[' + args.join() + '][' + expr + ']';
          if (branchType == 'gosub') {
            var back = this.localid();
            stats.push('return I.pgosub(' + indexString + ', "' + back + '");', back);
            break;
          }
          stats.push('return ' + indexString + ';');
        }
        break;
      case 'data':
        this.lex.ruleChunk.inactive = false;
        this.next();
        var label = this.currLabel;
        if (!this.dataLabels[label]) {
          this.dataLabels[label] = this.data.length;
        }
        while (!this.isSep()) {
          var chunk = '';
          if (this.getTtk() != ',') {
            if (this.getTtk() == 'chunk')
              chunk = this.tval.trim();
            else
            if (this.getTtk() == 'string')
              chunk = this.tk?.matches?.[1] || '';
            else
              throw('Syntax error');
            this.next();
            this.data.push(chunk);
            if (this.getTtk() == ',') {
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
        if (this.getTtk() != '(')
          throw('Expecting array size');
        var matrix = this.getMatrix() || [];
        stats.push('I.dim("@' + name + '", [' + matrix.join() + ']);');
        while (this.getTtk() == ',') {
          this.next();
          name = this.varname();
          if (this.getTtk() != '(')
            throw('Expecting array size');
          var matrix = this.getMatrix() || [];
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
        var step = '1';
        if (this.getTtk() == 'step') {
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
          var aname = names[i];
          stats.push( (aname != null) ? 'var r=I.pnext("' + aname + '");' : 'var r=I.pnext();' );
          stats.push( 'if (r!=null) return r;' );
        }
        break;
      case 'if':
        this.next();
        var expr = this.expression();
        this.eat('then');
        if (this.getTtk() == 'integer') {
          this.pushBack('goto ' + this.tval);
          this.next();
        }
        var L1 = this.localid();			
        var condTrue = this.compound();
        stats.push('if (!(' + expr + ')) return "' + L1 + '";');
        stats = stats.concat(condTrue);
        if (this.getTtk() == 'else') {
          this.next();
          if (this.getTtk() == 'integer') {
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
        if (this.getTtk() == 'on' || this.getTtk() == 'off') {
          var active = (this.getTtk() == 'on');
          this.next();
          stats.push('I.activateOn("stop", ' + (active ? 'true' : 'false') + ');');
        }
        break;
      default:
        var cmd = this.getCommand(this.ttk);
        if (cmd) {
          if (cmd.notimpl) {
            if (this.warnNotImplemented) {
              this.warn?.("NOT_IMPLEMENTED", this.currLabel, this.ttk);
            } else {
              throw "Not implemented: " + this.ttk;
            }
          }
          this.rule = this.ttk;
          this.next();
          var idx = stats.length;
          stats.push('');
          var cmdArgs = (typeof cmd.signature == 'string') ? 
            ((this as any)[cmd.signature] as ParseCommandFn)(stats) :
            this.commandArguments(cmd.signature);
          var cmdArgsObj = cmdArgs as CommandDecl;
  
          if (!cmd.notimpl) {
            if (cmdArgsObj.method) {
              stats[idx] = 'I.' + cmdArgsObj.method + '(' + cmdArgsObj.args?.join() + ');';
            } else {
              stats[idx] = 'I.' + cmd.method + '(' + (cmdArgs as string[]).join() + ');';
            }
          }
          if (cmd.suspend || cmdArgsObj.suspend) {
            stats.push(this.localid());
          }
        } else {
          throw ("Invalid command " + this.tval);
        }
        break;
    }
    return stats;
  }
  
  abstract getCommand(cmd: string): CommandDecl;
  abstract getFunction(fn: string): FunctionDecl;

  protected getMatrix (sep?: string): string[] | null {
    this.rule = 'getMatrix';
  
    sep = sep || ',';
    var matrix = null;
    if (this.ttk == '(') {
      this.next();
      matrix = [ this.expression() ];
      while (this.ttk == sep) {
        this.next();
        matrix.push( this.expression() );
      }
      this.eat(')');
      // if (dojoin) {
      //   matrix = '[' + matrix.join('][') + ']';
      // }
    }
    return matrix;
  }
  
  private assignment () {
    this.rule = 'assignment';
  
    var name = this.varname();
    var matrix = this.getMatrix();
    (matrix) && (name = '@' + name);
  
    this.eat('=');
    var expr = this.expression();
    /**@todo generalize special vars assignments such as "sprite$", delegate to other methods **/
    if (name == '@sprite$') {
      return 'I.cmd_setsprite(_int(' + matrix?.[0] + '),' + expr + ');';
    }
    var matrixString = (matrix) ? '[' + matrix.join('][') + ']': '';
    var firstchar = (name[0] == '@') ? name[1] : name[0];
    var lastchar = name.substr(-1);
    if (firstchar && lastchar.match(/[a-zA-Z0-9_]/)) {
      var type = this.typedefs[firstchar];
      if (type == 'int') {
        expr = '_int(' + expr + ')';
      }
    }
    return 'V["' + name + '"]' + matrixString + '=' + expr + ';';	
  }
  
  protected commandArguments (signature: string[], isfunc?: boolean, sep?: string): string[] {
    this.rule = 'commandArguments';
  
    var args = [];
    var param: string;
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
        // case 'v...':
        //   var expr = this.expression();
        //   args.push(expr);
        //   if (param == 'val')
        //     isig++;
        //   break;
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
          var matrix = this.getMatrix(sep);
          var arg;
          if (matrix) {
            const index = matrix.pop();
            var matrixString = (matrix.length) ? '[_int(' + matrix.join(')][_int(') + ')]' : '';
            arg = '{ref:V["@' + name + '"]' + matrixString + ',idx:' + index + '}';
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
  
  private getValue (): string {
    this.rule = 'getValue';
  
    var value = '';
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
        value = String(parseInt(value, 16));
      } else
      if (this.ttk == 'intbin') {
        value = this.tval.replace(/^\&B/i, '');
        value = String(parseInt(value, 2));
      } else {		
        value = this.tval.replace('#','');
      }
      this.next();
    } else
    if (this.ttk == 'string') {
      value = '"' + this.tk?.matches?.[1] + '"';
      this.next();
    } else
    if (this.getFunction(this.ttk)) {
      var fn = this.getFunction(this.ttk);
      if (fn) {
        if (fn.notimpl)
          throw "Not implemented: " + this.ttk;		
        var args = '';
        this.next();
        if (this.ttk == '(') {
          this.eat('(');
          args = (typeof fn.signature == 'string') ?
            ((this as any)[fn.signature] as ParseFunctionFn)() :
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
      var matrixString = (matrix) ? '[_int(' + matrix.join(')][_int(') + ')]' : '';
      value = '(' + value + matrixString + '||' + def + ')';
    } else {
      throw("Missing argument");
    }
    return String(value);
  }
  
  private mathExpression () {
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
  
  private boolExpression () {
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
  
  private logExpression () {
    this.rule = 'logExpression';
  
    // var found = false;
    var expr = this.boolExpression();
    while (this.ttk == 'lop') {
      //expr += (this.tval.toLowerCase() == 'or') ? ' || ' : ' && ';
      expr += (this.tval.toLowerCase() == 'or') ? ' | ' : ' & ';
      this.next();
      expr += this.boolExpression();
      // found = true;
    }
    return expr; //(found) ? "-(" + expr + ")" : expr;
  }
  
  protected expression () {
    this.rule = 'expression';
    var expr = this.logExpression();
    return expr;
  }
  
  private varname () {
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
  
  protected pair () {
    this.eat('(');
    var x = this.expression();
    this.eat(',');
    var y = this.expression();
    this.eat(')');
    return [x,y];
  }
  
  private segment () {
    var pfrom, pto;
    if (!(this.ttk == 'op' && this.tval == '-'))
      pfrom = this.pair();
    this.eat('op', '-');
    pto = this.pair();
    return [pfrom, pto];
  }
  
  protected isSep () {
    return (!this.ttk || this.ttk == ':' || this.ttk == 'sep' || this.ttk == 'else');
  }  
};

