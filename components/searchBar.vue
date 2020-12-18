<template>
  <div>
    <!-- search bar column -->
    <!-- :width="searchBarWidth" -->
    <!-- auto-select-first
      class="mx-auto"
      style="
        font-size: 1.6rem;
        font-weight: 700;
        padding-top: 0.5em;
        padding-bottom: 0.5em;
      " -->
    <v-autocomplete
      :value="searchVal"
      :loading="loading"
      :items="items"
      :search-input.sync="search"
      auto-select-first
      label="Search tags, user profiles .."
      width="350px"
      height="20px"
      flat
      rounded
      filled
      color="#008de4"
      dense
      prepend-inner-icon="mdi-magnify"
      class="pt-4 pr-4 pl-4"
      hide-no-data
      @input="processSearchResultSelection($event)"
    ></v-autocomplete>
  </div>
</template>

<script>
import { mapActions } from 'vuex'

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

export default {
  // props: { searchBarWidth: { type: String, default: '300px' } },
  data() {
    return {
      searchVal: '',
      search: null,
      tagitems: [],
      profileitems: [],
      loading: false,
      searchDebounceTime: 0,
      searchDebounceNonce: 0,
    }
  },
  computed: {
    items() {
      let items = []

      if (this.tagitems.length > 0) {
        items = items.concat({ header: `Tags` }, ...this.tagitems)
      }

      if (this.profileitems.length > 0) {
        items = items.concat({ header: `Profiles` }, ...this.profileitems)
      }
      return items
    },
  },
  watch: {
    async search(searchVal) {
      const debounceMS = 200

      this.searchDebounceTime = Date.now() + debounceMS

      await sleep(debounceMS)

      const nonce = Date.now()

      // If a new search was started within debounceMS, do nothing, expiring current search
      if (this.searchDebounceTime <= nonce) {
        console.log('init search value :>> ', searchVal)
        console.log('current search value :>> ', this.searchVal)
        console.log(
          'this.executeSearch(val) :>> ',
          this.executeSearch(searchVal)
        )
        const curVal = this.searchVal ? this.searchVal : null
        console.log('curVal :>> ', curVal)
        searchVal &&
          searchVal !== curVal &&
          (await this.executeSearch(searchVal, nonce))
      } else {
        console.log('search has been called within debounceMS')
        console.log('this.searchDebounceTime :>> ', this.searchDebounceTime)
      }
    },
  },
  methods: {
    ...mapActions(['searchTags', 'searchJembeNames']),
    async searchTagsWrapper(searchVal, nonce) {
      const searchResults = (await this.searchTags(searchVal)).map((x) =>
        x.toJSON()
      )
      console.log('searchResults :>> ', searchResults)

      // If a larger nonce was set since the async search call, this request is stale -> end function execution
      if (nonce < this.searchDebounceNonce) return

      const dedupedTagResults = {}

      searchResults.forEach((tag) => {
        dedupedTagResults[tag.tag] = tag.tag
      })

      console.log('dedupedTagResults :>> ', dedupedTagResults)

      const results = Object.keys(dedupedTagResults)

      const tags = results.map((val) => {
        return { text: `#${val}`, value: `${val}\x01tag`, type: 'tag' }
      })

      this.tagitems = this.tagitems.concat(tags) // FIXME don't add tags already existing in tagitems
    },
    async searchProfilesWrapper(searchVal, nonce) {
      const searchResults = (await this.searchJembeNames(searchVal)).map((x) =>
        x.toJSON()
      )
      console.log('searchResults :>> ', searchResults)

      // If a larger nonce was set since the async search call, this request is stale -> end function execution
      if (nonce < this.searchDebounceNonce) return

      const tags = searchResults.map((val) => {
        return {
          text: `${val.label}`,
          value: `${val.normalizedLabel}\x01profile`,
          type: 'profile',
        }
      })

      this.profileitems = this.profileitems.concat(tags) // FIXME don't add tags already existing in tagitems
    },
    async executeSearch(searchVal, nonce) {
      if (!searchVal) return

      // If a larger nonce was set since this function was called, this request is stale -> end function execution
      if (nonce < this.searchDebounceNonce) return

      this.searchDebounceNonce = nonce

      this.loading = true

      const searchPromises = []

      searchPromises.push(this.searchTagsWrapper(searchVal, nonce))

      searchPromises.push(this.searchProfilesWrapper(searchVal, nonce))

      await Promise.all(searchPromises)

      this.loading = false
    },
    processSearchResultSelection(event) {
      console.log('event :>> ', event)

      const [searchResult, type] = event.split('\x01')

      console.log('searchVal, type :>> ', searchResult, type)

      this.searchVal = {} // Reset autocomplete input

      if (type === 'tag') {
        this.$router.push('/tags/' + searchResult)
      } else if (type === 'profile') {
        this.$router.push('/' + searchResult)
      }
    },
  },
}
</script>
