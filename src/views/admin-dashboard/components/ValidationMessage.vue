<template>
  <p v-if="message" :id="id" class="validation-message">{{ message }}</p>
</template>

<script>
export default { name: 'ValidationMessage', props: { id: String, message: String } };
</script>

<style scoped>
.validation-message { color: #9b251d; font-size: 12px; line-height: 1.5; margin: -6px 0 12px; overflow-wrap: anywhere; }
</style>
