import Vue from 'vue'
import linkifyStr from 'linkifyjs/string'

Vue.filter('linkifyme', {
  read(val) {
    console.log('val :>> ', val)
    const linkified = linkifyStr(val, {
      //   defaultProtocol: 'https', // TODO production enable https
      target: {
        mention: '_parent',
        hashtag: '_parent',
        url: '_blank',
        email: '_blank',
      },
      nl2br: true,
      attributes: {},
      events: {
        click(e) {
          alert('Link clicked!')
        },
      },
      formatHref(href, type) {
        if (type === 'mention') {
          return `#${href}`
        } else if (type === 'hashtag') {
          return `#/${href}`
        } else return href
      },
    })
    console.log('linkified :>> ', linkified)
    return linkified
  },
})
