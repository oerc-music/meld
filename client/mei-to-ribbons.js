// This file contains the functionality for drawing simple ribbon diagrams from simple MEI score.
// First, make a new Orchestration object from the MEI string:
//   var orch = new Orchestration(MEIString);
// Then give it an SVG object and bounding coordinates for where to draw
//   orch.drawOrchestration(SVG, 0, 800, 0, 600);
// The results are given classes but not styled

////////////////
// util functions
function nsResolver(prefix) {
  var ns = {
    'xml' : 'http://www.w3.org/1999/xml',
    'mei': 'http://www.music-encoding.org/ns/mei'
  };
  return ns[prefix] || null;
}
var MEINS = "http://www.music-encoding.org/ns/mei";
var SVGNS = "http://www.w3.org/2000/svg";

function createSVG (w,h){
  var svg=document.createElementNS(SVGNS,"svg");
  if(w) svg.setAttributeNS(null, "width", w);
  if(h) svg.setAttributeNS(null, "height", h);
  return svg;
}

function clearSVG(svgEl){
  while(svgEl.firstChild){
    svgEl.removeChild(svgEl.firstChild);
  }
}
function svgCSS(element, css){
  var link = document.createElementNS(SVGNS, "link");
  link.setAttributeNS(null, "href", css);
  link.setAttributeNS(null, "type", "text/css");
  link.setAttributeNS(null, "rel", "stylesheet");
  element.appendChild(link);
  return element;
}
function svgText(svgEl, x, y, cname, id, style, content){
  var el = document.createElementNS(SVGNS, "text");
  if(cname) el.setAttributeNS(null, "class", cname);
  if(id) el.id = id;
  if(x) el.setAttributeNS(null, "x", x);
  if(y) el.setAttributeNS(null, "y", y);
  if(style) el.setAttributeNS(null, "style", style);
  if(content == 0 || content) el.appendChild(document.createTextNode(content));
  if(svgEl) svgEl.appendChild(el);
  return el;
}
function svgSpan(svgEl, cname, id, content){
  var el = document.createElementNS(SVGNS, "tspan");
  if(content) var textNode = document.createTextNode(content);
  if(cname) el.setAttributeNS(null, "class", cname);
  if(id) el.id = id;
  if(content) el.appendChild(textNode);
  if(svgEl)  svgEl.appendChild(el);
  return el;
}
function svgGroup(svgEl, cname, id){
  var el = document.createElementNS(SVGNS, "g");
  if(cname) el.setAttributeNS(null, "class", cname);
  if(id) el.id = id;
  if(svgEl) svgEl.appendChild(el);
  return el;
}
function svgLine(svgEl, x1, y1, x2, y2, cname, id){
  var el = document.createElementNS(SVGNS, "line");
  if(cname) el.setAttributeNS(null, "class", cname);
  if(id) el.setAttributeNS(null, "id", id);
  el.setAttributeNS(null, "x1", x1);
  el.setAttributeNS(null, "y1", y1);
  el.setAttributeNS(null, "x2", x2);
  el.setAttributeNS(null, "y2", y2);
  if(svgEl) svgEl.appendChild(el);
  return el;
}
function svgRect(svgEl, x, y, width, height, cname, id){
  var el = document.createElementNS(SVGNS, "rect");
  if(cname) el.setAttributeNS(null, "class", cname);
  if(id) el.setAttributeNS(null, "id", id);
  if(x) el.setAttributeNS(null, "x", x);
  if(y) el.setAttributeNS(null, "y", y);
  if(width) el.setAttributeNS(null, "width", width);
  if(height) el.setAttributeNS(null, "height", height);
  if(svgEl) svgEl.appendChild(el);
  return el;
}
function svgRoundedRect(svgEl, x, y, width, height, rx, ry,cname, id){
  var el = document.createElementNS(SVGNS, "rect");
  if(cname) el.setAttributeNS(null, "class", cname);
  if(id) el.setAttributeNS(null, "id", id);
  if(x) el.setAttributeNS(null, "x", x);
  if(y) el.setAttributeNS(null, "y", y);
  if(rx) el.setAttributeNS(null, "rx", rx);
  if(ry) el.setAttributeNS(null, "ry", ry);
  if(width) el.setAttributeNS(null, "width", width);
  if(height) el.setAttributeNS(null, "height", height);
  if(svgEl) svgEl.appendChild(el);
  return el;
}

