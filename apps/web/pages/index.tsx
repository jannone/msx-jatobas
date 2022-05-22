import { useState, useRef, useEffect } from 'react';
import Image from 'next/image';
import { Jatobas } from 'msx-jatobas';

let jatobas: Jatobas;

export default function Web() {
  const [tab, setTab] = useState('program');
  const [code, setCode] = useState('');
  const [transpiled, setTranspiled] = useState('');
  const [running, setRunning] = useState(false);
  const [example, setExample] = useState('');
  const refScreen = useRef(null);
  const refOutput = useRef(null);

  useEffect(() => {
    if (!refScreen.current || !refOutput.current) return;
    jatobas = new Jatobas({
      parentScreen: refScreen.current,
      parentOutput: refOutput.current,
    })
    jatobas.onTranspiled = (program) => setTranspiled(JSON.stringify(program, null, 3))
    jatobas.onRun = () => {
      setRunning(true);
    }
    jatobas.onStop = () => {
      setRunning(false);
      jatobas.print("Ok");
    }
    jatobas.onChangeMode = () => {
      setTab('screen2');
    }    
  }, [])

  function handleClick(id: string) {
    setTab(id);
  }

  function handleRun() {
    setTab('output');
    jatobas.run(code);
  }

  function handleStop() {
    jatobas.halt();
  }

  function handleLoadExample() {
    // if (dirtyCode()) {
    //   var r = confirm("Your code will be overwritten. Proceed?");
    //   if (!r)
    //     return;
    // }
    if (!example) return;
    var path = `${example}`;
    var ajax = new XMLHttpRequest();
    ajax.open('GET', path, false);
    ajax.send('');
    var txt = ajax.responseText;
    setCode(txt);
  }

  return (<div>

    <div style={{textAlign: 'center', margin: '16px'}}>
      <h3 style={{display: 'inline'}}>
        <span style={{color: 'green'}}>JatoBAS</span> <small>version 0.1.5</small>
      </h3>
      <Image src='/logo.gif' alt='MSX Jatobas logo' width={19} height={19}/>
      <small id='warning' style={{color: 'red'}}></small>
    </div>

    <div>
      <div>
        <ul className='tabs'>
          {[
            {id: "program", label: "Program"},
            {id: "translation", label: "Translation"},
            {id: "output", label: "Output"},
            {id: "screen2", label: "Screen 2"},
          ].map(({id, label}) => <li key={id} onClick={() => handleClick(id)}>
            <a>{label}</a>
          </li>)}
        </ul>
      </div>
      <div>
        {running ?
          <button className='btStop' onClick={handleStop}>Stop</button> :
          <button className='btRun' onClick={handleRun}>Run</button>
        }
      </div>
    </div>

    <div className='tabContents' style={{display: tab === 'output' ? 'block' : 'none'}}>
      <div className='output' ref={refOutput}></div>
    </div>

    <div className='tabContents' style={{display: tab === 'translation' ? 'block' : 'none'}}>
      <div className='translation'>{transpiled}</div>
    </div>

    <div className='tabContents' style={{display: tab === 'program' ? 'block' : 'none'}}>
      <textarea
        className='code'
        value={code} onChange={(e) => setCode(e.target.value)}
        rows={23}
        spellCheck={false}></textarea><br />
      <p>
        Load example:<br />
        <select value={example} onChange={(e) => setExample(e.target.value)}>
          <option value=''>(select)</option>
          <option value='bas/akernaak.bas'>Akernaak (text adventure)</option>
          <option value='bas/devilseye.bas'>Devil&apos;s Eye</option>
          <option value='bas/campo.bas'>Gravitational Field</option>
          <option value='bas/stars.bas'>Scrolling Stars</option>
          <option value='bas/yellowstar.bas'>Yellow Star</option>
          <option value='bas/circles.bas'>Concentric Circles</option>
          <option value='bas/sprites.bas'>Sprites</option>
          <option value='bas/keys.bas'>Keys and Sprites</option>
          <option value='bas/game.bas'>Shoot em up</option>
        </select>
        <button onClick={handleLoadExample}>Load</button>
      </p>
    </div>

    <div className='tabContents' style={{display: tab === 'screen2' ? 'block' : 'none'}}>
      <div ref={refScreen}></div>
    </div>
  </div>
  );
}
