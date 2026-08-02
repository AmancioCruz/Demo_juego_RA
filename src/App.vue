<script setup>
import PantallaPrincipal from '@/componentes/pantalla/PantallaPrincipal.vue'
</script>

<template>
  <PantallaPrincipal />
</template>

<style>
:root {
  color: #102f53;
  background: #f3f7fb;
  font-family: Inter, ui-rounded, 'Segoe UI', system-ui, sans-serif;
  font-synthesis: none;
  --azul: #0057a8;
  --azul-oscuro: #003f7d;
  --azul-claro: #e7f2ff;
  --rojo: #d71920;
  --rojo-claro: #fde8ea;
  --amarillo: #ffd23f;
  --texto: #102f53;
  --texto-suave: #637486;
  --borde: #dbe6f0;
  --fondo: #f3f7fb;
  --blanco: #ffffff;
  --sombra: 0 10px 24px rgba(12, 57, 101, 0.08);
  --sombra-fuerte: 0 16px 36px rgba(12, 57, 101, 0.14);
}

* {
  box-sizing: border-box;
}

html {
  background: var(--fondo);
}

body {
  min-width: 320px;
  min-height: 100vh;
  margin: 0;
  overflow-x: hidden;
}

button,
input {
  font: inherit;
}

button {
  cursor: pointer;
}

button:disabled {
  cursor: not-allowed;
  opacity: 0.68;
}

a {
  color: inherit;
  text-decoration: none;
}

a:focus-visible,
button:focus-visible,
input:focus-visible {
  outline: 3px solid rgba(215, 25, 32, 0.35);
  outline-offset: 3px;
}

h1,
h2,
h3,
p {
  margin-top: 0;
}

img,
svg {
  max-width: 100%;
}

#app {
  min-height: 100vh;
}

.contenedor-vista {
  width: min(100%, 720px);
  margin: 0 auto;
  padding: 20px 16px 108px;
}

.encabezado-vista {
  margin-bottom: 18px;
}

.encabezado-vista h1 {
  margin-bottom: 6px;
  color: var(--texto);
  font-size: clamp(1.65rem, 7vw, 2.2rem);
  line-height: 1.08;
  letter-spacing: 0;
}

.encabezado-vista p {
  margin-bottom: 0;
  color: var(--texto-suave);
  font-size: 0.95rem;
  line-height: 1.45;
}

.etiqueta {
  margin-bottom: 6px;
  color: var(--rojo);
  font-size: 0.72rem;
  font-weight: 900;
  text-transform: uppercase;
}

.barra-progreso {
  height: 10px;
  overflow: hidden;
  border-radius: 999px;
  background: #dde9f4;
}

.barra-progreso span {
  display: block;
  height: 100%;
  border-radius: inherit;
  background: linear-gradient(90deg, var(--azul), var(--rojo));
  transition: width 0.25s ease;
}

@media (min-width: 680px) {
  .contenedor-vista {
    padding-right: 20px;
    padding-left: 20px;
  }
}
</style>
