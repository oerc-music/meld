import React, { Component } from 'react';
import App from '../app';

export default class ForbiddenQuestion extends Component { 
	constructor(props) {
		super(props);
	}
	

	render() { 
		return (
		  <div> 
		  	<link rel="stylesheet" href="../../style/forbiddenQuestion.css" type="text/css" />
		  	<App foo="bar" graphUri={ this.props.location.query.annotations } />
      </div>
		);
	}
	
};



