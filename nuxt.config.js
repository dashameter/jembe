export default {
  server: {
    // Enable to access on mobile via local network
    // host: '0.0.0.0',
  },
  env: {
    NAME_LABEL: process.env.NUXT_JEMBE_NAME_LABEL || '',
    NAME_IDENTITY: process.env.NUXT_JEMBE_NAME_IDENTITY || '',
    NAME_USERID: process.env.NUXT_JEMBE_NAME_USERID || '',
    MNEMONIC: process.env.NUXT_JEMBE_MNEMONIC || null,
    IDENTITYID: process.env.NUXT_JEMBE_IDENTITYID || null,
    JEMBE_CONTRACT_ID:
      process.env[`NUXT_JEMBE_CONTRACT_ID_${process.env.NUXT_ENV_RUN}`] ||
      'DfprkeWZ9BkXUgbfsHVKpgEMetUsPQMYEBQyaQcrnfXD',
    PRIMITIVES_CONTRACT_ID:
      process.env[`NUXT_PRIMITIVES_CONTRACT_ID_${process.env.NUXT_ENV_RUN}`] ||
      'J2jZkuK53qXQybna2UUYTHGA48XKRWFucyhi6cLk3foc',
    DIRECTMESSAGE_CONTRACT_ID:
      process.env[
        `NUXT_DIRECTMESSAGE_CONTRACT_ID_${process.env.NUXT_ENV_RUN}`
      ] || '1cJrmi1UNYUCeBuMQPZEdMNtP3MQwMGH2rEKRvHNojS',
    DATASTORE_CONTRACT_ID:
      process.env[`NUXT_DATASTORE_CONTRACT_ID_${process.env.NUXT_ENV_RUN}`] ||
      'CCRiZKKkCJyM7PzVyMBwGwUMQV1R2fYTHrE6N9Gw8UqL',
    STAY_LOGGED_IN: !!process.env.NUXT_JEMBE_STAY_LOGGED_IN,
    DAPIADDRESSES: process.env.NUXT_DAPIADDRESSES
      ? JSON.parse(process.env.NUXT_DAPIADDRESSES)
      : undefined,
    DPNS: process.env.NUXT_DPNS_CONTRACT_ID
      ? { contractId: process.env.NUXT_DPNS_CONTRACT_ID }
      : undefined,
  },
  mode: 'spa',
  router: {
    mode: 'hash',
  },
  pwa: {
    manifest: {
      name: 'Jembe',
      short_name: 'Jembe',
      description: 'everyone gather together in peace',
      lang: 'en',
      background_color: '#008de4',
      theme_color: '#787878',
      display: 'standalone',
      orientation: 'portrait-primary',
    },
  },

  /*
   ** Headers of the page
   */
  head: {
    titleTemplate: '%s - ' + 'Jembe',
    title: 'Jembe',
    meta: [
      { charset: 'utf-8' },
      {
        name: 'viewport',
        content:
          'user-scalable=no, width=device-width, initial-scale=1.0, maximum-scale=1,minimal-ui',
      },
      {
        name: 'apple-mobile-web-app-capable',
        content: 'yes',
      },
      {
        hid: 'description',
        name: 'description',
        content: process.env.npm_package_description || '',
      },
    ],
    link: [
      { rel: 'icon', type: 'image/x-icon', href: '/favicon.ico' },
      {
        rel: 'stylesheet',
        href:
          'https://fonts.googleapis.com/css2?family=Montserrat&family=Open+Sans&family=Roboto&display=swap',
      },
    ],
  },
  /*
   ** Customize the progress-bar color
   */
  loading: { color: '#fff' },
  /*
   ** Global CSS
   */
  css: [],
  /*
   ** Plugins to load before mounting the App
   */
  plugins: [
    { src: '~/plugins/timeago.js' },
    '~/plugins/directives.js',
    '~/plugins/filters.js',
  ],

  // TODO enable plugin: { src: '~/plugins/localStorage.js', ssr: false }
  /*
   ** Nuxt.js dev-modules
   */
  buildModules: [
    // Doc: https://github.com/nuxt-community/eslint-module
    '@nuxtjs/eslint-module',
    '@nuxtjs/vuetify',
    '@nuxtjs/dotenv',
  ],
  /*
   ** Nuxt.js modules
   */
  modules: [
    // Doc: https://axios.nuxtjs.org/usage
    '@nuxtjs/axios',
    '@nuxtjs/pwa',
  ],
  /*
   ** Axios module configuration
   ** See https://axios.nuxtjs.org/options
   */
  axios: {},
  /*
   ** vuetify module configuration
   ** https://github.com/nuxt-community/vuetify-module
   */
  vuetify: {
    customVariables: ['~/assets/variables.scss'],
    optionsPath: './vuetify.options.js',
    treeShake: true,
  },
  /*
   ** Build configuration
   */
  build: {
    /*
     ** You can extend webpack config here
     */
    extend(config, ctx) {
      if (ctx.isDev) {
        config.devtool = ctx.isClient ? 'source-map' : 'inline-source-map'
      }
      // if (ctx.isDev && ctx.isClient) {
      //   config.module.rules.push({
      //     enforce: 'pre',
      //     test: /\.(js|vue)$/,
      //     loader: 'eslint-loader',
      //     exclude: /(node_modules)/,
      //     options: { fix: true }
      //   })
      // }
      config.node = {
        fs: 'empty',
      }
    },
  },
}
