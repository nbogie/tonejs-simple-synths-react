import { useEffect, useState } from 'react'
import './App.css'
import * as Tone from 'tone'
import { AMSynth, Analyser, DuoSynth, FMSynth, MetalSynth, MonoSynth, NoiseSynth, PluckSynth, Synth } from 'tone';

function App() {
  type SynthType = "Pluck" | "Main" | "AM" | "Duo" | "FM" | "Membrane" | "MetalSynth" | "Mono" | "Noise" | "NoiseOHH";
  function allSynthTypes(): SynthType[] {
    return ["Pluck", "Main", "AM", "FM", "Membrane", "Mono", "Noise", "NoiseOHH"] //"MetalSynth", "Duo",
  }

  const [synthType, setSynthType] = useState<SynthType>("Main");
  const [octave, setOctave] = useState(3);
  const [gainNode, dontUse] = useState(() => createEffectsChain());
  const [analyser, dontuse2] = useState(() => createAnalyser());
  const [cachedSynths, setSynths] = useState<SynthDict>(() => createAllSynths());

  async function handleStart() {
    await Tone.start();
  }

  function handleIncomingMIDIMessage(event: WebMidi.MIDIMessageEvent, inputId: string) {
    const [n1, n2, n3] = event.data;

    if (n1 >= 0x90 && n1 <= 0x9F) {
      //note on
      startNote(n2 - 24) //eventually, also pass n3 velocity
    }
    if (n1 >= 0x80 && n1 <= 0x8F) {
      //note off
      // startNote(n2 - 24)
    }
    console.log("i got a midi message - wahoo.  input id: " + inputId)
    console.log([n1, n2, n3], event.data)
  }

  useEffect(() => {

    let access: WebMidi.MIDIAccess | undefined;
    const listener = handleIncomingMIDIMessage;

    async function setupMIDI() {

      //@ts-ignore //this complains that it is ALWAYS available (always true)
      if (navigator.requestMIDIAccess) {
        console.log("YES requestMIDIAccess fn on navigator")

        access = await navigator.requestMIDIAccess();

        // Get lists of available MIDI controllers
        const inputs = Array.from(access.inputs.values());

        for (let input of inputs) {
          input.onmidimessage = (ev) => handleIncomingMIDIMessage(ev, input.id)
        }


        const outputs = Array.from(access.outputs.values());

        console.log({ inputs, outputs })
      } else {
        console.log("no requestMIDIAccess fn on navigator")
      }
    }
    setupMIDI()

    function unsubscribe() {
      console.log("unsubscribe")
      if (access) {
        console.log("has access, so uninstalling lsiteners")
        const inputs = Array.from(access.inputs.values());
        for (let input of inputs) {
          console.log("for input: ", input.id, " removing listener")

          input.removeEventListener("midimessage", listener as any);
        }
      }
    }
    return unsubscribe
  }, []);

  function stopAllSequences() {
    Tone.Transport.stop();
    //TODO: sequence needs stopped not just the transport, or else when transport starts, so will seq.
  }

  type PitchesArray = (string | string[])[]
  function playSequence1() {
    // subdivisions are given as subarrays
    const pitches: PitchesArray = [
      "C3", ["Eb3", "G3"], "Eb3", ["Bb3", "D4"],
      "C3", ["Eb3", "G3"], "Eb3", ["Bb3", "C4"],
      "C3", ["Eb3", "G3"], "Eb3", ["Bb3", "Bb3"],
      "C3", ["Eb3", "G3"], "Eb3", ["Bb3", "A3"]
    ]
    playSequence(pitches)
  }


  function playSequence(pitches: PitchesArray) {
    const synth = getSynthOfType(synthType);
    const seq = new Tone.Sequence((time, note) => {
      synth.triggerAttackRelease(note, 0.1, time);
    }, pitches);
    seq.start(0)
    Tone.Transport.start();
  }


  function createEffectsChain() {
    Tone.Transport.bpm.value = 86;

    const preEffectGainNode = new Tone.Gain(0)
    preEffectGainNode.gain.rampTo(0.5, 0.1)
    const delay = new Tone.FeedbackDelay("4n", 0.6);
    //hook the final node into the main output
    delay.toDestination()
    preEffectGainNode.connect(delay)
    // const autoWah = new Tone.AutoWah(30, 6, -30);
    // autoWah.Q.value = 2;
    // autoWah.connect(delay)
    //return the first node of the effects chain
    return preEffectGainNode
  }
  function createAnalyser() {
    const an = new Analyser("fft", 256)

  }

  type SynthDict = { [key: string]: AnySynth };

  function createAllSynths(): SynthDict {
    const newSynths: SynthDict = {};
    for (const st of allSynthTypes()) {
      newSynths[st] = createSynthOfType(st)
    }
    return newSynths
  }

  type AnySynth = Synth | PluckSynth | AMSynth | MetalSynth | DuoSynth | FMSynth | MonoSynth | NoiseSynth
  function createSynthOfType(synthType: SynthType): AnySynth {
    switch (synthType) {
      case "Main":
        return new Tone.Synth()
      case "Pluck":
        return new Tone.PluckSynth()
      case "AM":
        return new Tone.AMSynth()
      case "Duo":
        return new Tone.DuoSynth()
      case "FM":
        return new Tone.FMSynth()
      case "Membrane":
        return new Tone.MembraneSynth()
      case "MetalSynth":
        return new Tone.MetalSynth()
      case "Mono":
        return new Tone.MonoSynth()
      case "Noise":
        return new Tone.NoiseSynth({
          volume: -10,
          envelope: {
            attack: 0.01,
            decay: 0.15
          }
        });
      case "NoiseOHH":
        return new Tone.NoiseSynth({
          volume: -10,
          envelope: {
            attack: 0.01,
            decay: 0.3
          },
        });
      default:
        throw new Error("unknown synth type: " + synthType)
    }
  }
  /** get pre-created synth of given type */
  function getSynthOfType(st: SynthType): AnySynth {
    return cachedSynths[st]
  }
  function startNote(midiNote: number) {
    const synth = getSynthOfType(synthType)

    //connect to output
    // synth.toDestination();

    synth.connect(gainNode);

    const freqInHz = Tone.Frequency(octave * 12 + midiNote, "midi").toFrequency();

    if (synthType === "Noise" || synthType === "NoiseOHH") {
      // synth.triggerAttackRelease("8n", 0.05)
      synth.triggerAttack("8n", 0)

    } else {
      synth.triggerAttackRelease(freqInHz * random(0.99, 1.01), "16n")
    }
  }
  function handleGainSliderChanged(val: number) {
    gainNode.gain.rampTo(val, 0.1)
  }
  function random(mn: number, mx: number): number {
    const delta = mx - mn;
    return Math.random() * delta + mn;
  }
  return (
    <div className="App">
      <h3>🙉 Danger - may be loud noise ⚠️</h3>
      Experimental audio can be loud and harsh.
      <br />
      <button onClick={handleStart}>start</button>

      {[0, 2, 4, 7, 9, 12, 14, 16, 19, 21].map(note =>
        <button onClick={() => startNote(note)} key={note}>{note}</button>
      )}

      <br />
      Synth Type:
      {allSynthTypes().map(st =>
        <button key={st} onClick={() => setSynthType(st)}>{st}</button>
      )}

      <br />
      Octave:
      <button onClick={() => setOctave(prev => prev - 1)}>-</button>
      {octave}
      <button onClick={() => setOctave(prev => prev + 1)}>+</button>
      <br />
      Sequences:
      <button onClick={() => playSequence1()}>seq1</button>
      <button onClick={() => stopAllSequences()}>stop</button>
      <br />

      Gain:
      <input type="range" step={0.01} onChange={e => handleGainSliderChanged(parseFloat(e.target.value))} min={0} max={1} />

      <Visualiser num={gainNode.gain.value} />
    </div>
  )
}

export default App


interface VisualiserProps {
  num: number;
}
function Visualiser(props: VisualiserProps) {
  return <div>{props.num}</div>
}