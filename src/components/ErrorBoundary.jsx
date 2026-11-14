import { Component } from "react";

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { err: false };
  }
  static getDerivedStateFromError() {
    return { err: true };
  }
  render() {
    if (this.state.err) {
      return (
        <div
          style={{
            minHeight: "60vh",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "#e8dcc4",
            fontFamily: "system-ui, sans-serif",
          }}
        >
          Something went wrong — please refresh the page.
        </div>
      );
    }
    return this.props.children;
  }
}
