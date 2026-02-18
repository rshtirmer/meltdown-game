import { stack, note } from '@strudel/web';

// Gameplay BGM — dark, driving cyberpunk chiptune
// Minor key, pulsing bass, tension arps, restrained drums
export function gameplayBGM() {
  return stack(
    // Lead — square, dark minor melody with rests
    note('e4 ~ g4 ~ a4 ~ bb4 ~ a4 ~ g4 ~ e4 ~ d4 ~')
      .s('square')
      .gain(0.14)
      .lpf(2000)
      .decay(0.15)
      .sustain(0.2)
      .release(0.3)
      .room(0.3)
      .delay(0.15)
      .delaytime(0.375)
      .delayfeedback(0.3),
    // Counter melody — sparse, fills gaps
    note('~ ~ bb5 ~ ~ ~ a5 ~ ~ ~ g5 ~ ~ ~ e5 ~')
      .s('square')
      .gain(0.06)
      .lpf(2500)
      .decay(0.12)
      .sustain(0),
    // Pad — minor chords, slow attack
    note('<e3,g3,bb3> <e3,g3,bb3> <d3,f3,a3> <d3,f3,a3> <c3,e3,g3> <c3,e3,g3> <d3,f3,bb3> <d3,f3,bb3>')
      .s('sine')
      .attack(0.4)
      .release(1.2)
      .gain(0.1)
      .room(0.4)
      .roomsize(3)
      .lpf(1400)
      .slow(2),
    // Bass — driving pulse, dark
    note('e2 e2 ~ e2 d2 d2 ~ d2 c2 c2 ~ c2 d2 d2 ~ d2')
      .s('sawtooth')
      .gain(0.18)
      .lpf(400)
      .decay(0.2)
      .sustain(0.3),
    // Synth percussion — kick/snare via short sine/noise oscillators
    note('c1 ~ g1 ~ c1 ~ g1 ~')
      .s('sine')
      .gain(0.2)
      .decay(0.08)
      .sustain(0)
      .lpf(200),
    // Tension arp — barely audible movement
    note('e4 g4 bb4 e5')
      .s('square')
      .fast(4)
      .gain(0.04)
      .lpf('<800 1200 1600 1200>')
      .decay(0.06)
      .sustain(0)
  ).cpm(120).play();
}

// Game Over BGM — somber, slow, melancholic
// The singularity consumed everything. Nothing human remains.
export function gameOverTheme() {
  return stack(
    // Descending melody — loss, decay
    note('bb4 ~ a4 ~ g4 ~ e4 ~ d4 ~ c4 ~ ~ ~ ~ ~')
      .s('triangle')
      .gain(0.16)
      .decay(0.6)
      .sustain(0.1)
      .release(1.2)
      .room(0.6)
      .roomsize(5)
      .lpf(1600),
    // Dark pad — minor chord wash
    note('d3,f3,a3')
      .s('sine')
      .attack(0.6)
      .release(2.5)
      .gain(0.1)
      .room(0.7)
      .roomsize(6)
      .lpf(1000),
    // Sub bass — low drone
    note('d2 ~ ~ ~ ~ ~ a1 ~')
      .s('sine')
      .gain(0.12)
      .slow(4)
      .lpf(300)
  ).slow(3).cpm(50).play();
}
