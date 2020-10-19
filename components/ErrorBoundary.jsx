const { getModule, React } = require('powercord/webpack');
const { clipboard } = getModule([ 'clipboard' ], false);

class ErrorBoundary extends React.PureComponent {
  constructor (props) {
    super(props);
    this.state = { hasError: false,
      error: null };
  }

  componentDidCatch (error) {
    console.error(error);

    let errorString = error.stack.substring(0, 2000 - 36);
    if (errorString.length === 2000 - 36) {
      errorString += '...';
    }
    clipboard.copy(
      `<@373833473091436546>\n\`\`\`js\n${errorString}\n\`\`\``
    );

    this.setState({ hasError: true,
      error });

    if (typeof this.props.onError === 'function') {
      this.props.onError(err);
    }
  }

  render () {
    if (this.state.hasError) {
      return (
        <div>
          <div className = 'colorStandard-2KCXvj size14-e6ZScH'>
                    An error occurred while rendering this element.
            {'\n'}
                    The error message has been copied to your clipboard.
            {'\n'}
                    Send it to AAGaming in the Powercord server for support.
            {'\n'}    Full error:

          </div>
          <pre>
            <code>
              {this.state.error.stack.substring(0, 2000 - 36)}
            </code>
          </pre>
        </div>
      );
    }
    return this.props.children;
  }
}

module.exports = ErrorBoundary;
