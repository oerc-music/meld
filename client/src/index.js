import React, { Component }  from 'react';
import ReactDOM from 'react-dom';
import { Provider } from 'react-redux';
import { createStore, applyMiddleware } from 'redux';
import thunk from 'redux-thunk';
import ReduxPromise from 'redux-promise';
import { Router, Route, browserHistory } from 'react-router'

import App from './containers/app';
import Jam from './containers/jam';
import Climb from './containers/climb';
import ClimbArchive from './containers/climbArchive';
import ForbiddenQuestion from './containers/musicology/forbiddenQuestion';
import Rheingold from './containers/musicology/rheingold';
import Carousel from './containers/musicology/demo/carousel';
import reducers from './reducers';

const createStoreWithMiddleware = applyMiddleware(thunk, ReduxPromise)(createStore);

ReactDOM.render(
	<Provider store={createStoreWithMiddleware(reducers)}>
		<Router history={browserHistory}> 
			<Route path="/" component={App} />
			<Route path="/jam" component={Jam} />
			<Route path="/Climb" component={Climb} />
			<Route path="/ClimbArchive" component={ClimbArchive} />
			<Route path="/Demo/Rheingold" component={Rheingold}/>
			<Route path="/TimeMachine" component={Carousel}/>
			<Route path="/ForbiddenQuestion" component={ForbiddenQuestion}/>
		</Router>
	</Provider>
	, document.querySelector('.container'));
