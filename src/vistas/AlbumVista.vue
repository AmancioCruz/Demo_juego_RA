<script setup>
import { useAlbumStore } from '@/stores/album'
import TarjetaSticker from '@/componentes/album/TarjetaSticker.vue'

const album = useAlbumStore()
</script>

<template>
  <div class="contenedor-vista album-vista">
    <header class="encabezado-vista">
      <p class="etiqueta">Album demo</p>
      <h1>Sticker disponible</h1>
      <p>Por ahora la experiencia se centra en el sticker del lapiz y su minijuego AR.</p>
    </header>

    <section class="resumen-album">
      <div class="icono-resumen">
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path
            d="M5 4.5h14A1.5 1.5 0 0 1 20.5 6v12A1.5 1.5 0 0 1 19 19.5H5A1.5 1.5 0 0 1 3.5 18V6A1.5 1.5 0 0 1 5 4.5Zm2.5 3v4h4v-4zm6 0v4h4v-4zm-6 6v3h10v-3z"
          />
        </svg>
      </div>
      <div>
        <strong>{{ album.cantidadDesbloqueados }}/{{ album.stickers.length }}</strong>
        <p>Sticker desbloqueado</p>
        <div class="barra-progreso">
          <span :style="{ width: `${album.porcentajeCompletado}%` }"></span>
        </div>
      </div>
    </section>

    <section class="lista-stickers">
      <TarjetaSticker v-for="sticker in album.stickers" :key="sticker.id" :sticker="sticker" />
    </section>
  </div>
</template>

<style scoped>
.album-vista {
  display: grid;
  gap: 16px;
}

.resumen-album {
  padding: 16px;
  border-radius: 22px;
  display: grid;
  grid-template-columns: auto 1fr;
  gap: 14px;
  align-items: center;
  color: #fff;
  background: var(--azul);
  box-shadow: var(--sombra);
}

.icono-resumen {
  width: 58px;
  height: 58px;
  border-radius: 18px;
  display: grid;
  place-items: center;
  background: rgba(255, 255, 255, 0.14);
}

.icono-resumen svg {
  width: 30px;
  height: 30px;
  fill: currentColor;
}

.resumen-album strong {
  display: block;
  margin-bottom: 2px;
  font-size: 1.35rem;
}

.resumen-album p {
  margin-bottom: 10px;
  color: rgba(255, 255, 255, 0.82);
  font-size: 0.88rem;
  font-weight: 800;
}

.lista-stickers {
  display: grid;
  gap: 14px;
}
</style>
