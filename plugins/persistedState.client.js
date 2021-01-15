import createPersistedState from 'vuex-persistedstate'

export default ({ store }) => {
  createPersistedState({
    key: 'vuex',
    paths: ['mnemonic', 'name'],
    // storage: window.sessionStorage,
  })(store)
}
