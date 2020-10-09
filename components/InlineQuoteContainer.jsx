const { getModule, http: { get }, constants: { Endpoints }, React } = require('powercord/webpack');
const quote = require('./InlineQuote')
const parser = getModule(["parse", "parseTopic"], false);
//console.log(blockquoteContainer)
let lastFetch;

module.exports = class InlineQuoteContainer extends React.Component {
  constructor (props) {
    super(props);
    this.state = { };
  }
  static getDerivedStateFromProps(props, state) {
     if (!state.new) {
     return { ...Object.assign({}, props) };
     }
     return state
  }
  async componentDidUpdate () {
    //console.log(this.props)
    if (!_.isEqual(this.props.message.content, this.state.message.content)) {
      //console.log('reloading')
      await this.buildQuote()
    }
  }
  async componentDidMount () {
    await this.buildQuote()
  }
  async buildQuote () {
  const MessageC = await getModule(m => m.prototype && m.prototype.getReaction && m.prototype.isSystemDM)
  const { message, cozyMessage, groupStart } = await getModule([ 'cozyMessage' ])
  const { blockquoteContainer } = await getModule([ 'blockquoteContainer' ])
  const { getUser } = await getModule([ 'getCurrentUser' ])
  const { getChannel } = await getModule(['getChannel'])
  const content = [...this.props.content];
  const video_ext = ["avi","flv","m4v","mkv","mov","mp4","mpeg","mpv","webm","wmv","yuv"];
  const image_ext = ['jpg','jpeg','jfif','png','webp'];
  function ext_check (ext, exts) {
    let is_ext = false;
    exts.forEach((ext_) => { if (ext_ == ext) is_ext = true; })
    return is_ext;
  }

  //console.log('building quote')
  content.forEach(async (e, i) => { 
    if (e && e.props) {
    if (e.props.href && (/https?:\/\/((canary|ptb)\.)?discord(app)?\.com\/channels\/(\d{17,19}|@me)\/\d{17,19}\/\d{17,19}/g).test(e.props.href)) {
      const linkArray = e.props.href.split('/');
      const messageData = await this.getMsgWithQueue(linkArray[5], linkArray[6]);

      if (!messageData) return;

      let extras = { raw_content: [], complex_content: [] };

      try {
        messageData?.attachments.forEach((e, i) => {
          const split_dot = e.proxy_url.split('.')
          const ext = split_dot[split_dot.length - 1];

          if (ext_check(ext,image_ext)) extras.raw_content.push({
            type: 'image',
            src: e.proxy_url
          });
          else if (ext_check(ext,video_ext)) extras.raw_content.push({
            type: 'video',
            src: e.proxy_url
          }); 
          else extras.complex_content.push(e);
        })

        messageData?.embeds.forEach((e, i) => {
          if (typeof e.color !== 'string') messageData.embeds[i].color = '#00000000';

          if (e.image) {
            if (e.image.proxyURL) {
              extras.raw_content.push({
                type: 'image',
                src: e.image.proxyURL,
                original: e.image.url
              })
            }
          } else if (e.video) {
            if (e.video.proxyURL) {
              extras.raw_content.push({
                type: 'video',
                src: e.video.proxyURL,
                preview_image: e.thumbnail.proxyURL,
                original: e.video.url
              })
            } else {
              extras.complex_content.push(e)
            }
          } else {
            extras.complex_content.push(e)
          }
        });
      } catch (e) {}

      //msg.message.content = msg.message.content.replace(e.props.href, '')
      content[i] = React.createElement(quote, {
        className: `${message} ${cozyMessage} ${groupStart}`,
        groupId: messageData.id,
        message: new MessageC({ ...messageData }),
        channel: getChannel(messageData.channel_id),
        author: messageData.author,
        content: parser.parse(messageData.content.trim(), true, { channelId: this.props.message.channel_id }),
        extras: extras,
        style: { cursor: "pointer" },
        link: e.props.href
      });
    }

    if (e.props?.className === blockquoteContainer && content[i + 1]?.props?.children?.props?.className.includes('mention')) {
      //msg.message.content = msg.message.content.replace(e.props.href, '')
      const messageData = /(?:> )([\s\S]+)(<@!?(\d+)>)/g.exec(this.props.message.content);
      //console.log(messageData, messageData[1].replace(/\n> /g, ''))
      content[i + 1] = null;
      
      content[i] = React.createElement(quote, {
        className: `${message} ${cozyMessage} ${groupStart}`,
        author: getUser(messageData[3]),
        timestamp: this.props.message.id,
        raw: messageData[1].replace(/\n> /g, '\n').replace(/\n$/g, ''),
        content: parser.parse(messageData[1].replace(/\n> /g, '\n').replace(/\n$/g, '').trim(), true, { channelId: this.props.message.channel_id }),
        channel: getChannel(this.props.message.channel_id)
        //onClick: () => { transitionTo(e.props.href.replace(/https?:\/\/((canary|ptb)\.)?discord(app)?\.com/g, '')); },
        //style: { cursor: "pointer" }
      });
    }
  }});
  this.setState({...this.props, content, oldContent: this.props.content, new: true });
  setTimeout(() => {
    this.forceUpdate()
  }, 500);
}
    // queue based on https://stackoverflow.com/questions/53540348/js-async-await-tasks-queue
    getMsgWithQueue = (() => {
      let pending = Promise.resolve()

      const run = async (channelId, messageId) => {
          try {
              await pending
          } finally {
              return this.getMsg(channelId, messageId)
          }
      }

      return (channelId, messageId) => (pending = run(channelId, messageId))
    })()

  async getMsg (channelId, messageId) {
    const User = await getModule(m => m.prototype && m.prototype.tag)
    const Timestamp = await getModule(m => m.prototype && m.prototype.toDate && m.prototype.month)
    const { getMessage } = await getModule(['getMessages'])
    let message = getMessage(channelId, messageId);

    if (!message) {
      if (lastFetch > Date.now() - 2500) await new Promise(r => setTimeout(r, 2500));
      
      const data = await get({
        url: Endpoints.MESSAGES(channelId),
        query: {
          limit: 1,
          around: messageId
        },
        retries: 2
      });
      lastFetch = Date.now();
      message = data.body.find(m => m.id == messageId);

      if (!message) return;

      message.author = new User(message.author);
      message.timestamp = new Timestamp(message.timestamp);
    }
    return message;
  }

  render () {
    return ( <div key={this.props.content}>{this.state.content}</div> )
  }
};
