import React, { Component } from 'react';
import ReactDOM from 'react-dom';
import { connect } from 'react-redux';
import { bindActionCreators } from 'redux';
import { fetchTEI } from '../actions/index';
import { 
	MARKUP_EMPHASIS, 
	handleEmphasis,
	MARKUP_HIGHLIGHT,
	handleHighlight,
	MARKUP_HIGHLIGHT2,
	handleHighlight2,
	CUE_IMAGE,
	handleCueImage
} from '../actions/meldActions';

class TEI extends Component { 
	constructor(props) { 
		super(props);

		this.state = { 
			tei: {},
            annotations:{},
			scrollTop: 0 
        };
	}

  scrollToMotif(motifNo){
		console.log("scrolling");
		var targetClass = "annotation__AskingForbidden_"+motifNo+"_1";
		var textBox = ReactDOM.findDOMNode(this);
		var targetElements = textBox.getElementsByClassName(targetClass);
		if(targetElements.length){
			 targetElements[0].scrollIntoView;
			 textBox.scrollTop = targetElements[0].offsetTop - textBox.offsetTop + (textBox.clientHeight / 2);
		}
	}
	render() { 
		if(Object.keys(this.props.tei.TEI).length && this.props.uri in this.props.tei.TEI) { 
			// HACK //
			if(this.props.uri.indexOf("commentaries") > -1) { 
				if(this.props.onMotifChange && (!this.props.motif || !this.props.uri.endsWith(this.props.motif))){
					return <div/>;
				}
				return <div dangerouslySetInnerHTML={ this.returnHTMLizedTEI() } className="TEIContainer commentary" id={this.props.uri.substr(this.props.uri.indexOf("commentaries/")+13)} />;
			} else { 
				return <div dangerouslySetInnerHTML={ this.returnHTMLizedTEI() } className="TEIContainer other" />;
			}
			// END HACK //
		}
		return <div> Loading TEI... </div>;
	}

	componentDidMount() {
		this.props.fetchTEI(this.props.uri);
	}

	returnHTMLizedTEI() {
		return {__html: this.props.tei.TEI[this.props.uri].innerHTML};
	}

	componentDidUpdate() {
		if(this.props.motif && this.props.uri.indexOf("commentaries")===-1){
			this.scrollToMotif(this.props.motif);

		}
		var mc = this.props.onMotifChange;
		ReactDOM.findDOMNode(this).onclick = function(e){
			var target = e.target;
			if(target && target.className.match(/F[0-9]+/).length){
				mc(target.className.match(/F[0-9]+/)[0]);
			}
		}
		this.props.annotations.map( (annotation) => {
			// each annotation...
			const frags = annotation["oa:hasTarget"].map( (annotationTarget) => {
				// each annotation target
				if(annotationTarget["@id"] in this.props.tei.componentTargets) {
					// if this is my target, grab any of MY fragment IDs
					const myFrags = this.props.tei.componentTargets[annotationTarget["@id"]]
					.filter( (frag) => {;
							return frag.substr(0, frag.indexOf("#")) === this.props.uri;
					});
					if(myFrags.length) {
						// and apply any annotations
						this.handleMELDActions(annotation, myFrags);
					}
				}
			});
		});
	}
		
	handleMELDActions(annotation, fragments) { 
		if("oa:hasBody" in annotation) { 
			annotation["oa:hasBody"].map( (b) => {
				// TODO convert to switch statement
				if(b["@id"] === MARKUP_EMPHASIS) { 
					this.props.handleEmphasis(ReactDOM.findDOMNode(this), annotation, this.props.uri, fragments);
				} else if(b["@id"] === MARKUP_HIGHLIGHT) { 
					this.props.handleHighlight(ReactDOM.findDOMNode(this), annotation, this.props.uri, fragments);
				} else if(b["@id"] === MARKUP_HIGHLIGHT2) { 
					this.props.handleHighlight2(ReactDOM.findDOMNode(this), annotation, this.props.uri, fragments);
				} else if(b["@id"] === CUE_IMAGE) {
					this.props.handleCueImage(ReactDOM.findDOMNode(this), annotation, this.props.uri, fragments, this.props.tei.fragImages);
				}
				else {
					console.log("TEI component unable to handle meld action: ", b);
				}
			});
		}
		else { console.log("Skipping annotation without body: ", annotation) }
	}
}

function mapStateToProps({ tei }) { 
	return { tei }; 
}

function mapDispatchToProps(dispatch) { 
	return bindActionCreators({ fetchTEI, handleEmphasis, handleCueImage, handleHighlight, handleHighlight2 }, dispatch);
}

export default connect(mapStateToProps, mapDispatchToProps)(TEI);

if (!String.prototype.endsWith) {
  String.prototype.endsWith = function(searchString, position) {
      var subjectString = this.toString();
      if (typeof position !== 'number' || !isFinite(position) || Math.floor(position) !== position || position > subjectString.length) {
        position = subjectString.length;
      }
      position -= searchString.length;
      var lastIndex = subjectString.lastIndexOf(searchString, position);
      return lastIndex !== -1 && lastIndex === position;
  };
}
