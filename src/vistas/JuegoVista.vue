<script setup>
import { computed, ref } from 'vue'
import { RouterLink, useRoute } from 'vue-router'
import { useAlbumStore } from '@/stores/album'
import JuegoLapizAr from '@/componentes/ar/JuegoLapizAr.vue'
import BotonApp from '@/componentes/interfaz/BotonApp.vue'
import TarjetaApp from '@/componentes/interfaz/TarjetaApp.vue'

const route = useRoute()
const album = useAlbumStore()
const sticker = computed(() => album.obtenerStickerPorId(route.params.id))
const juegoIniciado = ref(false)

function iniciarJuego() {
  juegoIniciado.value = true
}
</script>

<template>
  <div class="contenedor-vista vista-juego">
    <template v-if="sticker">
      <header class="encabezado-vista">
        <p class="etiqueta">Minijuego AR</p>
        <h1>{{ sticker.juego.titulo }}</h1>
        <p>{{ sticker.juego.descripcion }}</p>
      </header>

      <TarjetaApp v-if="!sticker.desbloqueado" class="juego-bloqueado">
        <h2>Sticker bloqueado</h2>
        <p>Escanea el codigo desde Inicio para abrir esta actividad.</p>
        <RouterLink to="/">Ir a inicio</RouterLink>
      </TarjetaApp>

      <section v-else-if="!juegoIniciado" class="presentacion-juego">
        <div class="sticker-previo">
          <img :src="sticker.imagen" :alt="`Sticker ${sticker.nombre}`" />
        </div>

        <TarjetaApp class="tarjeta-presentacion">
          <div class="icono-juego">
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M8 5v14l11-7z" />
            </svg>
          </div>
          <h2>Listo para jugar</h2>
          <p>Toca 20 lapices en la camara para completar la actividad.</p>
          <BotonApp bloque @click="iniciarJuego">Jugar</BotonApp>
        </TarjetaApp>
      </section>

      <JuegoLapizAr v-else :sticker="sticker" />
    </template>

    <TarjetaApp v-else class="juego-bloqueado">
      <h1>Juego no encontrado</h1>
      <RouterLink to="/album">Volver al album</RouterLink>
    </TarjetaApp>
  </div>
</template>

<style scoped>
.vista-juego {
  display: grid;
  gap: 14px;
}

.juego-bloqueado {
  padding: 18px;
}

.juego-bloqueado p {
  color: var(--texto-suave);
  line-height: 1.45;
}

.juego-bloqueado a {
  min-height: 44px;
  padding: 0 14px;
  border-radius: 12px;
  display: inline-grid;
  place-items: center;
  color: #fff;
  background: var(--azul);
  font-weight: 900;
}

.presentacion-juego {
  display: grid;
  gap: 16px;
}

.sticker-previo {
  min-height: 330px;
  padding: 26px;
  border-radius: 28px;
  display: grid;
  place-items: center;
  background:
    radial-gradient(circle at 76% 18%, rgba(215, 25, 32, 0.18), transparent 26%),
    linear-gradient(145deg, #ffffff, #e7f2ff);
  box-shadow: var(--sombra);
}

.sticker-previo img {
  width: min(84%, 280px);
  max-height: 285px;
  object-fit: contain;
  filter: drop-shadow(0 20px 24px rgba(16, 47, 83, 0.16));
}

.tarjeta-presentacion {
  padding: 18px;
  display: grid;
  gap: 10px;
}

.icono-juego {
  width: 48px;
  height: 48px;
  border-radius: 16px;
  display: grid;
  place-items: center;
  color: #fff;
  background: var(--rojo);
}

.icono-juego svg {
  width: 24px;
  height: 24px;
  fill: currentColor;
}

.tarjeta-presentacion h2 {
  margin: 0;
  font-size: 1.25rem;
}

.tarjeta-presentacion p {
  margin: 0 0 6px;
  color: var(--texto-suave);
  line-height: 1.45;
}
</style>
