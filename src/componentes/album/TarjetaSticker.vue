<script setup>
import TarjetaApp from '@/componentes/interfaz/TarjetaApp.vue'

defineProps({
  sticker: { type: Object, required: true },
})
</script>

<template>
  <TarjetaApp
    class="tarjeta-sticker"
    :class="{ 'tarjeta-sticker--bloqueada': !sticker.desbloqueado }"
  >
    <div class="foto-sticker" :style="{ background: sticker.color }">
      <img
        v-if="sticker.desbloqueado && sticker.imagen"
        :src="sticker.imagen"
        :alt="`Sticker ${sticker.nombre}`"
      />
      <span v-else>{{ sticker.desbloqueado ? sticker.icono : '?' }}</span>
    </div>

    <div class="info-sticker">
      <p class="etiqueta">Sticker {{ sticker.id }}</p>
      <h2>{{ sticker.desbloqueado ? sticker.nombre : 'Bloqueado' }}</h2>
      <p>{{ sticker.desbloqueado ? sticker.juego.objetivo : 'Escanea para desbloquear' }}</p>

      <div v-if="sticker.desbloqueado" class="acciones-sticker">
        <RouterLink
          class="boton-sticker boton-sticker--azul"
          :to="{ name: 'realidad-aumentada', params: { id: sticker.id } }"
        >
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path
              d="M5 4h14a1 1 0 0 1 1 1v14a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1Zm2 3v10h10V7zm2 2h6v6H9z"
            />
          </svg>
          Ver modelo
        </RouterLink>
        <RouterLink
          class="boton-sticker boton-sticker--rojo"
          :to="{ name: 'juego', params: { id: sticker.id } }"
        >
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M8 5v14l11-7z" />
          </svg>
          Colocar AR
        </RouterLink>
      </div>
    </div>
  </TarjetaApp>
</template>

<style scoped>
.tarjeta-sticker {
  padding: 14px;
  display: grid;
  gap: 14px;
}

.foto-sticker {
  min-height: 260px;
  border-radius: 24px;
  display: grid;
  place-items: center;
  overflow: hidden;
}

.foto-sticker span {
  color: var(--azul);
  font-size: 2rem;
  font-weight: 900;
}

.foto-sticker img {
  width: min(82%, 260px);
  max-height: 240px;
  object-fit: contain;
  filter: drop-shadow(0 18px 20px rgba(16, 47, 83, 0.16));
}

.info-sticker {
  min-width: 0;
}

.info-sticker h2 {
  margin-bottom: 4px;
  font-size: 1.35rem;
}

.info-sticker > p:not(.etiqueta) {
  margin-bottom: 14px;
  color: var(--texto-suave);
  font-size: 0.9rem;
  line-height: 1.35;
}

.acciones-sticker {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
}

.boton-sticker {
  min-height: 48px;
  border-radius: 14px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  color: #fff;
  font-size: 0.88rem;
  font-weight: 900;
}

.boton-sticker svg {
  width: 20px;
  height: 20px;
  fill: currentColor;
}

.boton-sticker--azul {
  background: var(--azul);
}

.boton-sticker--rojo {
  background: var(--rojo);
}

.tarjeta-sticker--bloqueada {
  opacity: 0.72;
}

.tarjeta-sticker--bloqueada .foto-sticker {
  background: #e5edf5 !important;
}
</style>
