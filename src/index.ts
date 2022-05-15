import { Parser } from './parser';

function transpile(code) {
  const parser = new Parser();
	parser.warnNotImplemented = true;
	parser.warn = function(type, line, data) {
		console.warn("WARNING: " + type + " in line " + line);
	}
  const l = console.warn;
  parser.onTranslate = (trans, stats) => {
    console.log(trans, stats);
  }

  try {
    parser.start(code);
  } catch (e) {
    // console.error(e);
    console.error(e + ', in line ' + parser.currLabel + "\n>>" + parser.lex.line + "\n(rule " + parser.rule + ")");
    return false;
  }
  // console.log(parser);
}

const t = `
10 COLOR15,1,1:SCREEN 2
20 DIM X(11), Y(11)
30 CPI=8*ATN(1): ST=CPI/12: I=0
40 FOR T=0 TO CPI STEP ST
50 X(I)=128+100*COS(T)
60 Y(I)=96+80*SIN(T)
65 I=I+1
70 NEXT
80 FOR Q=0 TO 11: FOR W=Q TO 11
90 LINE(X(Q),Y(Q))-(X(W),Y(W))
100 NEXT W,Q
`;

transpile(t);
