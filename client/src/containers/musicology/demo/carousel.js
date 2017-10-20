import React, { Component } from 'react';
import App from '../../app';

export default class ForbiddenQuestion extends Component { 
	constructor(props) {
		super(props);
	}
	

	render() { 
		return (
		  <div> 
		  	<link rel="stylesheet" href="../../style/carousel.css" type="text/css" />
		  	<App graphUri="http://meld.linkedmusic.org/annotations/FrageverbotCarousel.json-ld"
				 			motif="F1"/>
      </div>
		);
	}
	
};



