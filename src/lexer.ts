// Lexer

export interface Token {
  val?: string,
  tk?: string,
  matches?: string[],
}

export class Lex {
  debugQueue: string[];
  ruleChunk: { re: RegExp; tk: string; inactive: boolean; };
  dict0: any[];
  dict1: ({ re: RegExp; tk: string; ignore: boolean; } | { re: RegExp; tk: string; ignore?: undefined; })[];
  keywords: string[];
  dict: any;
  lines: string[] = [];
  nline = 0;
  line?: string;
  tk?: Token;

  constructor() {
    this.debugQueue = [];

    this.ruleChunk = { re: /^[^,:]+/, tk: 'chunk', inactive: true };

    this.dict0 = [
      { re: /^ +/, tk: 'space', ignore: true },
      { re: /^"([^"]*)"?/, tk: 'string' },
      this.ruleChunk,
      { re: /^\'.*/i, tk: 'comment', ignore: true },
      { re: /^\,/, tk: ',' },
      { re: /^\;/, tk: ';' },
      { re: /^\(/, tk: '(' },
      { re: /^\)/, tk: ')' },
      { re: /^(\+|\-|\/|\\|\*|mod)/i, tk: 'op' },
      { re: /^(\<\=|\>\=|\<\>|\<|\>)/, tk: 'bop' },
      { re: /^:/, tk: ':' },
      { re: /^\=/, tk: '=' },
      { re: /^(and|or)/i, tk: 'lop' },
      { re: /^\$/, tk: '$' }
    ];

    this.dict1 = [
      { re: /^rem.*/i, tk: 'comment', ignore: true },
      { re: /^[a-z_]+[a-z0-9_]*[%\$]?/i, tk: 'id' },
      { re: /^[0-9]*\.[0-9]+\#?/, tk: 'float' },
      { re: /^[0-9]+/, tk: 'integer' },
      { re: /^\&H[0-9A-F]+/i, tk: 'inthexa' },
      { re: /^\&B[01]+/i, tk: 'intbin' },
      { re: /^\#[0-9]+/, tk: 'file' }
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

  registerKeywords(keywords: string[]) {
    this.keywords = this.keywords.concat(keywords);
  }

  init() {
    var keyRules = [];
    for (var i = 0; i < this.keywords.length; i++) {
      var kw = this.keywords[i];
      var re = new RegExp("^" + kw.replace('$', '\\$'), "i");
      keyRules.push({ re: re, tk: kw });
    }
    // TODO: this has never worked before
    // keyRules = keyRules.sort((a, b) => a.length > b.length));
    this.dict = this.dict0.concat(keyRules).concat(this.dict1);
  }

  setCode(code: string) {
    this.lines = code.toString().split("\n");
    this.nline = 0;
    this.line = '';
    this.tk = undefined;
  }

  next(): Token {
    this.tk = {};
    if (this.line == '') {
      if (this.lines.length == 0) {
        return this.tk;
      }
      if (this.line = this.lines.shift()) {
        this.line = this.line.replace(/[\n\r]+$/, '');
      }
      this.nline++;
      this.tk = { val: "\n", tk: 'sep' };
      return this.tk;
    }
    for (var i = 0; i < this.dict.length; i++) {
      var test = this.dict[i];
      var res = test.re.exec(this.line);
      if (res) {
        if (test.inactive) {
          continue;
        }

        // WORKAROUND FOR VAR NAMES THAT INCLUDE KEYWORDS 
        // (eg: ONXGOSUB should not be read as "XGOSUB")
        /**@todo this is bad for performance, find a way to avoid needing this */
        if (test.tk == 'id') {
          var tkid = res[0].toLowerCase();
          var limit = null;
          for (var ki = 0; ki < this.keywords.length; ki++) {
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

        this.line = (this.line || '').substr((this.tk.val || '').length);
        if (!test.ignore) {
          return this.tk;
        }
        return this.next();
      }
    }
    throw ("Syntax Error, " + this.line);
  }
}

