<template>
  <div>
    <JamsByUser :show-replies="true" />
  </div>
</template>

<script>
import JamsByUser from '~/components/profile/JamsByUser'
export default {
  components: { JamsByUser },
}
</script>

<style></style>
