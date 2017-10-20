import React, { Component } from 'react';
import App from '../app';

function ensureURI(motif){
	if(motif.indexOf('http://')>-1 || motif.indexOf('https://')>-1){
		return motif;
	} else {
		return 'http://meld.linkedmusic.org/annotations/'+motif+'.json-ld';
	}
}
function ensureURIs(list){
	return list.map(ensureURI);
}
export default class ForbiddenQuestion extends Component { 
	constructor(props) {
		super(props);
	}
	

	render() { 
		var motifs = ['http://meld.linkedmusic.org/annotations/Frageverbot1.json-ld'];
		if(this.props.location.query.motif){
			if(typeof(this.props.location.query.motif)==='string'){
				motifs = [ensureURI(this.props.location.query.motif)];
			} else if(this.props.location.query.motif.length===2) {
				motifs = ensureURIs(this.props.location.query.motif);
				return (
				  <div class="twins"> 
				  	<link rel="stylesheet" href="../../style/forbiddenQuestion.css" type="text/css" />
						<link rel="stylesheet" href="../../style/double.css" type="text/css" />
				  	<App graphUri={'http://meld.linkedmusic.org/annotations/double-demo.json-ld'}/>
		      </div>
				);
			} else {
				motifs = ensureURIs(this.props.location.query.motif);
			}
		}
		return (
		  <div> 
		  	<link rel="stylesheet" href="../../style/forbiddenQuestion.css" type="text/css" />
		  	<App graphUri={motifs[0]} />
      </div>
		);
	}
	
};



