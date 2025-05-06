import React from 'react'
import { Router, Route, Switch } from 'dva/router'
// import IndexPage from './routes/IndexPage'
import App from './routes/App'
import Film from './routes/Film'
import Cinema from './routes/Cinema'
import Center from './routes/Center'

function RouterConfig({ history }) {
  return (
    <Router history={history}>
      <Switch>
        {/* <Route path="/" exact component={IndexPage} /> */}
        <Route
          path="/"
          render={() => (
            <App>
              <Route path="/film" component={Film} />
              <Route path="/cinema" component={Cinema} />
              <Route path="/center" component={Center} />
            </App>
          )}
        />
      </Switch>
    </Router>
  )
}

export default RouterConfig
