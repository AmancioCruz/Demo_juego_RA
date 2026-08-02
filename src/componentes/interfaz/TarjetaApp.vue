<template>
  <section class="tarjeta-app">
    <slot />
  </section>
</template>

<script setup></script>

<style scoped>
.tarjeta-app {
  border: 1px solid var(--borde);
  border-radius: 18px;
  background: var(--blanco);
  box-shadow: var(--sombra);
}
</style>
