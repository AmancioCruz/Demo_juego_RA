<script setup>
import MenuNavegacion from '@/componentes/navegacion/MenuNavegacion.vue'
</script>

<template>
  <div class="pantalla-principal">
    <main>
      <RouterView />
    </main>
    <MenuNavegacion />
  </div>
</template>

<style scoped>
.pantalla-principal {
  min-height: 100vh;
}
</style>
