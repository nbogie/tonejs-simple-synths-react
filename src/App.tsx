import { useEffect, useState } from "react";
import * as Tone from "tone";
import { random } from "./random";

function App() {
    const [synthToUse, setSynthToUse] = useState<Tone.MonoSynth | null>(null);
    const [gainNode, setGainNode] = useState<Tone.Gain | null>(null);
    const [octave, setOctave] = useState(3);

    useEffect(() => {
        function setupSynthAndOutput() {
            const synth = new Tone.MonoSynth();
            const node = createSimplestAudioChain(synth);
            setSynthToUse(synth);
            setGainNode(node);
            return node;
        }
        const node = setupSynthAndOutput();

        function disconnectAndTidyUp() {
            //Disconnect and destroy resources when the component unmounts
            if (node) {
                node.gain.rampTo(0, 0.01);
                node.disconnect();
            }
        }
        return disconnectAndTidyUp;
    }, []);

    /** Creates an audio chain connecting the given synth to a gain node and that in turn to the destination.
     * @returns the gain node in case we want to manipulate it further
     * */
    function createSimplestAudioChain(synth: Tone.MonoSynth) {
        // our audio chain will be:
        // synth --> gain --> "destination" (where destination connects to speakers / headphones, depending on computer audio)
        const newGainNode = new Tone.Gain(0); //like a volume control
        synth.connect(newGainNode); //if we change the synth we'll have to disconnect the previous and connect this one to the gainNode
        newGainNode.gain.rampTo(0.5, 0.1); //fade it in to avoid clicks
        newGainNode.toDestination();

        return newGainNode;
    }

    //No, it's not common to nest these component definitions inside the larger one, but we don't need the wiring complexity in this demo.
    function OctaveControls() {
        return (
            <>
                <br />
                Octave:
                <button onClick={() => setOctave((prev) => prev - 1)}>-</button>
                {octave}
                <button onClick={() => setOctave((prev) => prev + 1)}>+</button>
                <br />
            </>
        );
    }
    function VolumeSlider() {
        function handleGainSliderChanged(val: number) {
            if (!gainNode) {
                return; //not set up yet
            }
            gainNode.gain.rampTo(val, 0.1);
        }

        return (
            <>
                Gain:
                <input
                    type="range"
                    step={0.01}
                    onChange={(e) =>
                        handleGainSliderChanged(parseFloat(e.target.value))
                    }
                    min={0}
                    max={1}
                />
            </>
        );
    }
    function MusicKeyboard() {
        function startNotePlaying(midiNote: number) {
            if (!synthToUse) {
                return; //synth not set up yet.
            }
            const freqInHz = Tone.Frequency(
                octave * 12 + midiNote,
                "midi"
            ).toFrequency();

            const detunedFreq = freqInHz * random(0.99, 1.01); //adding some imperfection
            synthToUse.triggerAttackRelease(detunedFreq, "2n");
        }
        return (
            <>
                {[0, 2, 4, 7, 9, 12, 14, 16, 19, 21].map((note) => (
                    <button onClick={() => startNotePlaying(note)} key={note}>
                        {note}
                    </button>
                ))}
            </>
        );
    }
    return (
        <div className="App">
            <h3>🙉 Danger - Remove headphones. May be loud noise ⚠️</h3>
            Experimental audio can be loud and harsh.
            <br />
            <MusicKeyboard />
            <OctaveControls />
            <VolumeSlider />
        </div>
    );
}

export default App;
