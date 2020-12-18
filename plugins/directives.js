'use strict'

import Vue from 'vue'
import linkifyStr from 'linkifyjs/string'

Vue.directive('linkify', {
  update: (el, binding) => {
    el.innerHTML = linkifyStr(binding.value, {
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
  },
})
