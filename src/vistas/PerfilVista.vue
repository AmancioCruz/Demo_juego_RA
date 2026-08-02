<script setup>
import { useAlbumStore } from '@/stores/album'
import TarjetaApp from '@/componentes/interfaz/TarjetaApp.vue'

const album = useAlbumStore()
</script>

<template>
  <div class="contenedor-vista perfil-vista">
    <header class="perfil-encabezado">
      <div class="foto-perfil">{{ album.usuario.foto }}</div>
      <div>
        <p class="etiqueta">Perfil</p>
        <h1>{{ album.usuario.nombre }}</h1>
        <p>Explorador AR</p>
      </div>
    </header>

    <TarjetaApp class="tarjeta-datos">
      <div class="fila-dato">
        <span>Progreso de la demo</span>
        <strong>{{ album.porcentajeCompletado }}%</strong>
      </div>
      <div class="barra-progreso">
        <span :style="{ width: `${album.porcentajeCompletado}%` }"></span>
      </div>
    </TarjetaApp>

    <section class="estadisticas">
      <TarjetaApp class="estadistica">
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path
            d="M5 4h14a1 1 0 0 1 1 1v14a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1Zm2 3v10h10V7zm2 2h6v6H9z"
          />
        </svg>
        <strong>{{ album.cantidadDesbloqueados }}</strong>
        <p>Sticker</p>
      </TarjetaApp>
      <TarjetaApp class="estadistica">
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M8 5v14l11-7z" />
        </svg>
        <strong>{{ album.cantidadDesbloqueados }}</strong>
        <p>Juego AR</p>
      </TarjetaApp>
    </section>
  </div>
</template>

<style scoped>
.perfil-vista {
  display: grid;
  gap: 16px;
}

.perfil-encabezado {
  padding-top: 8px;
  display: flex;
  align-items: center;
  gap: 14px;
}

.foto-perfil {
  width: 86px;
  height: 86px;
  border-radius: 26px;
  display: grid;
  place-items: center;
  color: #fff;
  background:
    radial-gradient(circle at 76% 20%, rgba(215, 25, 32, 0.76), transparent 32%), var(--azul);
  font-size: 2rem;
  font-weight: 900;
  box-shadow: var(--sombra);
}

.perfil-encabezado h1 {
  margin-bottom: 4px;
  font-size: 1.8rem;
}

.perfil-encabezado p:not(.etiqueta) {
  margin: 0;
  color: var(--texto-suave);
}

.tarjeta-datos {
  padding: 18px;
}

.fila-dato {
  margin-bottom: 14px;
  display: flex;
  justify-content: space-between;
  gap: 12px;
}

.fila-dato span {
  color: var(--texto-suave);
  font-weight: 800;
}

.fila-dato strong {
  color: var(--rojo);
  font-size: 1.25rem;
}

.estadisticas {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 12px;
}

.estadistica {
  padding: 18px;
  text-align: center;
}

.estadistica svg {
  width: 44px;
  height: 44px;
  margin: 0 auto 10px;
  padding: 11px;
  border-radius: 15px;
  display: block;
  color: var(--azul);
  background: var(--azul-claro);
  fill: currentColor;
}

.estadistica strong {
  display: block;
  color: var(--texto);
  font-size: 1.6rem;
}

.estadistica p {
  margin: 2px 0 0;
  color: var(--texto-suave);
  font-size: 0.8rem;
  font-weight: 800;
}
</style>
