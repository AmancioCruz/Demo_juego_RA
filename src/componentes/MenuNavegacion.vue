<template>
  <nav class="menu">
    <RouterLink to="/inicio">
      <span>Inicio</span>
    </RouterLink>

    <RouterLink to="/album">
      <span>Album</span>
    </RouterLink>

    <RouterLink to="/perfil">
      <span>Perfil</span>
    </RouterLink>

    <RouterLink to="/escanear">
      <span>Escanear</span>
    </RouterLink>
  </nav>
</template>

<style scoped>
.menu {
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: space-evenly;
}
</style>
