// http://notjoshmiller.com/ajax-polling-in-react-with-redux/

import React, {Component} from 'react';  
import {connect} from 'react-redux';  
import {bindActionCreators} from 'redux';  
import * as dataActions from '../actions/dataActions';

const uri = "http://meld.linkedmusic.org/mei/test.mei"

// Which part of the Redux global state does our component want to receive as props?   
function mapStateToProps({foo}) {  
    return { foo };
}

// Which action creators does it want to receive by props?       
function mapDispatchToProps(dispatch) {  
    return {
        dataActions: bindActionCreators(dataActions, dispatch)
    };
}

class Foo extends Component {  
    componentWillReceiveProps(nextProps) {
        if (this.props.foo.data !== nextProps.foo.data) {

            //clearTimeout(this.timeout);

            // Optionally do something with data
            console.log("Fetching data...");
        }
		this.startPoll();


    }

    componentWillMount() {
		this.startPoll();
    }

    //componentWillUnmount() {
    //    clearTimeout(this.timeout);
    //}

    startPoll() {
		console.log("starting poll")
        setTimeout(() => this.props.dataActions.dataFetch(uri), 500);
    }

	render() { 
		if(this.props.foo.data) { 
			return <div>{this.props.foo.data}</div>
		}
		else { 
			return <div>Waiting...</div>
		}
	}
}

export default connect(mapStateToProps, mapDispatchToProps)(Foo);
