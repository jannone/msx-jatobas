import { ScreenCanvas } from './canvas';
import { ParsedProgram } from './parserBase';
import { SpriteCanvas } from './sprites';

interface ForStackItem {
  name: string,
  label: string,
  limit: number,
  step: number,
}

export type VarRef = string | {
  ref: any[],
  idx: number,
}

function toNumber(v: any): number {
	if (typeof v != 'number') {
		v = (v.indexOf('.') >= 0) ? parseFloat(v) : parseInt(v);
		if (v.toString == 'NaN')
			throw ('Invalid cast to number');		
	}
	return v;
}

export class InterpBase {
  curPos: number[] = [0, 0];
  onRun?: () => void;
  onStop?: () => void;
  onChangeMode?: (mode: number) => void;
  output?: HTMLElement;
  
  protected program: ParsedProgram = {
    lines: [],
    labels: {},
    data: [],
    dataLabels: {}
  };
  private funcs: Function[] = [];
  private suspended = false;
  private stop = false;
  private currLabel: string = '';
  // instruction pointer
  private ip: number = 0;
  private gosubStack: string[] = [];
  private forStack: ForStackItem[] = [];
  protected dataIdx: number = 0;
  protected ram: {[address: number]: number} = {};
  protected canvas: ScreenCanvas;
  protected spriteCanvas: SpriteCanvas;

  static hooked: boolean;
  static pressed = '';
  static stick0: {[keyCode: number]: boolean} = [];
  
  vars: {[name: string]: any} = {};
  handleOn: {[type: string]: {
    jump: string
  }} = {};

  constructor({
    canvas,
    spriteCanvas,
  }: {
    canvas: ScreenCanvas,
    spriteCanvas: SpriteCanvas,
  }) {
    this.canvas = canvas;
    this.spriteCanvas = spriteCanvas;
  }

  static keydown(e: KeyboardEvent) {
    e = e || window.event;
    if (e.keyCode) {
      var bDir = (e.keyCode >= 37 && e.keyCode <= 40);
      if (bDir || e.keyCode == 32) {
        // directional keys + space
        InterpBase.stick0[e.keyCode] = true;
      }
      if (!bDir) {
        // all the rest + space
        InterpBase.pressed = String.fromCharCode(e.keyCode);
      }
    }	
  }

  static keyup(e: KeyboardEvent) {
    e = e || window.event;
    InterpBase.pressed = '';
    if (e.keyCode) {
      var bDir = (e.keyCode >= 37 && e.keyCode <= 40);
      if (bDir || e.keyCode == 32) {
        // directional keys + space
        InterpBase.stick0[e.keyCode] = false;
      }
    }
  }

  static installHooks() {
    window.addEventListener('keydown', InterpBase.keydown, false);
    window.addEventListener('keyup', InterpBase.keyup, false);
    // keypress will catch keys even when there's already a key pressed
    // FIXME: can we remove keydown?
    window.addEventListener('keypress', InterpBase.keydown, false);	
    InterpBase.hooked = true;
  }

  _int = Math.floor;
  
  clear() {
    if (!InterpBase.hooked) {
      InterpBase.installHooks();
    }
    this.vars = {};
    this.handleOn = {};
    this.forStack = [];
    this.gosubStack = [];
    this.ram = {};
    this.currLabel = '';
    this.dataIdx = 0;
    this.stop = false;
    this.ip = 0;
  }

  run(program: ParsedProgram) {
    this.clear();
    this.program = program;
    this.funcs = this.program.lines.map((line) => {
      return new Function('I', 'V', line);
    });
    this.onRun?.();
    this.resume();
  }

  suspend() {
    this.suspended = true;
  }

  halt() {
    this.stop = true;
    if (this.suspended) {
      this.onStop?.();
    }
  }

  jump(label: string) {
    var ip = this.program.labels[label];
    if (typeof ip == 'undefined')
      throw('Invalid line number ' + label);
    if (label && label.toString().charAt(0) != '_')
      this.currLabel = label;
    this.ip = ip;
  }

  resume() {
    var dt = new Date();
    var st = dt.getTime();
    var len = this.funcs.length;
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
      var f = this.funcs[this.ip];
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

  setOn(type: 'stop' | 'error', jump: string) {
    this.handleOn[type] = this.handleOn[type] || {}; 
    this.handleOn[type].jump = jump;
  }

  activateOn(type: never, active: never) {
    /**@todo */
  }

  pgosub(line: string, back: string) {
    this.gosubStack.unshift(back);
    return line;
  }

  preturn() {
    var to = this.gosubStack.shift();
    if (!to)
      throw("RETURN without GOSUB");
    return to;
  }

  pfor(varname: string, label: string, limit: string, step: string) {
    const stepNum = toNumber(step);
    const limitNum = toNumber(limit);
    const item = {name: varname, label: label, limit: limitNum, step: stepNum};
    this.forStack.unshift(item);
  }

  pnext(varname: string) {
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
    this.vars[varname] = toNumber(this.vars[varname]) + el.step;
    const v = this.vars[varname]; 
    if ((el.step > 0 && v > el.limit) || (el.step < 0 && v < el.limit)) {
      this.forStack.shift();
      return null;
    }
    return el.label;
  }

  subdim(a: any, i: number, dimensions: number[], d: number) {
    a[i] = new Array(dimensions[d] + 1);
    d++;
    if (d < dimensions.length) {
      for (var q = 0; q < a.length; q++) {
        this.subdim(a[i], q, dimensions, d);
      }
    }
  }

  dim(v: string, dimensions: number[]) {
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

  setVar(ref: VarRef, value: any) {
    if (typeof ref == 'string') {
      this.vars[ref] = value;
      return;
    }
    if (!ref.ref)
      throw "Subscript out of Range";
    ref.ref[ref.idx] = value;	
  }

  getVar(ref: VarRef) {
    if (typeof ref == 'string') {
      return this.vars[ref];
    }
    return ref.ref[ref.idx];
  }

  blitChars(coord: number[] | null, txt: string) {
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

};