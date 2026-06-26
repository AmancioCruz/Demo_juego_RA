<script setup>
import menuNavegacion from '@/componentes/MenuNavegacion.vue'
</script>

<template>
  <main class="pantalla">
    <section>
      <RouterView />
    </section>

    <menuNavegacion></menuNavegacion>
  </main>
</template>
