import React, { Component } from 'react';
import ReactDOM from 'react-dom';

export default class MyImage extends Component { 
	constructor(props) { 
		super(props);
		this.state = {
			positions: {}
		}
	    this.handleClick = this.handleClick.bind(this);
	}

	render() { 
		return (
			<img src={this.props.uri} onClick={this.handleClick}/>
		)
	}

    handleClick() {
        let fullFatImage = this.props.uri;
        fullFatImage = fullFatImage.replace("_thumb", "");
        console.log("Thumb:", this.props.uri, "Full fat: ", fullFatImage);
        window.open(fullFatImage);
    }
}

