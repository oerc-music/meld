import React, { Component } from 'react';
import ReactDOM from 'react-dom'
import { connect } from 'react-redux';
import { bindActionCreators} from 'redux';
import { fetchRibbonContent } from '../actions/index';

import InlineSVG from 'svg-inline-react';

class OrchestralRibbon extends Component {
  render(){
    if(Object.keys(this.props.score).length) {
			return <InlineSVG className="score" src={ this.props.score["MEI"][this.props.uri] } />;
		}
		return <div>Loading...</div>;
  }
  componentDidMount(){
    this.props.fetchRibbonContent(this.props.uri);
  }

}


function mapStateToProps({ score }) {
	return { score };
}

function mapDispatchToProps(dispatch) {
	return bindActionCreators({ fetchRibbonContent }, dispatch);
}

export default connect(mapStateToProps, mapDispatchToProps)(OrchestralRibbon);