function duration(event, MEIObject){
  var base = event.getAttributeNS(null, 'dur');
  if(!base){
    // Probably a chord – get dur from parent
    base = MEIObject.evaluate('./ancestor::*[@dur][1]', event, nsResolver,
      XPathResult.NUMBER_TYPE, null).numberValue;
  }
  base = 1/Number(base);
  var dur = base;
  var dots = event.getAttributeNS(null, 'dots');
  if(dots) dur = base*(2 - (1 / (Math.pow(2, Number(dots)))));
  return dur*4;
}
function countMeasures(MEIObject){
  // Given parsed MEI, how many measures are there?
  var measureCount = MEIObject.evaluate('count(//mei:measure)', MEIObject, nsResolver, XPathResult.NUMBER_TYPE, null);
  return measureCount.numberValue;
}
function InstrumentType(proto, name, shortname, section){
  if(proto){
    this.name=proto.name;
    this.shortname=proto.shortname;
    this.section=proto.section;
  } else {
    this.name=name;
    this.shortname=shortname;
    this.section=section;
  }
}
InstrumentType.prototype.eq = function(instType) {
  return this.name===instType.name;
}

var Instruments = {
  "flute": new InstrumentType(false,'Flute', 'fl', 'Woodwind'),
  "piccolo": new InstrumentType(false,'Piccolo', 'pic', 'Woodwind'),
  "oboe": new InstrumentType(false,'Oboe', 'hb', 'Woodwind'),
  "cor anglais": new InstrumentType(false,'Cor anglais', 'ca', 'Woodwind'),
  "english horn": new InstrumentType(false,'Cor anglais', 'ca', 'Woodwind'),
  "a clarinet": new InstrumentType(false,'Clarinet in A', 'cl.A', 'Woodwind'),
  "bassoon": new InstrumentType(false,'Bassoon', 'fg', 'Woodwind'),
  "horn in e": new InstrumentType(false,'Horn in E', 'cr.E', 'Brass'),
  "violin": new InstrumentType(false,'Violin', 'vln', 'Strings'),
  "viola": new InstrumentType(false,'Viola', 'vla', 'Strings'),
  "cello": new InstrumentType(false,'Cello', 'vc', 'Strings'),
  "violoncello": new InstrumentType(false,'Cello', 'vc', 'Strings'),
  "elsa": new InstrumentType(false,'Elsa', 'E', 'Cast'),
  "lohengrin": new InstrumentType(false,'Lohengrin', 'Lo', 'Cast')
};
function instrumentMatch(type){
  if(Instruments[type.toLowerCase()]){
    return new InstrumentType(Instruments[type.toLowerCase()]);
  }
}
function getInstrumentType(instLabel){
  var type=instLabel;
  var no=false;
  var pos=instLabel.search(/ +[0-9]+/);
  if(pos>-1){
    type = instLabel.substr(0,pos);
    var noString = instLabel.substr(pos);
    pos = instLabel.search(/[0-9]/);
    no = parseInt(instLabel.substr(pos), 10);
  }
  var instr = instrumentMatch(type);
  if(!instr) return false;
  instr.no = no;
  return instr;
}

///////////////////
// Main code

function MeasureEventBlock(startTime, endTime, event){
  this.start = startTime;
  this.end = endTime;
  this.duration = endTime-startTime;
  this.sounding = event.nodeName=='note' || event.nodeName=='chord';
  this.events = [event];
}
MeasureEventBlock.prototype.extend = function(startTime, endTime, event){
  this.events.push(event);
  this.start = Math.min(startTime, this.start);
  this.end = Math.max(endTime, this.end);
}
MeasureEventBlock.prototype.extends = function(event){
  // Is the new event of the same type as others in this object
  return (event.nodeName == 'note' && this.sounding)
      || (event.nodeName == 'note' && this.sounding)
      || (event.nodeName=='rest' && !this.sounding);
}

