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
  },
})
