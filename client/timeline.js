function SVGTimeline(){
  this.MEINS = "http://www.music-encoding.org/ns/mei";
  this.SVGNS = "http://www.w3.org/2000/svg";
  this.svg = false;
  this.barCount = false;
  this.nsResolver = function(prefix){
    var ns = {
      'xml' : 'http://www.w3.org/1999/xml',
      'mei': this.MEINS,
      'svg': this.SVGNS
    };
    return ns[prefix] || null;
  }
  this.createSVG = function(w, h){
    var svg=document.createElementNS(this.SVGNS,"svg");
    if(w) svg.setAttributeNS(null, "width", w);
    if(h) svg.setAttributeNS(null, "height", h);
    return svg;
  }
  this.clearSVG = function(svgEl){
    while(svgEl.firstChild){
      svgEl.removeChild(svgEl.firstChild);
    }
  }
  this.svgCSS = function(element, css){
    var link = document.createElementNS(this.SVGNS, "link");
    link.setAttributeNS(null, "href", css);
    link.setAttributeNS(null, "type", "text/css");
    link.setAttributeNS(null, "rel", "stylesheet");
    element.appendChild(link);
    return element;
  }
  this.svgText = function (svgEl, x, y, cname, id, style, content){
    var el = document.createElementNS(this.SVGNS, "text");
    if(cname) el.setAttributeNS(null, "class", cname);
    if(id) el.id = id;
    if(x) el.setAttributeNS(null, "x", x);
    if(y) el.setAttributeNS(null, "y", y);
    if(style) el.setAttributeNS(null, "style", style);
    if(content == 0 || content) el.appendChild(document.createTextNode(content));
    if(svgEl) svgEl.appendChild(el);
    return el;
  }
  this.svgLine = function (svgEl, x1, y1, x2, y2, cname, id){
    var el = document.createElementNS(this.SVGNS, "line");
    if(cname) el.setAttributeNS(null, "class", cname);
    if(id) el.setAttributeNS(null, "id", id);
    el.setAttributeNS(null, "x1", x1);
    el.setAttributeNS(null, "y1", y1);
    el.setAttributeNS(null, "x2", x2);
    el.setAttributeNS(null, "y2", y2);
    if(svgEl) svgEl.appendChild(el);
    return el;
  }
  this.svgRect = function (svgEl, x, y, width, height, cname, id){
    var el = document.createElementNS(this.SVGNS, "rect");
    if(cname) el.setAttributeNS(null, "class", cname);
    if(id) el.setAttributeNS(null, "id", id);
    if(x) el.setAttributeNS(null, "x", x);
    if(y) el.setAttributeNS(null, "y", y);
    if(width) el.setAttributeNS(null, "width", width);
    if(height) el.setAttributeNS(null, "height", height);
    if(svgEl) svgEl.appendChild(el);
    return el;
  }
  this.sumBars = function(structures){
    var sum = 0;
    for(var i=0; i<structures.length; i++){
      if(Array.isArray(structures[i][2])){
        sum+=this.sumBars(structures[i][2]);
      } else {
        if(Number.isInteger(structures[i][2])){
          sum += structures[i][2];
        } else {
          console.log("mangled dramatic structure: ", structures[i], Array.isArray(structures[i][2]));
        }
      }
    }
    return sum;
  }
  this.defaultStructures = [['overture', 'Vorspiel', 75, false],
                            ['act', 'I', [['scene', 1, 262],
                                          ['scene', 2, 397],
                                          ['scene', 3, 587]],
                              [['F1', 777], ['F2', 789]]],
                            ['act', 'II', [['scene', 1, 423],
                                           ['scene', 2, 443],
                                           ['scene', 3, 479],
                                           ['scene', 4, 283],
                                           ['scene', 5, 478]],
                              [['F3', 18], ['F4', 31], ['F5', 288], ['F6', 767], ['F7', 1875], ['F8', 1949], ['F9', 2098]]],
                            ['act', 'II', [['scene', 1, 174],
                                           ['scene', 2, 553],
                                           ['scene', 3, 845]],
                              [['F10', 494], ['F11', 621], ['F12', 737], ['F13',824], ['F14', 832], ['F15', 836], ['F16',1062]]]];
  this.drawTimeline = function(structures,  w, h){
    this.svg = this.createSVG(w, h);
    if(!structures) structures = this.defaultStructures;
    /* structures of the form [["overture", "vorspiel", 75, false],
                              ["act", "I", [["scene", 1, 262],
                                            ["scene", 2, 397],
                                            ["scene", 3, 596]],
                                [["F1", 782], ["F2", 796]]],
                                            ...]]*/
    this.barCount = this.sumBars(structures);
    var scale = w/this.barCount;
    var boxTop = 20;
    var boxHeight=20;
    var boxBottom = boxTop+boxHeight;
    this.svgRect(this.svg, 0, boxTop, w, boxHeight, 'timeline');
    curx = 0;
    for(var i=0; i<structures.length; i++){
      this.svgLine(this.svg, curx, boxTop, curx, h, 'act division', 'tl-'+structures[i][0]+'-'+structures[i][1]);
      var shortname = structures[i][1]+'';
      shortname = shortname.substring(0, 3);
      this.svgText(this.svg, curx + 2, h, 'actname', false, false, shortname);
      if(structures[i][3] && structures[i][3].length){
        for(var s=0; s<structures[i][3].length; s++){
          var event = structures[i][3][s];
          var eventx = curx+event[1]*scale;
          var line = this.svgLine(this.svg, eventx, 0, eventx, boxBottom, 'annotation annotation__AskingForbidden_'+event[0]+'_1');
        }
      }
      if(Array.isArray(structures[i][2])){
        for(var j=0; j<structures[i][2].length; j++){
          var substructure = structures[i][2][j];
          var posy = boxBottom+((h-boxBottom)/3);
          this.svgLine(this.svg, curx, boxTop, curx, posy, 'scene division',
            'tl-'+structures[i][0]+'-'+structures[i][1]+'-'+substructure[0]+'-'+substructure[1]);
          shortname = substructure[1]+'';
          shortname = shortname.substring(0, 3);
          this.svgText(this.svg, curx + 2, posy, 'scenename', false, false, shortname);
          curx+=scale * substructure[2];
        }
      } else {
        curx += scale * structures[i][2];
      }
    }
    this.svgLine(this.svg, curx, boxTop, curx, h, 'act division', 'tl-end');
    return this.svg;
  }
}
