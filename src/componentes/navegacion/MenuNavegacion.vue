<script setup>
const enlaces = [
  {
    ruta: '/',
    etiqueta: 'Inicio',
    icono:
      'M3 10.8 12 3l9 7.8v8.7a1.5 1.5 0 0 1-1.5 1.5H15v-6H9v6H4.5A1.5 1.5 0 0 1 3 19.5z',
  },
  {
    ruta: '/album',
    etiqueta: 'Album',
    icono:
      'M5 4.5h14A1.5 1.5 0 0 1 20.5 6v12A1.5 1.5 0 0 1 19 19.5H5A1.5 1.5 0 0 1 3.5 18V6A1.5 1.5 0 0 1 5 4.5Zm2.5 3v4h4v-4zm6 0v4h4v-4zm-6 6v3h10v-3z',
  },
  {
    ruta: '/escanear',
    etiqueta: 'Escanear',
    principal: true,
    icono:
      'M4 7h3l1.4-2h7.2L17 7h3a1.5 1.5 0 0 1 1.5 1.5v9A1.5 1.5 0 0 1 20 19H4a1.5 1.5 0 0 1-1.5-1.5v-9A1.5 1.5 0 0 1 4 7Zm8 10a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z',
  },
  {
    ruta: '/perfil',
    etiqueta: 'Perfil',
    icono:
      'M12 12.5a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm-7 7a7 7 0 0 1 14 0z',
  },
]
</script>

<template>
  <nav class="menu-navegacion" aria-label="Navegacion principal">
    <RouterLink
      v-for="enlace in enlaces"
      :key="enlace.ruta"
      :to="enlace.ruta"
      class="enlace-menu"
      :class="{ 'enlace-menu--principal': enlace.principal }"
    >
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path :d="enlace.icono" />
      </svg>
      <small>{{ enlace.etiqueta }}</small>
    </RouterLink>
  </nav>
</template>

<style scoped>
.menu-navegacion {
  position: fixed;
  z-index: 20;
  right: 14px;
  bottom: 14px;
  left: 14px;
  height: 70px;
  padding: 8px;
  border: 1px solid rgba(219, 230, 240, 0.9);
  border-radius: 22px;
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  background: rgba(255, 255, 255, 0.96);
  box-shadow: var(--sombra-fuerte);
  backdrop-filter: blur(14px);
}

.enlace-menu {
  min-width: 0;
  border-radius: 16px;
  display: grid;
  place-items: center;
  align-content: center;
  gap: 3px;
  color: var(--texto-suave);
  font-weight: 900;
  transition:
    color 0.16s ease,
    background 0.16s ease,
    transform 0.16s ease;
}

.enlace-menu:active {
  transform: scale(0.97);
}

.enlace-menu svg {
  width: 18px;
  height: 18px;
  fill: currentColor;
}

.enlace-menu small {
  font-size: 0.68rem;
}

.enlace-menu.router-link-active {
  color: #fff;
  background: var(--azul);
}

.enlace-menu--principal {
  color: var(--rojo);
}

.enlace-menu--principal.router-link-active {
  background: var(--rojo);
}
</style>
