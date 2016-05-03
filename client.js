// Generated by CoffeeScript 1.10.0
(function() {
  var $, addGroup, buffercache, canOgg, context, defs, ext, groupPulser, groups, labelGroup, linkGroup, makeNode, makePulser, massiveLagCallbacks, maybeFetch, nodeGroup, nodeProto, nodes, onMassiveLag, play, pulser, shadeGroup, svg, svgEl, svgText, watchFrameDrop;

  $ = document.querySelector.bind(document);

  context = new (window.AudioContext || window.webkitAudioContext);

  console.log(context.sampleRate);

  buffercache = {};

  maybeFetch = function(src) {
    if (buffercache[src]) {
      return Promise.resolve(buffercache[src]);
    } else {
      return fetch(src).then(function(response) {
        return response.arrayBuffer();
      }).then(function(audioData) {
        return new Promise(function(accept) {
          return context.decodeAudioData(audioData, accept);
        });
      }).then(function(buffer) {
        buffercache[src] = buffer;
        return buffer;
      });
    }
  };

  play = function(src, at) {
    return maybeFetch(src).then(function(buffer) {
      var node;
      node = context.createBufferSource();
      node.buffer = buffer;
      node.connect(groupPulser.node);
      if (at) {
        node.start(at, 0, buffer.duration);
      } else {
        node.start(context.currentTime, 0, buffer.duration);
      }
      return node;
    });
  };

  massiveLagCallbacks = [];

  onMassiveLag = function(f) {
    return massiveLagCallbacks.push(f);
  };

  watchFrameDrop = function() {
    var checkFrameDrop, frameTime, framesDropped, oldt;
    framesDropped = 0;
    oldt = 0;
    frameTime = 1 / 30 * 1000;
    checkFrameDrop = function() {
      return requestAnimationFrame(function(t) {
        var f, j, len;
        if (t - oldt > frameTime) {
          framesDropped += Math.min(Math.round((t - oldt) / frameTime), 10);
          console.log("framedrop", framesDropped, t - oldt);
        } else if (framesDropped > 0) {
          framesDropped -= 0.25;
        }
        if (framesDropped > 100) {
          for (j = 0, len = massiveLagCallbacks.length; j < len; j++) {
            f = massiveLagCallbacks[j];
            f();
          }
          return;
        }
        oldt = t;
        return checkFrameDrop();
      });
    };
    return checkFrameDrop();
  };

  watchFrameDrop();

  makePulser = function(opts) {
    var ary, attach, attachedEl, attack, decay, draw, drawing, max, min, node, oldavg, oldt, ref, ref1, ref2, smoothing, stop, stopped;
    if (opts == null) {
      opts = {};
    }
    node = context.createAnalyser();
    node.fftSize = opts.fftSize || 256;
    ary = new Float32Array(node.fftSize);
    min = null;
    max = null;
    oldavg = null;
    attachedEl = null;
    drawing = false;
    decay = (ref = opts.decay) != null ? ref : 0.0001;
    attack = (ref1 = opts.attack) != null ? ref1 : 0.5;
    smoothing = (ref2 = opts.smoothing) != null ? ref2 : 0.66;
    oldt = null;
    stopped = false;
    draw = function() {
      return requestAnimationFrame(function(t) {
        var avg, j, len, newmax, newmin, val;
        if (stopped) {
          return;
        }
        if (node.getFloatTimeDomainData) {
          node.getFloatTimeDomainData(ary);
        } else {
          ary[0] = 1;
        }
        avg = 0;
        for (j = 0, len = ary.length; j < len; j++) {
          val = ary[j];
          avg += Math.abs(val);
        }
        avg = avg * (1 - smoothing) + oldavg * smoothing;
        oldavg = avg;
        if (!oldavg) {
          min = avg;
          max = avg;
          oldavg = avg;
        }
        if (avg < min) {
          min = min * (1 - attack) + avg * attack;
        }
        if (avg > max) {
          max = max * (1 - attack) + avg * attack;
        }
        val = Math.round(Math.min((avg - min) / (max - min), 1) * 1000) / 1000;
        newmax = max * (1 - decay) + min * decay;
        newmin = min * (1 - decay) + max * decay;
        max = newmax;
        min = newmin;
        attachedEl.style.opacity = opts.invert ? 1 - val : val;
        return draw();
      });
    };
    attach = function(el) {
      if (attachedEl) {
        attachedEl.style.opacity = 0;
      }
      attachedEl = el;
      if (!drawing) {
        draw();
      }
      return drawing = true;
    };
    stop = function() {
      return stopped = true;
    };
    return {
      node: node,
      attach: attach,
      stop: stop
    };
  };

  pulser = makePulser();

  groupPulser = makePulser({
    fftsize: 2048,
    attack: 1,
    smoothing: 0.96,
    invert: true
  });

  pulser.node.connect(context.destination);

  groupPulser.node.connect(pulser.node);

  onMassiveLag(function() {
    return groupPulser.stop();
  });

  svg = document.querySelector('svg');

  svgEl = function(name, attribs) {
    var el, k, v;
    if (attribs == null) {
      attribs = {};
    }
    el = document.createElementNS('http://www.w3.org/2000/svg', name);
    for (k in attribs) {
      v = attribs[k];
      el.setAttribute(k, v);
    }
    return el;
  };

  svgText = function(text, attribs) {
    var el;
    el = svgEl('text', attribs);
    el.textContent = text;
    return el;
  };

  defs = svgEl('defs');

  defs.innerHTML = "<marker id=\"markerArrow\"\n        viewBox=\"0 0 10 10\"\n        refX=\"1\" refY=\"5\"\n        markerWidth=\"5\"\n        markerHeight=\"5\"\n        orient=\"auto\">\n    <path d=\"M 0 0 L 10 5 L 0 10 z\" />\n</marker>";

  svg.appendChild(defs);

  labelGroup = svgEl('g', {
    "font-size": 96,
    "text-anchor": "middle"
  });

  linkGroup = svgEl('g', {
    "opacity": 0.8
  });

  nodeGroup = svgEl('g');

  shadeGroup = svgEl('g');

  svg.appendChild(shadeGroup);

  svg.appendChild(labelGroup);

  svg.appendChild(linkGroup);

  svg.appendChild(nodeGroup);

  labelGroup.style.fontFamily = '"Helvetica Neue", "Helvetica", Sans Serif';

  labelGroup.style.fontWeight = "600";

  groups = {};

  addGroup = function(name, group) {
    var el, grad, i, j, len, pulseEl, rate, ref, shade, start, t, text;
    groups[name] = group;
    group.el = el = svgEl('g', {
      fill: group.fill,
      stroke: group.stroke
    });
    group.pulseEl = pulseEl = svgEl('g', {
      opacity: 0,
      stroke: group.stroke,
      fill: group.pulse
    });
    labelGroup.appendChild(el);
    labelGroup.appendChild(pulseEl);
    ref = group.label.text;
    for (i = j = 0, len = ref.length; j < len; i = ++j) {
      t = ref[i];
      text = svgText(t, {
        x: group.label.x,
        y: group.label.y + i * 96
      });
      el.appendChild(text);
      pulseEl.appendChild(text.cloneNode(true));
    }
    if (group.shade) {
      grad = svgEl('radialGradient', {
        id: name + "-gradient"
      });
      grad.appendChild(svgEl('stop', {
        offset: "0%",
        "stop-opacity": 1,
        "stop-color": group.shade.fill
      }));
      grad.appendChild(svgEl('stop', {
        offset: "50%",
        "stop-opacity": 1,
        "stop-color": group.shade.fill
      }));
      grad.appendChild(svgEl('stop', {
        offset: "100%",
        "stop-opacity": 0,
        "stop-color": group.shade.fill
      }));
      defs.appendChild(grad);
      shade = svgEl('circle', {
        cx: group.shade.x,
        cy: group.shade.y,
        r: group.shade.r * 1.5,
        fill: "url(#" + name + "-gradient)",
        opacity: 0.8
      });
      rate = 2.3529;
      start = (Math.random() * -2 * rate).toFixed(4);
      shade.style.animation = rate + "s ease-in-out " + start + "s infinite alternate pulse";
      onMassiveLag(function() {
        return shade.style.animation = "";
      });
      return shadeGroup.appendChild(shade);
    }
  };

  nodeProto = {
    render: function() {
      var botname, circle, el, label, nameparts, pulse, topname, x, y;
      if (this.el) {
        return;
      }
      this.el = el = svgEl('g', {
        opacity: 0.7
      });
      x = this.x;
      y = this.y;
      circle = svgEl('circle', {
        cx: x,
        cy: y,
        r: 40,
        fill: this.group.fill,
        stroke: this.group.stroke
      });
      this.pulse = pulse = svgEl('circle', {
        cx: x,
        cy: y,
        r: 40,
        fill: this.group.pulse,
        stroke: this.group.stroke,
        opacity: 0
      });
      nameparts = this.name.split('_');
      topname = nameparts.slice(0, 2).join('_');
      botname = nameparts.slice(2).join('_');
      if (this.label) {
        label = svgText(this.label, {
          x: x,
          y: y + 6,
          "text-anchor": "middle",
          "font-size": 16,
          "font-family": "Helvetica Neue",
          "font-weight": "800"
        });
      }
      el.appendChild(circle);
      el.appendChild(pulse);
      if (label) {
        el.appendChild(label);
      }
      return nodeGroup.appendChild(el);
    },
    renderLink: function(next) {
      var d, line, m, x1, x2, y1, y2;
      if (!(this.el && next.el)) {
        return;
      }
      this.linkEls || (this.linkEls = {});
      if (!this.linkEl) {
        this.linkEl = svgEl('g', {
          stroke: '#111'
        });
        linkGroup.appendChild(this.linkEl);
      }
      m = (next.y - this.y) / (next.x - this.x);
      d = Math.sqrt(Math.pow(next.y - this.y, 2) + Math.pow(next.x - this.x, 2));
      x1 = this.x + (next.x - this.x) * (40 / d);
      y1 = this.y + (next.y - this.y) * (40 / d);
      x2 = next.x - (next.x - this.x) * (48 / d);
      y2 = next.y - (next.y - this.y) * (48 / d);
      line = svgEl('line', {
        x1: x1,
        y1: y1,
        x2: x2,
        y2: y2,
        'stroke-width': 2,
        'marker-end': 'url(#markerArrow)'
      });
      this.linkEl.appendChild(line);
      return this.linkEls[next.name] = line;
    },
    display: function() {
      var j, l, len, ref, total;
      total = 0;
      ref = this.links;
      for (j = 0, len = ref.length; j < len; j++) {
        l = ref[j];
        total += l.weight;
      }
      return (this.name + " ⇒ ") + ((function() {
        var len1, n, ref1, ref2, results;
        ref1 = this.links;
        results = [];
        for (n = 0, len1 = ref1.length; n < len1; n++) {
          l = ref1[n];
          results.push(((ref2 = l.next) != null ? ref2.name : void 0) + " (" + (Math.round(l.weight / total * 100)) + "%)");
        }
        return results;
      }).call(this)).join(', ');
    },
    activate: function() {
      console.log(this.display());
      this.el.setAttribute('opacity', 0.8);
      pulser.attach(this.pulse);
      if (this.group.pulseEl) {
        return groupPulser.attach(this.group.pulseEl);
      }
    },
    deactivate: function() {
      var k, linkEl, ref, results;
      this.el.setAttribute('opacity', 0.7);
      if (this.linkEls) {
        ref = this.linkEls;
        results = [];
        for (k in ref) {
          linkEl = ref[k];
          results.push(linkEl.setAttribute('stroke', '#111'));
        }
        return results;
      }
    },
    preload: function() {
      console.log("Loading", this.src);
      return maybeFetch(this.src);
    },
    play: function(at, last) {
      if (at == null) {
        at = context.currentTime + 0.1;
      }
      console.log("Playing", this.src, "at", at);
      setTimeout((function(_this) {
        return function() {
          _this.activate();
          return last != null ? last.deactivate() : void 0;
        };
      })(this), (at - context.currentTime) * 1000);
      return play(this.src, at).then((function(_this) {
        return function(audio) {
          var next, scheduled, time;
          scheduled = at + audio.buffer.duration;
          time = (at - context.currentTime) * 1000 + 1000;
          next = _this.getNext();
          if (next) {
            next.preload();
            setTimeout(function() {
              _this.linkEls[next.name].setAttribute('stroke', '#FF5252');
              return next.play(scheduled, _this);
            }, time);
          }
          return audio.onended = _this.ended.bind(_this);
        };
      })(this));
    },
    ended: function() {
      return console.log("Finished", this.src);
    },
    getNext: function() {
      var cur, j, len, link, rand, ref, total;
      total = this.links.reduce((function(total, link) {
        return total + link.weight;
      }), 0);
      rand = Math.random() * total;
      cur = 0;
      ref = this.links;
      for (j = 0, len = ref.length; j < len; j++) {
        link = ref[j];
        cur += link.weight;
        if (rand <= cur) {
          return link.next;
        }
      }
      return null;
    },
    link: function(nexts, weight) {
      var j, len, linkEl, next;
      if (weight == null) {
        weight = 1;
      }
      if (!Array.isArray(nexts)) {
        nexts = [nexts];
      }
      for (j = 0, len = nexts.length; j < len; j++) {
        next = nexts[j];
        linkEl = this.renderLink(next);
        this.links.push({
          next: next,
          weight: weight
        });
      }
      return this;
    }
  };

  makeNode = function(src, data) {
    var j, k, len, o, ref;
    o = Object.create(nodeProto);
    o.src = src;
    o.links = [];
    o.name = src.split('/').pop().split('.')[0];
    ref = 'x y label'.split(' ');
    for (j = 0, len = ref.length; j < len; j++) {
      k = ref[j];
      o[k] = data[k];
    }
    if (data.group && groups[data.group]) {
      o.group = groups[data.group];
    } else {
      o.group = {
        fill: '#DDD',
        stroke: '#111',
        pulse: '#FFF'
      };
    }
    o.render();
    return o;
  };

  canOgg = document.createElement('audio').canPlayType('audio/ogg');

  ext = canOgg ? 'ogg' : 'mp3';

  nodes = {};

  fetch('data.json').then(function(result) {
    return result.json();
  }).then(function(data) {
    var group, groupName, k, l, links, ref, ref1, ref2, ref3, v, weight;
    ref = data.groups;
    for (groupName in ref) {
      group = ref[groupName];
      addGroup(groupName, group);
    }
    ref1 = data.nodes;
    for (k in ref1) {
      v = ref1[k];
      nodes[k] = makeNode("media/" + k + "." + ext, v);
    }
    ref2 = data.nodes;
    for (k in ref2) {
      v = ref2[k];
      ref3 = v.links;
      for (weight in ref3) {
        links = ref3[weight];
        nodes[k].link((function() {
          var j, len, results;
          results = [];
          for (j = 0, len = links.length; j < len; j++) {
            l = links[j];
            results.push(nodes[l]);
          }
          return results;
        })(), Number(weight));
      }
    }
    return nodes.intro.preload();
  }).then(function() {
    return nodes.intro.play();
  });

}).call(this);
