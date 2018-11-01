/**
 * Copyright (C) 2018 Luis Bergmann, https://luisbergmann.com/
 */
var CoreAudio = new function() {

  // notes and octaves
  var notes = [0, 2, 3, 5, 7, 10];
  var octaves = [0, 12, 24, 36];

  // sound chain
  // it can get cpu intensive with the reverb
  var reverb = T("reverb", {room:0.7, damp:0.2, mix:0.3}).play();

  //organism sound chain
  var orgOsc = T("pulse");
  var orgEnv = T("perc", {a:1, r:30});
  var orgOscEnv1 = T("OscGen", {osc:orgOsc, env:orgEnv, mul:0.1});
  reverb.append(orgOscEnv1);

  var orgOsc2 = T("sin");
  var orgEnv2 = T("perc", {a:10, r:500});
  var orgOscEnv2 = T("OscGen", {osc:orgOsc2, env:orgEnv2, mul:0.2});
  reverb.append(orgOscEnv2);

  //shield sound chain
  var shieldNoiseOsc = T("fnoise", {freq:50, mul:0.1});
  var shieldOsc = T("pulse", {freq:50, mul:0.1});
  var shieldEnv = T("perc", {a:10, r:100}, shieldNoiseOsc, shieldOsc).play();

  // play synth note every time a organism is created
  this.playSynth = function(objPos) {
    //choose and play synth note
    var midicps = T("midicps");
    var note = notes[Math.random() * 5 | 0];
    var octave = octaves[Math.random() * 3 | 0];

    if (Math.random() < 0.7) {
      // for saving cpu not every time there's a organism a oscillator plays
      var playOsc = T("sin", {freq:midicps.at(60 + note + octave), mul:0.2});
      var playEnv = T("perc", {r:3000}, playOsc).bang();
      var eq = T("eq", {params:{hpf:[200, 1], lpf:[2000, 1]}}, playEnv);
      var tremParam = T("param", {value:1}).to(Math.random()*5 + 5, 3000);
      var tremOsc = T("sin", {freq:tremParam, mul:.6});
      var trem = T("*", eq, tremOsc);
      var panParam = T("param", {value:objPos}).expTo(0.5, 3000);
      var pan = T("pan", {pos:panParam}, trem).play();

      var interval = T("timeout", {timeout:3000}).on('ended', function () {
        tremOsc.pause();
        trem.pause();
        pan.pause();
      }).start();
    }
  }


  this.organismDead = function () {
    var midicps = T("midicps");
    var note = notes[Math.random() * 5 | 0];
    var octave = octaves[Math.random() * 3 | 0];

    orgOscEnv1.noteOn((180 + note + octave), 80);
    orgOscEnv2.noteOn((60 + note + octave), 80);

    //low sound
    var lowOsc = T("sin", {freq:Math.random()*50+50, mul:0.6});
    var losOscEq = T("eq", {params:{hpf:[150, 1]}}, lowOsc);
    var lowPscEnv= T("perc", {a:70, r:100}, losOscEq).bang().play();

  }

  this.playShield = function () {
    shieldEnv.bang();
  }

  this.playGameOver = function () {
    // var downer = T("param", {value:10000}).to(50, 2000);
    var osc = T('fnoise', {freq:400, mul:0.1});
    var env = T('perc', {a:10, r:2000}, osc).bang().play();
  }


  this.energyUp = function () {
    var energyFreq = T("param", {value:80}).to(Math.random()*500+500, "1sec");
    var osc1 = T('sin', {freq:energyFreq, mul:0.6});
    var osc1Eq = T("eq", {params:{hpf:[150, 1]}}, osc1);
    var env = T("perc", {a:50, r:500}, osc1Eq).bang().play();
  }

  this.energyDown = function () {

    //sine osc with tremolo
    var downer2 = T("param", {value:(Math.random()*100 + 100)}).to(10, 1000);
    var osc2 = T('sin', {freq:downer2, mul:0.1});
    var osc2Eq = T("eq", {params:{hpf:[150, 1]}}, osc2);
    var downer3 = T("param", {value:(Math.random()*50 + 50)}).to(30, 1000);
    var osc3 = T('pulse', {freq:downer3, mul:0.1});
    var osc3Eq = T("eq", {params:{hpf:[150, 1]}}, osc3);
    var env2 = T("perc", {r:800}, osc2Eq, osc3Eq).bang();
    var trem2param = T("param", {value:Math.random()*5+1}).to(1, 1000);
    var trem2 = T("sin", {freq:trem2param, mul:.7})
    var oscTrem2 = T("*", env2, trem2).play();
  }
}