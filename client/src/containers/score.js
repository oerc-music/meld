import React, { Component } from 'react';
import ReactDOM from 'react-dom'
import { connect } from 'react-redux';
import { bindActionCreators} from 'redux';
import { fetchScore, scoreNextPage, HAS_BODY, HAS_TARGET } from '../actions/index';
import { 
	MARKUP_EMPHASIS, 
	handleEmphasis,
	MARKUP_HIGHLIGHT,
	handleHighlight,  
	MARKUP_HIGHLIGHT2,
	handleHighlight2,  
	CUE_AUDIO, 
	handleCueAudio,
	handleQueueNextSession,
	handleIdentifyMuzicode,
	handleChoiceMuzicode,
	handleChallengePassed,
	handleDisklavierStart
} from '../actions/meldActions';


import InlineSVG from 'svg-inline-react';


class Score extends Component { 
	constructor(props) { 
		super(props);

		this.state = { 
			score: {},
            annotations:{}
		};
	}

	render() {
		if(Object.keys(this.props.score).length) { 
			return (
				<div id={this.props.uri} className="scorepane">
					<div className="controls" />
					<div className="annotations" />
					<InlineSVG className="score" src={ this.props.score["SVG"][this.props.uri] } />
				</div>
			);
		}
		return <div>Loading...</div>;
	}

	componentDidMount() { 
		this.props.fetchScore(this.props.uri);
	}

	componentDidUpdate() {
		let annotations = this.props.annotations;
		if(!Array.isArray(annotations)) { 
			annotations = [annotations]
		}
		console.log("annotations:", annotations)
		if(annotations.length && typeof annotations[0] !== "undefined" && "@type" in annotations[0] && annotations[0]["@type"].includes("meldterm:topLevel")) { 
			console.log("Found old Larry-meld style topLevel annotation, converting...")
			annotations = annotations[0]["oa:hasBody"]
		}
		annotations.map( (annotation) => {
			console.log("annotation is: ", annotation)
			if(typeof annotation === 'undefined') { return }
			// each annotation...
			const frags = annotation["oa:hasTarget"].map( (annotationTarget) => { 
				// each annotation target
				if(annotationTarget["@id"] in this.props.score.componentTargets) {
                    // if this is my target, grab frag ids according to media type
                    const mediaTypes = Object.keys(this.props.score.componentTargets[annotationTarget["@id"]]);
                    let myFrags = {};
                    mediaTypes.map( (type) => {
                        if(type === "MEI") { 
                            // only grab MY frag IDs, for THIS mei file
                            myFrags[type] = this.props.score.componentTargets[annotationTarget["@id"]][type].filter( (frag) => {
                                return frag.substr(0, frag.indexOf("#")) === this.props.uri;
                            })
                        } else {
                           //TODO think about what to do here to filter (e.g. multiple audios) 
                            myFrags[type] = this.props.score.componentTargets[annotationTarget["@id"]][type]; 
                        }
                    });
                    // and apply any annotations
                    this.handleMELDActions(annotation, myFrags);
				} else if(annotationTarget["@id"] == this.props.session) { 
					// this annotation applies to the *session*, e.g. a page turn
					this.handleMELDActions(annotation, null);
				} 
			});
		});
			
	}

	handleMELDActions(annotation, fragments) { 
		console.log("HANDLING MELD ACTION: ", annotation, fragments);
		if(HAS_BODY in annotation) { 
			annotation[HAS_BODY].map( (b) => {
				// TODO convert to switch statement
				if(b["@id"] === MARKUP_EMPHASIS) { 
					this.props.handleEmphasis(ReactDOM.findDOMNode(this), annotation, this.props.uri, fragments["MEI"]);
				} else if(b["@id"] === MARKUP_HIGHLIGHT) { 
					this.props.handleHighlight(ReactDOM.findDOMNode(this), annotation, this.props.uri, fragments["MEI"]);
				} else if(b["@id"] === MARKUP_HIGHLIGHT2) { 
					this.props.handleHighlight2(ReactDOM.findDOMNode(this), annotation, this.props.uri, fragments["MEI"]);
				}  else if(b["@id"] === CUE_AUDIO) { 
					this.props.handleCueAudio(ReactDOM.findDOMNode(this), annotation, b, this.props.uri, fragments);
				} else {
					console.log("Score component unable to handle meld action: ", b);
				}
			});
		}
		// FIXME: the above should be phased out as we move into
		// using motivations instead of bodies for rendering instructions
		else if("oa:motivatedBy" in annotation) { 
			switch(annotation["oa:motivatedBy"]["@id"]) { 
			case "oa:highlighting":
				this.props.handleHighlight(ReactDOM.findDOMNode(this), annotation, this.props.uri, fragments["MEI"]);
			break;
			case "motivation:muzicodeIdentify":
				this.props.handleIdentifyMuzicode(ReactDOM.findDOMNode(this), annotation, this.props.uri, fragments["MEI"]);
			break;
			case "motivation:muzicodeChoice":
				this.props.handleChoiceMuzicode(ReactDOM.findDOMNode(this), annotation, this.props.uri, fragments["MEI"]);
			break;
			case "motivation:muzicodeChallengePassed":
				this.props.handleChallengePassed(ReactDOM.findDOMNode(this), annotation, this.props.uri, fragments["MEI"]);
			break;
			case "motivation:muzicodeDisklavierStart":
				this.props.handleDisklavierStart(ReactDOM.findDOMNode(this), annotation, this.props.uri, fragments["MEI"]);
			break;
			case "motivation:nextPageOrPiece":	
				console.log("----", this.props);
				this.props.scoreNextPage(this.props.session, this.props.nextSession, this.props.etag, annotation, this.props.uri, this.props.score.pageNum, this.props.score.MEI[this.props.uri]);
			break;
			case "motivation:queueNextSession":
				this.props.handleQueueNextSession(this.props.session, this.props.etag, annotation);
			break;
			default:
				console.log("Unknown motivation: ", annotation["oa:motivatedBy"]);
			}
		} else { console.log("Skipping annotation without rendering instructions: ", annotation) }
	}
}

function mapStateToProps({ score }) {
	return { score };
}

function mapDispatchToProps(dispatch) { 
	return bindActionCreators({ fetchScore, handleEmphasis, handleHighlight, handleHighlight2, handleCueAudio, scoreNextPage, handleQueueNextSession, handleIdentifyMuzicode, handleChoiceMuzicode, handleChallengePassed, handleDisklavierStart}, dispatch);
}

export default connect(mapStateToProps, mapDispatchToProps)(Score);
