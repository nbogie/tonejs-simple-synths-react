# tonejs synths simple demo

# dev notes:

need to import @types/webmidi or TS will think navigator.requestMIDIAccess is not a thing.

React strict mode's double mount makes it difficult to register the right number of listeners on the midi inputs.  there's a race condition during setup - some of it happens after the first unsubscribe has finished meaning the latter doesn't tidy up correctly.