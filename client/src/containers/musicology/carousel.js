import React, { Component } from 'react';
import { connect } from 'react-redux';
import { bindActionCreators} from 'redux';
import Carousel from 'react-3d-carousel';

class MEICarousel extends Component {
    constructor(props) {
        super(props);
        this.state = { 
            score: {},
            width: 400,
            layout: this.props.layout,
            ease: 'linear',
            duration: 400
        };
        this.handleChange = this.handleChange.bind(this);
    }

    /*
    componentWillMount() {
        this.onSides = function (event) {
            this.setState( { images: this.props.images }});
        }.bind(this);
        this.onLayout = function (event) {
            this.setState({layout: event.target.value});
        }.bind(this);
        this.onDuration = function (event) {
            this.setState({duration: parseInt(event.target.value) });
        }.bind(this);
       // this.onEase = function (event) {
       //     this.setState({ease:  event.target.value});
       // }.bind(this);
    }
*/

    render() {
        console.log("Carousel sees :", this.props.score);
        if("MEI" in this.props.score && Object.keys(this.props.score["MEI"]).length ) { 
            return (
                <div className="carouselWrapper">
                    <Carousel width={this.state.width}
                              images={
                                  Object.keys(this.props.score.MEI).map(
                                      (k) => k.replace(".mei", ".svg")
                                  )
                              }
                              motif={this.props.motif}
              								onMotifChange={this.props.onMotifChange}
                              ease={this.state.ease}
                              duration={this.state.duration}
                              layout={this.state.layout}/>
                </div>
            );
        }
        return <div />
    }
}


function mapStateToProps({ score }) {
	return { score };
}

function mapDispatchToProps(dispatch) { 
	return bindActionCreators({ }, dispatch);
}

export default connect(mapStateToProps, mapDispatchToProps)(MEICarousel);
