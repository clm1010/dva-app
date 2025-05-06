import React, { Component } from 'react'

export default class App extends Component {
  render() {
    return (
      <div>
        App
        {this.props.children}
      </div>
    )
  }
}
