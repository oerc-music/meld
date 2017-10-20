import React, { Component } from 'react';
import ReactDOM from 'react-dom';
import { connect } from 'react-redux';
import { bindActionCreators} from 'redux';
import { fetchTimeline } from '../actions/index';

import InlineSVG from 'svg-inline-react';

class MEITimeline extends Component {
  constructor(props) {
    super(props);
    this.state={
      structures: [['overture', 'Vorspiel', 75, false],
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
                              [['F10', 494], ['F11', 621], ['F12', 737], ['F13',824], ['F14', 832], ['F15', 836], ['F16',1062]]]]
    };
  }
  sumBars(structures){
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
  motifChangeClickHandler(event){
    var el = event.target;
    var motif = el.getAttributeNS(null, 'class').match(/F[0-9]+/);
    this.props.onMotifChange(motif);
  }
  render(){
    if(this.state.structures) {
      var structures = this.state.structures;
      var boxTop = this.props.boxTop || 20;
      var boxHeight= this.props.boxHeight || 20;
      var boxBottom = boxTop+boxHeight;
      var width = this.props.width || 1200;
      var height = this.props.height || 80;
      var sceneY = boxBottom+((height-boxBottom)/3);
      var barCount = this.sumBars(this.state.structures);
      var scale = width / barCount;
      var curx = 0;
      var motifLines = [];
      var divLines = [];
      for(var i=0; i<structures.length; i++){
          var act = structures[i];
          var actString = act[0]+"-"+act[1];
          // Draw lines for acts
          divLines.push(<line className="act division" id={"tl-"+actString} 
                          x1={curx} x2={curx} y1={i ? boxTop : boxTop+6} y2={height-2} />);
          divLines.push(<text className="actname" x={curx+2} y={height}>{(act[1]+"").substring(0, 3)}</text>)
          // draw lines for motifs (first because bar numbers are index by act, not scene)
          if(act[3] && act[3].length){
            for(var m=0; m<act[3].length; m++){
              var motif = act[3][m];
              var current = this.props.motif && this.props.motif==motif[0];
              var currentClass = current ? " active" : "";
              var fun = this.motifChangeClickHandler.bind(this);
              motifLines.push(<line className={"annotation annotation__AskingForbidden_"+motif[0]+"_1"+currentClass}
                                    onClick={ fun }
                                    x1={curx+(motif[1]*scale)} x2={curx+(motif[1]*scale)}
                                    y1={current ? 0 : 5} y2={boxBottom} />);
            }
          }
          if(Array.isArray(act[2])){
            for(var s=0; s<act[2].length; s++){
              var scene = act[2][s];
              divLines.push(<line className="scene division" id={"tl-"+scene[0]+"-"+scene[1]+"-"+actString}
                                  x1={curx} x2={curx} y1={boxTop} y2={sceneY} />);
              divLines.push(<text className="scenename" x={curx+2} y={sceneY+2}>{(scene[1]+"").substring(0, 3)}</text>);
              curx += scale*scene[2];
            }
          } else {
            curx += scale * act[2];
          }
      }
			return (
        <svg width={width} height={height} className="timeline-overview">
          <rect className={"timeline"} y={boxTop} x="0" rx="6px" ry="6px" width={width} height={boxHeight}></rect>
          {divLines}
          {motifLines}
        </svg> );
		}
		return <div>Loading...</div>;
  }

}


function mapStateToProps({ score }) {
	return { score };
}

function mapDispatchToProps(dispatch) {
	return {};
}

export default connect(mapStateToProps, mapDispatchToProps)(MEITimeline);
