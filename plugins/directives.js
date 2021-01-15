'use strict'

import Vue from 'vue'
import linkifyStr from 'linkifyjs/string'

const EmojiConvertor = require('emoji-js')
const emoji = new EmojiConvertor()
emoji.img_set = 'twitter'
emoji.replace_mode = 'css'

Vue.directive('linkify', {
  update: (el, binding) => {
    const linkified = linkifyStr(binding.value, {
      //   defaultProtocol: 'https', // TODO production enable https
      target: {
        mention: '_parent',
        hashtag: '_parent',
        url: '_blank',
        email: '_blank',
      },
      nl2br: true,
      formatHref(href, type) {
        if (type === 'mention') {
          return `#${href}`
        } else if (type === 'hashtag') {
          return `#/tags/${href.substr(1)}`
        } else return href
      },
    })
    el.innerHTML = emoji.replace_colons(linkified)
  },
})
