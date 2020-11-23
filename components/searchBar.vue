<template>
  <div>
    <!-- search bar column -->
    <!-- :width="searchBarWidth" -->
    <v-text-field
      width="350px"
      height="20px"
      flat
      rounded
      filled
      color="#008de4"
      dense
      prepend-inner-icon="mdi-magnify"
      class="pt-4 pr-4 pl-4"
    >
    </v-text-field>
  </div>
</template>

<script>
export default {
  // props: { searchBarWidth: { type: String, default: '300px' } },
}
</script>