function InstrumentMeasure(barStaff, MEIObject){
  // This object contains all the information for a bar of music
  // as played by one instrument on one staff
  this.MEIObject = MEIObject;
  this.barStaff = barStaff;
  this.barNo = this.MEIObject.evaluate('./ancestor::mei:measure/@n', barStaff,
    nsResolver, XPathResult.NUMBER_TYPE, null).numberValue;
  this.events = [];
  this.duration = 0;
  var eventObjs = this.MEIObject.evaluate('./mei:layer/mei:note | ./mei:layer/mei:rest | ./mei:layer/mei:chord', barStaff, nsResolver, XPathResult.ORDERED_NODE_ITERATORTYPE, null);
  var event = eventObjs.iterateNext();
  var t = 0;
  var newt = false;
  while(event){
    newt = t+duration(event);
    if(this.events.length && this.events[this.events.length-1].extends(event)){
      // Just extend the previous thing in events
      this.events[this.events.length-1].extend(t, newt, event);
    } else {
      this.events[this.events.length] = new MeasureEventBlock(t, newt, event);
    }
    t = newt;
    event = eventObjs.iterateNext();
  }
  this.duration = t;
}
function findMeasures(n, MEIObject){
  // Given parsed MEI, find all the bars with music in for staff/instrument n
  var staves = MEIObject.evaluate('//mei:staff[@n='+n+' and .//mei:note]', MEIObject, nsResolver, XPathResult.ORDERED_NODE_ITERATORTYPE, null);
  var staff = staves.iterateNext();
  var bars = [];
  while(staff){
    bars.push(new InstrumentMeasure(staff, MEIObject));
    staff = staves.iterateNext();
  }
  return bars;
}
function Instrument(staffDef, MEIObject){
  // Instrument object (includes activity info)
  this.MEIObject = MEIObject;
  this.name = staffDef.getAttributeNS(null, 'label');
  this.n = staffDef.getAttributeNS(null, 'n');
  this.type = false;
  this.number = false;
  this.measures = findMeasures(this.n, MEIObject);
}
Instrument.prototype.caption = function(SVG, x, y) {
  if(!this.type)  this.type=getInstrumentType(this.name);
  if(this.type){
    svgText(SVG, x, y, "instrLabel", false, false, this.type.shortname);
  }
}
Instrument.prototype.classes = function(){
  if(!this.type) this.type=getInstrumentType(this.name);
  if(this.type) {
    return this.type.shortname+" "+this.type.section;
  }
  return '';
}
Instrument.prototype.drawRibbon = function(SVG, top, height, left, step){
  // Draw this thing
  var prevMeasure = false;
  var ribbonTop = top+(height/8);
  var ribbonHeight = height*6/8;
  var prevn = false;
  var start = false;
  var startX = false;
  for(var i=0; i<this.measures.length; i++){
    var measure = this.measures[i];
    var n = measure.barNo-1;
    if(start && prevn && prevn<n-1){
      // need to close
      svgRoundedRect(SVG, start, ribbonTop, left+(step*(prevn+1))-start, ribbonHeight, 4, 4,'box '+this.n+' '+this.classes(), false);
      start = false;
    }
    for(var j=0; j<measure.events.length; j++){
      var event = measure.events[j];
      if(event.sounding) {
        if(start && j==0){
          if(j<measure.events.length-1){
            // if it were the last thing then we wouldn't draw it
            svgRoundedRect(SVG, start, ribbonTop,
              left+(step*n)+(step*event.end/measure.duration)-start, ribbonHeight, 4, 4,'box '+this.n+' '+this.classes(), false);
          }
        } else if (j==measure.events.length-1){
          start = left+(step*n)+(step*event.start/measure.duration);
        } else {
          // Standalone box
          svgRoundedRect(SVG, left+(step*n)+(step*event.start/measure.duration),
            ribbonTop, step*event.duration/measure.duration, ribbonHeight,
            4, 4, 'box '+this.n+' '+this.classes(), false);
        }
      } else {
        if(start){
            svgRoundedRect(SVG, start, ribbonTop,
              left+(step*n)+(step*event.start/measure.duration)-start, ribbonHeight, 4, 4,'box '+this.n+' '+this.classes(), false);
            start = false;
        }
      }
    }
    prevn = n;
  }
  if(start) {
    svgRoundedRect(SVG, start, ribbonTop, left+step*(prevn+1)-start, ribbonHeight, 4, 4, 'box'+' '+this.classes(), false);
  }
}

function findInstruments(MEIObject){
  // Given parsed MEI, return objects for all instruments
  var staffDefs = MEIObject.evaluate('//mei:staffDef', MEIObject, nsResolver, XPathResult.ORDERED_NODE_ITERATORTYPE, null);
  var staffDef = staffDefs.iterateNext();
  var instruments = [];
  while(staffDef){
    instruments[staffDef.getAttributeNS(null, 'n')-1]=new Instrument(staffDef, MEIObject);
    staffDef = staffDefs.iterateNext();
  }
  return instruments;
}
function Orchestration (MEIString){
  // The Orchestration object holds a parsed MEI XML object
  // and then extracts various elements of the orchestration
  // for drawing.
  this.MEIString = MEIString;
  var p = new DOMParser();
  this.MEIObject = p.parseFromString(MEIString, "text/xml");
  this.measureCount = countMeasures(this.MEIObject);
  this.instruments = findInstruments(this.MEIObject);
}
Orchestration.prototype.drawOrchestration = function(SVG, left, right, top, bottom){
  if(!SVG) SVG = createSVG(right, bottom);
  SVG.setAttributeNS(null, 'class', SVG.getAttributeNS(null, 'class') ? SVG.getAttributeNS(null, 'class')+' orchestralRibbon' : 'orchestralRibbon');
  var height = bottom - top;
  var rowHeight = height / this.instruments.length;
  var textSpace = 40;
  var step = (right - left - textSpace) / this.measureCount;
  var x=left+textSpace;
  for(var i=0; i<this.measureCount; i++){
    svgLine(SVG, x, top, x, bottom, "ribbon-barline");
    x+=step;
  }
  for(i=0; i<this.instruments.length; i++){
    this.instruments[i].caption(SVG, left, top+(rowHeight*(i+0.875)));
    this.instruments[i].drawRibbon(SVG, top+(rowHeight*i), rowHeight, left+textSpace, step);
  }
  return SVG;
}
